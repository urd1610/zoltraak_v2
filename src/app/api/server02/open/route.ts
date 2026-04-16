import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  ALLOWED_SERVER02_SHARES,
  parseServer02Path,
  toMacFileUrl,
  toMacServer02Path,
  toSmbUrl,
  toWindowsFileUrl,
  toWindowsServer02Path,
} from "@/lib/server02-paths";

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
    const pathParts = parseServer02Path(path || "");

    if (!pathParts) {
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
    if ([pathParts.shareName, ...pathParts.relativeSegments].includes("..")) {
      return NextResponse.json(
        { success: false, error: "Path cannot contain '..'" },
        { status: 403 }
      );
    }

    if (!ALLOWED_SERVER02_SHARES.has(pathParts.shareName)) {
      return NextResponse.json(
        { success: false, error: "指定された共有フォルダは許可対象外です" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      openUrl: toMacFileUrl(pathParts),
      smbOpenUrl: toSmbUrl(pathParts),
      windowsOpenUrl: toWindowsFileUrl(pathParts),
      windowsUncPath: toWindowsServer02Path(pathParts),
      path: toMacServer02Path(pathParts),
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
