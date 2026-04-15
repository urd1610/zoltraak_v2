import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, type } = body;

    // Validate input
    if (!path || typeof path !== "string") {
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
    if (!path.startsWith("/Volumes/")) {
      return NextResponse.json(
        { success: false, error: "Path must start with '/Volumes/'" },
        { status: 403 }
      );
    }

    if (path.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Path cannot contain '..'" },
        { status: 403 }
      );
    }

    // Build the command
    let command: string;
    if (type === "directory") {
      command = `open -R "${path}"`;
    } else {
      command = `open "${path}"`;
    }

    // Execute the command
    await execAsync(command);

    return NextResponse.json({
      success: true,
      message: `Successfully opened ${type}: ${path}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check for specific error cases
    if (errorMessage.includes("No such file or directory")) {
      return NextResponse.json(
        { success: false, error: "File or directory not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Failed to open: ${errorMessage}` },
      { status: 500 }
    );
  }
}
