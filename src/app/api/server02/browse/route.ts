import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";
import {
  buildServer02FilePath,
  inferServer02FilePathStyle,
  parseServer02Path,
} from "@/lib/server02-paths";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parentPath = url.searchParams.get("path") || "";
    const share = url.searchParams.get("share") || "";

    const connection = await pool.getConnection();
    try {
      if (!share) {
        // Return list of shares with counts
        const [shares] = await connection.execute<RowDataPacket[]>(
          `SELECT share_name,
                  COUNT(*) as total_entries,
                  SUM(CASE WHEN is_directory = 0 THEN 1 ELSE 0 END) as file_count,
                  SUM(CASE WHEN is_directory = 1 THEN 1 ELSE 0 END) as dir_count,
                  SUM(file_size) as total_size
           FROM server02_files
           GROUP BY share_name
           ORDER BY share_name`
        );
        return NextResponse.json({ shares });
      }

      let where = "WHERE share_name = ?";
      const params: (string | number)[] = [share];

      if (parentPath) {
        where += " AND parent_path = ?";
        params.push(parentPath);
      } else {
        where += " AND depth = 0";
      }

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, share_name, file_path, file_name, extension, file_size, modified_at, is_directory, depth
         FROM server02_files ${where}
         ORDER BY is_directory DESC, file_name ASC`,
        params
      );

      // Get breadcrumb path
      let breadcrumbs: { name: string; path: string }[] = [];
      if (parentPath) {
        const pathParts = parseServer02Path(parentPath);
        if (pathParts && pathParts.shareName === share) {
          const style = inferServer02FilePathStyle(parentPath);
          const currentSegments: string[] = [];
          breadcrumbs = pathParts.relativeSegments.map((part) => {
            currentSegments.push(part);
            return {
              name: part,
              path: buildServer02FilePath(
                { shareName: pathParts.shareName, relativeSegments: [...currentSegments] },
                style,
              ),
            };
          });
        }
      }

      return NextResponse.json({ files: rows, breadcrumbs });
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to browse files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
