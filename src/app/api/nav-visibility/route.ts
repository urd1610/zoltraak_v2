import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

interface NavVisibilityRow extends RowDataPacket {
  nav_href: string;
  admin_only: number | boolean;
  is_hidden: number | boolean;
}

export async function GET() {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<NavVisibilityRow[]>(
        "SELECT nav_href, admin_only, is_hidden FROM nav_visibility_settings"
      );

      const settings = rows.map((row) => ({
        nav_href: row.nav_href,
        admin_only: !!row.admin_only,
        is_hidden: !!row.is_hidden,
      }));

      return Response.json({ settings });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch nav visibility settings";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req);

    if (!user) {
      return Response.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (user.role === "viewer") {
      return Response.json({ error: "編集権限が必要です" }, { status: 403 });
    }

    const body = await req.json();
    const { nav_href, admin_only, is_hidden } = body as {
      nav_href: string;
      admin_only?: boolean;
      is_hidden?: boolean;
    };

    if (!nav_href) {
      return Response.json({ error: "nav_href is required" }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO nav_visibility_settings (nav_href, admin_only, is_hidden, updated_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           admin_only = IF(? IS NULL, admin_only, ?),
           is_hidden  = IF(? IS NULL, is_hidden,  ?),
           updated_by = ?`,
        [
          nav_href,
          admin_only ?? false,
          is_hidden ?? false,
          user.id,
          // ON DUPLICATE KEY UPDATE values
          admin_only ?? null,
          admin_only ?? null,
          is_hidden ?? null,
          is_hidden ?? null,
          user.id,
        ]
      );

      return Response.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update nav visibility settings";
    return Response.json({ error: message }, { status: 500 });
  }
}
