import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { readdir, stat } from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const SMB_HOST = "192.168.0.153";
const SHARES = [
  { name: "①　全社", mountPath: "/Volumes/①　全社" },
  { name: "②　掲示板", mountPath: "/Volumes/②　掲示板" },
  { name: "③　生産グループ", mountPath: "/Volumes/③　生産グループ" },
  { name: "④　技術グループ", mountPath: "/Volumes/④　技術グループ" },
  { name: "⑤　品質グループ", mountPath: "/Volumes/⑤　品質グループ" },
  { name: "⑥　生産管理グループ", mountPath: "/Volumes/⑥　生産管理グループ" },
  { name: "⑧　情報グループ", mountPath: "/Volumes/⑧　情報グループ" },
  { name: "スキャナ文書", mountPath: "/Volumes/スキャナ文書" },
];

const SCAN_CONCURRENCY = 8;

// ── インメモリ進捗ストア（プロセス内で共有） ──
interface ScanProgress {
  scanId: number;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  completedAt: string | null;
  totalShares: number;
  completedShares: number;
  currentShare: string;
  currentPhase: string;
  message: string;
  shareResults: string[];
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
}

let activeScan: ScanProgress | null = null;
let cancelRequested = false;

async function mountShare(shareName: string): Promise<boolean> {
  const mountPath = `/Volumes/${shareName}`;
  try {
    await readdir(mountPath);
    return true;
  } catch {
    try {
      const smbUrl = `smb://guest@${SMB_HOST}/${shareName}`;
      execSync(`osascript -e 'mount volume "${smbUrl}"'`, { timeout: 30000 });
      await stat(mountPath);
      return true;
    } catch {
      return false;
    }
  }
}

interface FileRecord {
  share_name: string;
  file_path: string;
  file_name: string;
  extension: string | null;
  file_size: number;
  modified_at: Date | null;
  is_directory: boolean;
  depth: number;
  parent_path: string;
}

async function scanShareFast(
  rootPath: string,
  shareName: string,
  maxDepth: number,
): Promise<FileRecord[]> {
  const results: FileRecord[] = [];
  const queue: [string, number][] = [[rootPath, 0]];

  while (queue.length > 0) {
    if (cancelRequested) break;
    const [dirPath, depth] = queue.shift()!;
    if (depth > maxDepth) continue;

    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      continue;
    }

    const visible = entries.filter((e) => !e.name.startsWith("."));

    for (let i = 0; i < visible.length; i += SCAN_CONCURRENCY) {
      const chunk = visible.slice(i, i + SCAN_CONCURRENCY);
      const settled = await Promise.allSettled(
        chunk.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          const isDir = entry.isDirectory();
          const s = await stat(fullPath);
          return { entry, fullPath, isDir, size: s.size, mtime: s.mtime };
        }),
      );

      for (const r of settled) {
        if (r.status !== "fulfilled") continue;
        const { entry, fullPath, isDir, size, mtime } = r.value;
        const ext = isDir
          ? null
          : path.extname(entry.name).replace(".", "").toLowerCase() || null;

        results.push({
          share_name: shareName,
          file_path: fullPath,
          file_name: entry.name,
          extension: ext,
          file_size: size,
          modified_at: mtime,
          is_directory: isDir,
          depth,
          parent_path: dirPath,
        });

        if (isDir) {
          queue.push([fullPath, depth + 1]);
        }
      }
    }
  }

  return results;
}

async function bulkInsert(
  connection: any,
  files: FileRecord[],
  batchSize = 500,
) {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const placeholders = batch
      .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .join(",");
    const values = batch.flatMap((f) => [
      f.share_name,
      f.file_path,
      f.file_name,
      f.extension,
      f.file_size,
      f.modified_at,
      f.is_directory ? 1 : 0,
      f.depth,
      f.parent_path,
    ]);
    await connection.execute(
      `INSERT INTO server02_files (share_name, file_path, file_name, extension, file_size, modified_at, is_directory, depth, parent_path) VALUES ${placeholders}`,
      values,
    );
  }
}

/**
 * バックグラウンドでスキャンを実行
 * ページ遷移しても中断されない
 */
