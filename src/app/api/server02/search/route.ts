import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const share = url.searchParams.get("share") || "";
    const ext = url.searchParams.get("ext") || "";
    const type = url.searchParams.get("type") || ""; // "file" or "directory"
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let where = "WHERE 1=1";
    const params: (string | number)[] = [];

    if (query) {
      const keywords = query.split(/\s+/).filter(Boolean);
      for (const kw of keywords) {
        where += " AND (file_name LIKE ? OR file_path LIKE ?)";
        params.push(`%${kw}%`, `%${kw}%`);
      }
    }
    if (share) {
      where += " AND share_name = ?";
      params.push(share);
    }
    if (ext) {
      where += " AND extension = ?";
      params.push(ext);
    }
    if (type === "file") {
      where += " AND is_directory = 0";
    } else if (type === "directory") {
      where += " AND is_directory = 1";
    }

    const connection = await pool.getConnection();
    try {
      // Set MySQL query timeout to 15 seconds to prevent slow LIKE queries from hanging
      await connection.execute("SET SESSION max_execution_time = 15000");

      const [countRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM server02_files ${where}`,
        params
      );
      const total = countRows[0].total;

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, share_name, file_path, file_name, extension, file_size, modified_at, is_directory, depth
         FROM server02_files ${where}
         ORDER BY is_directory DESC, modified_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return NextResponse.json({ files: rows, total, page, limit });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Failed to search files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
