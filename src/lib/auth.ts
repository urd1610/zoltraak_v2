import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

export type UserRole = "admin" | "editor" | "viewer";

const JWT_SECRET = "zoltraak-secret-key-2026";

interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function getAuthUser(
  req: NextRequest
): Promise<{ id: number; name: string; email: string; role: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute<UserRow[]>(
      "SELECT id, name, email, role FROM users WHERE id = ? AND is_active = TRUE",
      [payload.userId]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } finally {
    connection.release();
  }
}
