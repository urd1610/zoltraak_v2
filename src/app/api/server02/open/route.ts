import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

const SMB_HOST = "192.168.0.153";
const ALLOWED_SHARES = new Set([
  "①　全社",
  "②　掲示板",
  "③　生産グループ",
  "④　技術グループ",
  "⑤　品質グループ",
  "⑥　生産管理グループ",
  "⑧　情報グループ",
  "スキャナ文書",
]);

function normalizeServer02Path(rawPath: string): string {
  const normalized = rawPath.trim().replace(/\\/g, "/");

  if (normalized.startsWith("/Volumes/")) return normalized;
  if (normalized.startsWith(`//${SMB_HOST}/`)) {
    return `/Volumes/${normalized.slice((`//${SMB_HOST}/`).length)}`;
  }
  if (normalized.startsWith(`smb://${SMB_HOST}/`)) {
    return `/Volumes/${normalized.slice((`smb://${SMB_HOST}/`).length)}`;
  }
  return normalized;
}

function getShareNameFromPath(path: string): string {
  const withoutRoot = path.replace(/^\/Volumes\//, "");
  return withoutRoot.split("/")[0] || "";
}

function toSmbUrl(path: string): string {
  const rel = path.replace(/^\/Volumes\//, "");
  const encoded = rel
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `smb://${SMB_HOST}/${encoded}`;
}

function toFileUrl(path: string): string {
  const rel = path.replace(/^\/Volumes\//, "");
  const encoded = rel
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `file:///Volumes/${encoded}`;
}

function toWindowsUncPath(path: string): string {
  const rel = path.replace(/^\/Volumes\//, "");
  return `\\\\${SMB_HOST}\\${rel.replace(/\//g, "\\")}`;
}

function toWindowsFileUrl(path: string): string {
  const rel = path.replace(/^\/Volumes\//, "");
  const encoded = rel
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `file://${SMB_HOST}/${encoded}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "認証が必要です" },
        { status: 401 },
      );
    }

    let body: { path?: string; type?: "file" | "directory" };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { path, type } = body;
    const safePath = normalizeServer02Path(path || "");

    if (!safePath || typeof safePath !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'path' parameter" },
        { status: 400 }
      );
    }

    if (!type || !["file", "directory"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid 'type' parameter. Must be 'file' or 'directory'" },
        { status: 400 }
      );
    }

    // Security checks
    if (!safePath.startsWith("/Volumes/")) {
      return NextResponse.json(
        { success: false, error: "Path must start with '/Volumes/'" },
        { status: 403 }
      );
    }

    if (safePath.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Path cannot contain '..'" },
        { status: 403 }
      );
    }

    const shareName = getShareNameFromPath(safePath);
    if (!shareName || !ALLOWED_SHARES.has(shareName)) {
      return NextResponse.json(
        { success: false, error: "指定された共有フォルダは許可対象外です" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      openUrl: toFileUrl(safePath),
      smbOpenUrl: toSmbUrl(safePath),
      windowsOpenUrl: toWindowsFileUrl(safePath),
      windowsUncPath: toWindowsUncPath(safePath),
      path: safePath,
      type,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: `Validation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