async function runScanInBackground(
  sharesToScan: typeof SHARES,
  targetShare: string | null,
  maxDepth: number,
) {
  const connection = await pool.getConnection();
  try {
    const [logResult] = await connection.execute<any>(
      "INSERT INTO server02_scan_logs (share_name, status) VALUES (?, 'running')",
      [targetShare],
    );
    const scanId = logResult.insertId;

    activeScan = {
      scanId,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      totalShares: sharesToScan.length,
      completedShares: 0,
      currentShare: "",
      currentPhase: "mount-all",
      message: `${sharesToScan.length} 個の共有フォルダを並列マウント中...`,
      shareResults: [],
      totalFiles: 0,
      totalDirectories: 0,
      totalSize: 0,
    };

    // Phase 1: 並列マウント
    const mountResults = await Promise.allSettled(
      sharesToScan.map(async (share) => {
        const ok = await mountShare(share.name);
        return { share, ok };
      }),
    );

    const mountedShares: typeof SHARES = [];
    for (const r of mountResults) {
      if (r.status === "fulfilled" && r.value.ok) {
        mountedShares.push(r.value.share);
      } else {
        const name =
          r.status === "fulfilled" ? r.value.share.name : "unknown";
        activeScan.shareResults.push(`${name} — マウント失敗、スキップ`);
      }
    }

    activeScan.totalShares = mountedShares.length;
    activeScan.currentPhase = "scanning";
    activeScan.message = `${mountedShares.length} 共有フォルダをマウント完了、スキャン開始`;

    // Phase 2: 各共有を順次スキャン
    for (let idx = 0; idx < mountedShares.length; idx++) {
      if (cancelRequested) break;

      const share = mountedShares[idx];

      activeScan.completedShares = idx;
      activeScan.currentShare = share.name;
      activeScan.currentPhase = "scanning";
      activeScan.message = `${share.name} をスキャン中...`;

      await connection.execute(
        "DELETE FROM server02_files WHERE share_name = ?",
        [share.name],
      );

      const files = await scanShareFast(share.mountPath, share.name, maxDepth);

      if (cancelRequested) break;

      activeScan.currentPhase = "indexing";
      activeScan.message = `${share.name} — ${files.length} 件をDB登録中...`;

      await bulkInsert(connection, files);

      const fileCount = files.filter((f) => !f.is_directory).length;
      const dirCount = files.filter((f) => f.is_directory).length;
      const sizeSum = files.reduce((s, f) => s + f.file_size, 0);
      activeScan.totalFiles += fileCount;
      activeScan.totalDirectories += dirCount;
      activeScan.totalSize += sizeSum;

      activeScan.shareResults.push(
        `${share.name} 完了 — ${fileCount} ファイル, ${dirCount} フォルダ`,
      );
    }

    // キャンセルされた場合
    if (cancelRequested) {
      await connection.execute(
        "UPDATE server02_scan_logs SET status = 'failed', error_message = '手動停止', total_files = ?, total_directories = ?, total_size = ?, completed_at = NOW() WHERE id = ?",
        [activeScan.totalFiles, activeScan.totalDirectories, activeScan.totalSize, scanId],
      );

      activeScan.status = "stopped";
      activeScan.completedAt = new Date().toISOString();
      activeScan.currentPhase = "stopped";
      activeScan.message = `スキャンを停止しました — ${activeScan.totalFiles} ファイル, ${activeScan.totalDirectories} フォルダ (途中まで)`;

      cancelRequested = false;

      setTimeout(() => {
        if (activeScan?.scanId === scanId) activeScan = null;
      }, 10000);
      return;
    }

    await connection.execute(
      "UPDATE server02_scan_logs SET status = 'completed', total_files = ?, total_directories = ?, total_size = ?, completed_at = NOW() WHERE id = ?",
      [activeScan.totalFiles, activeScan.totalDirectories, activeScan.totalSize, scanId],
    );

    activeScan.status = "completed";
    activeScan.completedShares = mountedShares.length;
    activeScan.completedAt = new Date().toISOString();
    activeScan.currentPhase = "complete";
    activeScan.message = `全スキャン完了 — ${activeScan.totalFiles} ファイル, ${activeScan.totalDirectories} フォルダ`;

    // 完了後30秒で進捗データをクリア
    setTimeout(() => {
      if (activeScan?.scanId === scanId) {
        activeScan = null;
      }
    }, 30000);
  } catch (error: any) {
    if (activeScan) {
      activeScan.status = "failed";
      activeScan.currentPhase = "error";
      activeScan.message =
        error instanceof Error
          ? error.message
          : "スキャン中にエラーが発生しました";

      setTimeout(() => {
        activeScan = null;
      }, 30000);
    }
  } finally {
    connection.release();
  }
}

// ──────────────────────────────────────────
// POST — スキャン開始（バックグラウンド実行）
// ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 既にスキャン中なら拒否
  if (activeScan && activeScan.status === "running") {
    return NextResponse.json(
      { error: "スキャンが既に実行中です", progress: activeScan },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const targetShare = body.share || null;
  const maxDepth = body.maxDepth || 10;

  const sharesToScan = targetShare
    ? SHARES.filter((s) => s.name === targetShare)
    : SHARES;

  // バックグラウンドで実行（awaitしない）
  runScanInBackground(sharesToScan, targetShare, maxDepth);

  return NextResponse.json({ status: "started", message: "スキャンを開始しました" });
}

// ──────────────────────────────────────────
// DELETE — スキャン停止
// ──────────────────────────────────────────
export async function DELETE() {
  if (!activeScan || activeScan.status !== "running") {
    return NextResponse.json({ error: "実行中のスキャンはありません" }, { status: 404 });
  }

  cancelRequested = true;
  return NextResponse.json({ status: "stopping", message: "スキャンの停止をリクエストしました" });
}

// ──────────────────────────────────────────
// GET — 統計情報 + スキャン進捗
// ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const progressOnly = url.searchParams.get("progress");

    // ?progress=1 のときは進捗だけ返す（軽量ポーリング用）
    if (progressOnly) {
      return NextResponse.json({ progress: activeScan });
    }

    const connection = await pool.getConnection();
    try {
      const [logs] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM server02_scan_logs ORDER BY started_at DESC LIMIT 5",
      );
      const [stats] = await connection.execute<RowDataPacket[]>(
        `SELECT share_name,
                COUNT(*) as total_entries,
                SUM(CASE WHEN is_directory = 0 THEN 1 ELSE 0 END) as file_count,
                SUM(CASE WHEN is_directory = 1 THEN 1 ELSE 0 END) as dir_count,
                SUM(file_size) as total_size,
                MAX(indexed_at) as last_indexed
         FROM server02_files
         GROUP BY share_name`,
      );
      const [totalRows] = await connection.execute<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM server02_files",
      );
      const [extensions] = await connection.execute<RowDataPacket[]>(
        `SELECT extension, COUNT(*) as count
         FROM server02_files
         WHERE is_directory = 0 AND extension IS NOT NULL
         GROUP BY extension
         ORDER BY count DESC
         LIMIT 20`,
      );

      return NextResponse.json({
        recentScans: logs,
        shareStats: stats,
        totalIndexed: totalRows[0].total,
        topExtensions: extensions,
        progress: activeScan,
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Failed to get scan stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
