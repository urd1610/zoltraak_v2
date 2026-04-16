export const SMB_HOST = "192.168.0.153";

export const SERVER02_SHARES = [
  "①　全社",
  "②　掲示板",
  "③　生産グループ",
  "④　技術グループ",
  "⑤　品質グループ",
  "⑥　生産管理グループ",
  "⑧　情報グループ",
  "スキャナ文書",
] as const;

export const ALLOWED_SERVER02_SHARES = new Set<string>(SERVER02_SHARES);

export type Server02PathParts = {
  shareName: string;
  relativeSegments: string[];
};

function splitSharePath(value: string): Server02PathParts | null {
  const segments = value.split("/").filter(Boolean);
  const [shareName, ...relativeSegments] = segments;
  if (!shareName) {
    return null;
  }

  return { shareName, relativeSegments };
}

export function parseServer02Path(rawPath: string): Server02PathParts | null {
  const normalized = rawPath.trim().replace(/\\/g, "/");
  if (!normalized) {
    return null;
  }

  const prefixes = [
    "/Volumes/",
    "file:///Volumes/",
    `//${SMB_HOST}/`,
    `smb://${SMB_HOST}/`,
    `file://${SMB_HOST}/`,
  ];

  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      return splitSharePath(normalized.slice(prefix.length));
    }
  }

  return null;
}

export function hasServer02Traversal(parts: Server02PathParts): boolean {
  return [parts.shareName, ...parts.relativeSegments].some(
    (segment) => segment === "..",
  );
}

export function toMacServer02Path(parts: Server02PathParts): string {
  return ["/Volumes", parts.shareName, ...parts.relativeSegments].join("/");
}

export function toWindowsServer02Path(parts: Server02PathParts): string {
  const segments = [parts.shareName, ...parts.relativeSegments].join("\\");
  return `\\\\${SMB_HOST}\\${segments}`;
}

export function toSmbUrl(parts: Server02PathParts): string {
  const encoded = [parts.shareName, ...parts.relativeSegments]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `smb://${SMB_HOST}/${encoded}`;
}

export function toMacFileUrl(parts: Server02PathParts): string {
  const encoded = [parts.shareName, ...parts.relativeSegments]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `file:///Volumes/${encoded}`;
}

export function toWindowsFileUrl(parts: Server02PathParts): string {
  const encoded = [parts.shareName, ...parts.relativeSegments]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `file://${SMB_HOST}/${encoded}`;
}

export function getServer02NativeShareRoot(
  shareName: string,
  platform = process.platform,
): string | null {
  if (platform === "darwin") {
    return `/Volumes/${shareName}`;
  }

  if (platform === "win32") {
    return `\\\\${SMB_HOST}\\${shareName}`;
  }

  return null;
}

export function toNativeServer02Path(
  rawPath: string,
  platform = process.platform,
): string | null {
  const parts = parseServer02Path(rawPath);
  if (!parts) {
    return null;
  }

  if (platform === "darwin") {
    return toMacServer02Path(parts);
  }

  if (platform === "win32") {
    return toWindowsServer02Path(parts);
  }

  return null;
}

export function inferServer02FilePathStyle(rawPath: string): "mac" | "windows" {
  return rawPath.trim().startsWith("/Volumes/") ? "mac" : "windows";
}

export function buildServer02FilePath(
  parts: Server02PathParts,
  style: "mac" | "windows",
): string {
  return style === "mac" ? toMacServer02Path(parts) : toWindowsServer02Path(parts);
}
