import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

interface UserDetailRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: string;
  last_login_at: Date | string | null;
  created_at: Date | string;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);

    if (!authUser) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<UserDetailRow[]>(
        "SELECT id, name, email, role, last_login_at, created_at FROM users WHERE id = ? AND is_active = TRUE",
        [authUser.id]
      );

      if (rows.length === 0) {
        return Response.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      const user = rows[0];

      return Response.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch user";
    return Response.json({ error: message }, { status: 500 });
  }
}
