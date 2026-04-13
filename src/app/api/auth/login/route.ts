import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { signToken } from "@/lib/auth";

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: number | boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<UserRow[]>(
        "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        return Response.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const user = rows[0];

      if (!user.is_active) {
        return Response.json(
          { error: "Account is inactive" },
          { status: 401 }
        );
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return Response.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      await connection.execute(
        "UPDATE users SET last_login_at = NOW() WHERE id = ?",
        [user.id]
      );

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return Response.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
