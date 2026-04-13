import { NextRequest } from "next/server";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  is_active: number | boolean;
  last_login_at: Date | string | null;
  created_at: Date | string;
}

async function requireAdmin(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return { user: null, response: Response.json({ error: "認証が必要です" }, { status: 401 }) };
  }
  if (user.role !== "admin") {
    return { user: null, response: Response.json({ error: "管理者権限が必要です" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAdmin(req);
    if (!user) return response!;

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<UserRow[]>(
        "SELECT id, name, email, role, is_active, last_login_at, created_at FROM users ORDER BY created_at DESC"
      );

      const users = rows.map((row) => ({
        ...row,
        is_active: !!row.is_active,
      }));

      return Response.json({ users });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAdmin(req);
    if (!user) return response!;

    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return Response.json({ error: "name, email, password, role は必須です" }, { status: 400 });
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [name, email, password_hash, role]
      );

      const newId = result.insertId;

      return Response.json(
        { user: { id: newId, name, email, role } },
        { status: 201 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException & { code: string }).code === "ER_DUP_ENTRY"
    ) {
      return Response.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create user";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user: authUser, response } = await requireAdmin(req);
    if (!authUser) return response!;

    const body = await req.json();
    const { id, name, email, role, is_active, password } = body;

    if (!id) {
      return Response.json({ error: "id は必須です" }, { status: 400 });
    }

    // Prevent admin from changing their own role
    if (role !== undefined && authUser.id === id) {
      return Response.json(
        { error: "自分自身のロールは変更できません" },
        { status: 400 }
      );
    }

    const allowedFields: Record<string, unknown> = {};
    if (name !== undefined) allowedFields.name = name;
    if (email !== undefined) allowedFields.email = email;
    if (role !== undefined) allowedFields.role = role;
    if (is_active !== undefined) allowedFields.is_active = is_active ? 1 : 0;
    if (password !== undefined) allowedFields.password_hash = bcrypt.hashSync(password, 10);

    if (Object.keys(allowedFields).length === 0) {
      return Response.json({ error: "更新するフィールドがありません" }, { status: 400 });
    }

    const setClause = Object.keys(allowedFields)
      .map((field) => `${field} = ?`)
      .join(", ");
    const values = [...Object.values(allowedFields), id];

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE users SET ${setClause} WHERE id = ?`,
        values
      );

      return Response.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user: authUser, response } = await requireAdmin(req);
    if (!authUser) return response!;

    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id は必須です" }, { status: 400 });
    }

    const userId = parseInt(id, 10);

    if (authUser.id === userId) {
      return Response.json({ error: "自分自身は削除できません" }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute<ResultSetHeader>(
        "DELETE FROM users WHERE id = ?",
        [userId]
      );

      return Response.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return Response.json({ error: message }, { status: 500 });
  }
}
