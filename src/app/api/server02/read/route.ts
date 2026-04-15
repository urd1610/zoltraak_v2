import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";

const MAX_FILE_SIZE = 512 * 1024; // 512KB

const TEXT_EXTENSIONS = new Set([
  "txt", "csv", "tsv", "log", "md", "json", "xml", "yaml", "yml",
  "html", "htm", "css", "js", "ts", "tsx", "jsx", "py", "java",
  "c", "cpp", "h", "cs", "rb", "go", "rs", "sql", "sh", "bat",
  "ps1", "ini", "cfg", "conf", "env", "toml", "properties",
  "tex", "rtf", "svg",
]);

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

    if (!TEXT_EXTENSIONS.has(ext)) {
      return NextResponse.json({
        error: `テキスト形式ではないファイルです (.${ext})`,
        supported_extensions: [...TEXT_EXTENSIONS].sort(),
      }, { status: 415 });
    }

    const content = await readFile(filePath, "utf-8");

    return NextResponse.json({
      path: filePath,
      file_name: filePath.split("/").pop(),
      extension: ext,
      size: fileStat.size,
      content,
    });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "ファイルの読み取りに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
