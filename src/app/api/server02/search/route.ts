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
        // file_path includes file_name, so searching file_path alone covers both
        where += " AND file_path LIKE ?";
        params.push(`%${kw}%`);
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
      // Fetch limit+1 rows to detect if more results exist, avoiding a slow COUNT(*) query
      const fetchLimit = limit + 1;
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, share_name, file_path, file_name, extension, file_size, modified_at, is_directory, depth
         FROM server02_files ${where}
         ORDER BY is_directory DESC, modified_at DESC
         LIMIT ? OFFSET ?`,
        [...params, fetchLimit, offset]
      );

      const hasMore = rows.length > limit;
      const files = hasMore ? rows.slice(0, limit) : rows;
      // Provide an approximate total: exact count is too expensive for LIKE queries
      const total = hasMore ? offset + limit + 1 : offset + files.length;

      return NextResponse.json({ files, total, page, limit, hasMore });
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to search files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
