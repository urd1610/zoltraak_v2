import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";

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

// ── PDF extraction ──
async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v1 exports a function directly
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
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
  return sorted.map(([name, xml], i) => `--- スライド ${i + 1} ---\n${stripXmlTags(xml)}`).join("\n\n");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "path パラメータが必要です" }, { status: 400 });
    }

    // Security: only allow reading from /Volumes/ (mounted SMB shares)
    if (!filePath.startsWith("/Volumes/")) {
      return NextResponse.json({ error: "許可されていないパスです" }, { status: 403 });
    }

    // Prevent path traversal
    if (filePath.includes("..")) {
      return NextResponse.json({ error: "不正なパスです" }, { status: 400 });
    }

    const fileStat = await stat(filePath);

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

    const buffer = await readFile(filePath);
    let content: string;
    let format: string;

    if (ext === "pdf") {
      content = await extractPdf(buffer);
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
      file_name: filePath.split("/").pop(),
      extension: ext,
      format,
      size: fileStat.size,
      content,
      truncated,
    });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "ファイルの読み取りに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
