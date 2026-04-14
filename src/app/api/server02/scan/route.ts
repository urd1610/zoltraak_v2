import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import { readdir, stat } from "fs/promises";
import path from "path";

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

async function mountShare(shareName: string): Promise<boolean> {
  const { execSync } = require("child_process");
  const mountPath = `/Volumes/${shareName}`;
  try {
    // Check if already mounted by reading contents
    const entries = await readdir(mountPath);
    if (entries.length >= 0) return true;
  } catch {
    // Not mounted — try to mount via AppleScript (no root required)
    try {
      const smbUrl = `smb://guest@${SMB_HOST}/${shareName}`;
      execSync(`osascript -e 'mount volume "${smbUrl}"'`, { timeout: 30000 });
      // Verify mount succeeded
      await stat(mountPath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function scanDirectory(
  dirPath: string,
  shareName: string,
  depth: number,
  files: Array<{
    share_name: string;
    file_path: string;
    file_name: string;
    extension: string | null;
    file_size: number;
    modified_at: Date | null;
    is_directory: boolean;
    depth: number;
    parent_path: string;
  }>,
  maxDepth: number = 10
): Promise<void> {
  if (depth > maxDepth) return;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue; // skip hidden files

      const fullPath = path.join(dirPath, entry.name);
      const isDir = entry.isDirectory();

      let fileSize = 0;
      let modifiedAt: Date | null = null;
      try {
        const stats = await stat(fullPath);
        fileSize = stats.size;
        modifiedAt = stats.mtime;
      } catch {
        // skip inaccessible files
        continue;
      }

      const ext = isDir ? null : path.extname(entry.name).replace(".", "").toLowerCase() || null;

      files.push({
        share_name: shareName,
        file_path: fullPath,
        file_name: entry.name,
        extension: ext,
        file_size: fileSize,
        modified_at: modifiedAt,
        is_directory: isDir,
        depth,
        parent_path: dirPath,
      });

      if (isDir) {
        await scanDirectory(fullPath, shareName, depth + 1, files, maxDepth);
      }
    }
  } catch {
    // permission denied or inaccessible directory
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetShare = body.share || null; // optional: scan specific share only
    const maxDepth = body.maxDepth || 10;

    const connection = await pool.getConnection();
    try {
      // Create scan log
      const [logResult] = await connection.execute<any>(
        "INSERT INTO server02_scan_logs (share_name, status) VALUES (?, 'running')",
        [targetShare]
      );
      const scanId = logResult.insertId;

      const sharesToScan = targetShare
        ? SHARES.filter((s) => s.name === targetShare)
        : SHARES;

      let totalFiles = 0;
      let totalDirs = 0;
      let totalSize = 0;

      for (const share of sharesToScan) {
        const mounted = await mountShare(share.name);
        if (!mounted) continue;

        // Clear existing entries for this share
        await connection.execute("DELETE FROM server02_files WHERE share_name = ?", [share.name]);

        const files: any[] = [];
        await scanDirectory(share.mountPath, share.name, 0, files, maxDepth);

        // Batch insert
        if (files.length > 0) {
          const batchSize = 500;
          for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
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
              values
            );
          }
        }

        const fileCount = files.filter((f) => !f.is_directory).length;
        const dirCount = files.filter((f) => f.is_directory).length;
        const sizeSum = files.reduce((sum, f) => sum + f.file_size, 0);

        totalFiles += fileCount;
        totalDirs += dirCount;
        totalSize += sizeSum;
      }

      // Update scan log
      await connection.execute(
        "UPDATE server02_scan_logs SET status = 'completed', total_files = ?, total_directories = ?, total_size = ?, completed_at = NOW() WHERE id = ?",
        [totalFiles, totalDirs, totalSize, scanId]
      );

      return NextResponse.json({
        scanId,
        status: "completed",
        totalFiles,
        totalDirectories: totalDirs,
        totalSize,
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Failed to scan shares";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: return scan status and stats
export async function GET(req: NextRequest) {
  try {
    const connection = await pool.getConnection();
    try {
      // Get latest scan info
      const [logs] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM server02_scan_logs ORDER BY started_at DESC LIMIT 5"
      );

      // Get stats per share
      const [stats] = await connection.execute<RowDataPacket[]>(
        `SELECT share_name,
                COUNT(*) as total_entries,
                SUM(CASE WHEN is_directory = 0 THEN 1 ELSE 0 END) as file_count,
                SUM(CASE WHEN is_directory = 1 THEN 1 ELSE 0 END) as dir_count,
                SUM(file_size) as total_size,
                MAX(indexed_at) as last_indexed
         FROM server02_files
         GROUP BY share_name`
      );

      // Get total count
      const [totalRows] = await connection.execute<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM server02_files"
      );

      // Get extension distribution (top 20)
      const [extensions] = await connection.execute<RowDataPacket[]>(
        `SELECT extension, COUNT(*) as count
         FROM server02_files
         WHERE is_directory = 0 AND extension IS NOT NULL
         GROUP BY extension
         ORDER BY count DESC
         LIMIT 20`
      );

      return NextResponse.json({
        recentScans: logs,
        shareStats: stats,
        totalIndexed: totalRows[0].total,
        topExtensions: extensions,
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
