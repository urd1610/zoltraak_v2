import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readFile, stat, readdir } from "fs/promises";
import { execSync } from "child_process";
import {
  ALLOWED_SERVER02_SHARES,
  SMB_HOST,
  getServer02NativeShareRoot,
  hasServer02Traversal,
  parseServer02Path,
  toNativeServer02Path,
} from "@/lib/server02-paths";

/** Ensure the SMB share is mounted before reading a file */
async function ensureMounted(shareName: string): Promise<void> {
  if (process.platform !== "darwin") {
    return;
  }

  const mountPath = getServer02NativeShareRoot(shareName, "darwin");
  if (!mountPath) {
    throw new Error("このOSでは共有フォルダのマウントをサポートしていません");
  }

  try {
    await readdir(mountPath);
    // Already mounted
  } catch {
    // Try to mount
    try {
      const smbUrl = `smb://guest@${SMB_HOST}/${shareName}`;
      execSync(`osascript -e 'mount volume "${smbUrl}"'`, { timeout: 30000 });
      await stat(mountPath);
    } catch {
      throw new Error(`共有フォルダ「${shareName}」のマウントに失敗しました`);
    }
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const TEXT_EXTENSIONS = new Set([
  "txt", "csv", "tsv", "log", "md", "json", "xml", "yaml", "yml",
  "html", "htm", "css", "js", "ts", "tsx", "jsx", "py", "java",
  "c", "cpp", "h", "cs", "rb", "go", "rs", "sql", "sh", "bat",
  "ps1", "ini", "cfg", "conf", "env", "toml", "properties",
  "tex", "rtf", "svg",
]);

const BINARY_EXTENSIONS = new Set([
  "pdf",
  "xlsx", "xls",
  "doc", "docx",
  "ppt", "pptx",
]);

const ALL_SUPPORTED = new Set([...TEXT_EXTENSIONS, ...BINARY_EXTENSIONS]);

function isErrnoException(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

// ── PDF extraction ──
async function extractPdf(buffer: Buffer): Promise<string> {
  // Import the parser directly to avoid pdf-parse's package entry running its debug bootstrap.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
  const result = await pdfParse(buffer);
  return result.text;
}

// ── Excel extraction ──
async function extractExcel(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    parts.push(`=== シート: ${sheetName} ===`);

    // Convert to array-of-arrays for readable output
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    for (const row of rows) {
      const line = row.map((cell) => String(cell ?? "")).join("\t");
      if (line.trim()) parts.push(line);
    }
    parts.push("");
  }

  return parts.join("\n");
}

// ── Word/PowerPoint (docx/pptx) extraction via ZIP ──
// These are ZIP archives containing XML. We use Node's built-in zlib to decompress.
async function extractFromZip(buffer: Buffer, xmlPaths: RegExp): Promise<Map<string, string>> {
  const AdmZip = (await import("adm-zip")).default;
  const results = new Map<string, string>();
  try {
    const zip = new AdmZip(buffer);
    for (const entry of zip.getEntries()) {
      if (xmlPaths.test(entry.entryName)) {
        const data = entry.getData();
        results.set(entry.entryName, data.toString("utf-8"));
      }
    }
  } catch {
    // if adm-zip fails, return empty
  }
  return results;
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<w:p[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<a:p[^>]*\/>/g, "\n")
    .replace(/<\/a:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const entries = await extractFromZip(buffer, /^word\/document\.xml$/);
  const xml = entries.get("word/document.xml");
  if (xml) return stripXmlTags(xml);
  return "(Word文書のテキスト抽出に失敗しました)";
}

async function extractPptx(buffer: Buffer): Promise<string> {
  const entries = await extractFromZip(buffer, /^ppt\/slides\/slide\d+\.xml$/);
  const sorted = [...entries.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length === 0) return "(PowerPointのテキスト抽出に失敗しました)";
  return sorted.map(([, xml], i) => `--- スライド ${i + 1} ---\n${stripXmlTags(xml)}`).join("\n\n");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path");

    if (!rawPath) {
      return NextResponse.json({ error: "path パラメータが必要です" }, { status: 400 });
    }

    const pathParts = parseServer02Path(rawPath);
    if (!pathParts) {
      return NextResponse.json({ error: "許可されていないパスです" }, { status: 403 });
    }

    if (!ALLOWED_SERVER02_SHARES.has(pathParts.shareName)) {
      return NextResponse.json({ error: "指定された共有フォルダは許可対象外です" }, { status: 403 });
    }

    // Prevent path traversal
    if (hasServer02Traversal(pathParts)) {
      return NextResponse.json({ error: "不正なパスです" }, { status: 400 });
    }

    const filePath = toNativeServer02Path(rawPath);
    if (!filePath) {
      return NextResponse.json(
        { error: "このOSでは server02 のファイル読み取りをサポートしていません" },
        { status: 501 },
      );
    }

    // Ensure the SMB share is mounted
    await ensureMounted(pathParts.shareName);

    let fileStat: Awaited<ReturnType<typeof stat>>;
    try {
      fileStat = await stat(filePath);
    } catch (error: unknown) {
      if (isErrnoException(error, "ENOENT")) {
        return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
      }
      throw error;
    }

    if (fileStat.isDirectory()) {
      return NextResponse.json({ error: "ディレクトリは読み取れません" }, { status: 400 });
    }

    if (fileStat.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `ファイルサイズが大きすぎます (${Math.round(fileStat.size / 1024)}KB > ${MAX_FILE_SIZE / 1024}KB)`,
        file_size: fileStat.size,
      }, { status: 413 });
    }

    const ext = filePath.split(".").pop()?.toLowerCase() || "";

    if (!ALL_SUPPORTED.has(ext)) {
      return NextResponse.json({
        error: `非対応のファイル形式です (.${ext})`,
        supported_extensions: [...ALL_SUPPORTED].sort(),
      }, { status: 415 });
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch (error: unknown) {
      if (isErrnoException(error, "ENOENT")) {
        return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
      }
      throw error;
    }

    let content: string;
    let format: string;

    if (ext === "pdf") {
      try {
        content = await extractPdf(buffer);
      } catch {
        throw new Error("PDF の読み取りに失敗しました");
      }
      format = "pdf-text";
    } else if (ext === "xlsx" || ext === "xls") {
      content = await extractExcel(buffer);
      format = "excel-text";
    } else if (ext === "docx" || ext === "doc") {
      content = await extractDocx(buffer);
      format = "word-text";
    } else if (ext === "ppt" || ext === "pptx") {
      content = await extractPptx(buffer);
      format = "pptx-text";
    } else {
      // Text files
      content = buffer.toString("utf-8");
      format = "text";
    }

    // Truncate very long content to avoid overwhelming the AI context
    const MAX_CONTENT_LENGTH = 50000;
    const truncated = content.length > MAX_CONTENT_LENGTH;
    if (truncated) {
      content = content.slice(0, MAX_CONTENT_LENGTH) + "\n\n... (以降省略 — 全" + content.length.toLocaleString() + "文字)";
    }

    return NextResponse.json({
      path: filePath,
      file_name: path.basename(filePath),
      extension: ext,
      format,
      size: fileStat.size,
      content,
      truncated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "ファイルの読み取りに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
