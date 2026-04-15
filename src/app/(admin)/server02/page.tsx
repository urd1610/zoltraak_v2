"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  HardDrive,
  RefreshCw,
  Square,
  Copy,
  ExternalLink,
  FolderOpen,
  Folder,
  File,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  FileAudio,
  FileVideo,
  FileJson,
  Check,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { usePageContextStore, type PageAction } from "@/stores/page-context-store";

interface FileEntry {
  id: number;
  share_name: string;
  file_path: string;
  file_name: string;
  extension: string | null;
  file_size: number;
  modified_at: string;
  is_directory: boolean;
  depth: number;
}

interface StatsData {
  recentScans: Array<{
    id: number;
    share_name: string | null;
    status: string;
    total_files: number;
    total_directories: number;
    total_size: number;
    started_at: string;
    completed_at: string | null;
  }>;
  shareStats: Array<{
    share_name: string;
    total_entries: number;
    file_count: number;
    dir_count: number;
    total_size: number;
    last_indexed: string;
  }>;
  totalIndexed: number;
  topExtensions: Array<{
    extension: string;
    count: number;
  }>;
}

// ── Helpers ──

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${d} ${h}:${min}`;
  } catch {
    return "—";
  }
}

function getFileIcon(extension: string | null, isDirectory: boolean) {
  if (isDirectory) return <Folder className="h-4 w-4 text-blue-400" />;
  const ext = extension?.toLowerCase();
  switch (ext) {
    case "pdf": return <FileText className="h-4 w-4 text-red-400" />;
    case "doc": case "docx": return <FileText className="h-4 w-4 text-blue-500" />;
    case "xls": case "xlsx": return <FileText className="h-4 w-4 text-green-500" />;
    case "ppt": case "pptx": return <FileText className="h-4 w-4 text-orange-500" />;
    case "js": case "ts": case "tsx": case "jsx": case "py": case "java": case "cpp": case "c": case "cs":
      return <FileCode className="h-4 w-4 text-yellow-400" />;
    case "json": case "xml": case "yaml": case "yml":
      return <FileJson className="h-4 w-4 text-purple-400" />;
    case "jpg": case "jpeg": case "png": case "gif": case "webp": case "svg":
      return <FileImage className="h-4 w-4 text-pink-400" />;
    case "zip": case "rar": case "7z": case "tar": case "gz":
      return <FileArchive className="h-4 w-4 text-yellow-600" />;
    case "mp3": case "wav": case "flac": case "aac":
      return <FileAudio className="h-4 w-4 text-purple-500" />;
    case "mp4": case "avi": case "mkv": case "mov":
      return <FileVideo className="h-4 w-4 text-cyan-400" />;
    default: return <File className="h-4 w-4 text-gray-400" />;
  }
}

// ── Sub-components ──

/** Searching animation overlay shown when AI is working */
const SearchingOverlay = memo(function SearchingOverlay() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <Search className="absolute inset-0 m-auto h-6 w-6 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">AIアシスタントが検索しています...</p>
        <p className="text-xs text-muted-foreground">右のチャットパネルで進捗を確認できます</p>
      </div>
    </div>
  );
});

/** Clipboard copy button with feedback */
async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback to legacy method below
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    const success = await copyText(text);
    if (success) {
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setFailed(true);
    setTimeout(() => setFailed(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title={failed ? "コピーに失敗しました" : "パスをコピー"}
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-400" />
        : failed ? <Copy className="h-3.5 w-3.5 text-red-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Open path via server API */
function buildOpenUrls(payload: {
  openUrl: string;
  smbOpenUrl?: string;
  windowsOpenUrl?: string;
}) {
  const isWindows = typeof navigator !== "undefined" && /Windows/.test(navigator.platform);
  const urls = [payload.openUrl];

  if (isWindows && payload.windowsOpenUrl) {
    urls.unshift(payload.windowsOpenUrl);
  }

  if (payload.smbOpenUrl) {
    urls.push(payload.smbOpenUrl);
  }

  return [...new Set(urls)];
}

function launchLocalPath(url: string): boolean {
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) {
      opened.opener = null;
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.position = "fixed";
    anchor.style.left = "-10000px";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch {
    // fallback below
  }

  try {
    window.location.assign(url);
    return true;
  } catch {
    return false;
  }
}

async function openPath(
  path: string,
  type: "file" | "directory",
  getAuthHeaders: () => Record<string, string>,
) {
  const baseHeaders = getAuthHeaders();
  const headers = baseHeaders.Authorization
    ? baseHeaders
    : (() => {
      if (typeof window === "undefined") return baseHeaders;
      try {
        const raw = window.localStorage.getItem("app-settings");
        if (!raw) return baseHeaders;
        const parsed = JSON.parse(raw) as { state?: { token?: string } };
        const token = parsed?.state?.token;
        return token ? { ...baseHeaders, Authorization: `Bearer ${token}` } : baseHeaders;
      } catch {
        return baseHeaders;
      }
    })();

  const response = await fetch("/api/server02/open", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ path, type }),
  });

  const payload = await response.json().catch(() => null) as {
    success?: boolean;
    openUrl?: string;
    smbOpenUrl?: string;
    windowsOpenUrl?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.success || !payload.openUrl) {
    const errorMessage = payload?.error || `Failed to open ${type}`;
    throw new Error(errorMessage);
  }

  const urls = buildOpenUrls({ openUrl: payload.openUrl, smbOpenUrl: payload.smbOpenUrl, windowsOpenUrl: payload.windowsOpenUrl });
  const opened = urls.some(launchLocalPath);
  if (!opened) {
    throw new Error("ブラウザからパスを起動できませんでした。");
  }
}

/** File result row with actions */
const FileResultRow = memo(function FileResultRow(
  {
    file,
    onOpen,
  }: {
    file: FileEntry;
    onOpen: (path: string, type: "file" | "directory") => Promise<void> | void;
  },
) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/50 transition-colors group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {getFileIcon(file.extension, file.is_directory)}
          <span className="font-medium truncate">{file.file_name}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 max-w-xs">
          <span className="text-xs text-muted-foreground truncate" title={file.file_path}>
            {file.file_path}
          </span>
          <CopyButton text={file.file_path} />
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="secondary" className="text-xs">{file.share_name}</Badge>
      </td>
      <td className="py-3 px-4 text-right text-muted-foreground">
        {file.is_directory ? "—" : formatFileSize(file.file_size)}
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground">
        {formatDate(file.modified_at)}
      </td>
      <td className="py-2 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!file.is_directory && (
            <button
              type="button"
              onClick={() => onOpen(file.file_path, "file")}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="ファイルを開く"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpen(file.file_path, "directory")}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="フォルダを開く"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

/** Scan progress section */
const ScanProgressSection = memo(function ScanProgressSection({
  isScanning,
  scanProgress,
  scanStartedAt,
  scanElapsed,
  scanShareIndex,
  scanTotalShares,
  scanShareResults,
}: {
  isScanning: boolean;
  scanProgress: string;
  scanStartedAt: Date | null;
  scanElapsed: string;
  scanShareIndex: number;
  scanTotalShares: number;
  scanShareResults: string[];
}) {
  if (!isScanning && !scanProgress) return null;

  return (
    <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-4 space-y-3">
      {scanStartedAt && (
        <div className="flex items-center justify-between text-xs text-blue-300/80">
          <span>開始: {scanStartedAt.toLocaleTimeString("ja-JP")}</span>
          {scanElapsed && <span className="font-mono tabular-nums">経過: {scanElapsed}</span>}
        </div>
      )}
      {isScanning && scanTotalShares > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-blue-300">
            <span>{scanShareIndex + 1} / {scanTotalShares} 共有フォルダ</span>
            <span>{Math.round(((scanShareIndex + (scanProgress.includes("完了") ? 1 : 0.5)) / scanTotalShares) * 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-blue-500/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${((scanShareIndex + (scanProgress.includes("完了") ? 1 : 0.5)) / scanTotalShares) * 100}%` }}
            />
          </div>
        </div>
      )}
      <div className="text-sm text-blue-300">{scanProgress}</div>
      {scanShareResults.length > 0 && (
        <div className="space-y-1 text-xs text-blue-300/70 border-t border-blue-500/20 pt-2 max-h-32 overflow-y-auto">
          {scanShareResults.map((result, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-green-400">✓</span>
              {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Main Page ──

export default function Server02Page() {
  const { isLoggedIn, isAdmin, getAuthHeaders, openLogin } = useSettingsStore();
  const canManageScan = isLoggedIn && isAdmin();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [shares, setShares] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanShareIndex, setScanShareIndex] = useState(0);
  const [scanTotalShares, setScanTotalShares] = useState(0);
  const [scanShareResults, setScanShareResults] = useState<string[]>([]);
  const [scanStartedAt, setScanStartedAt] = useState<Date | null>(null);
  const [scanElapsed, setScanElapsed] = useState("");

  // AI action results → displayed as search results
  const { actionResults, isExecutingActions } = usePageContextStore();

  // Extract search results from the latest server02_search action result
  const searchResults: FileEntry[] = (() => {
    const searchAction = [...actionResults].reverse().find((r) => r.action === "server02_search" && r.success);
    if (!searchAction?.data) return [];
    const data = searchAction.data as { files?: FileEntry[] };
    return data.files || [];
  })();

  const searchTotal = (() => {
    const searchAction = [...actionResults].reverse().find((r) => r.action === "server02_search" && r.success);
    if (!searchAction?.data) return 0;
    const data = searchAction.data as { total?: number };
    return data.total || 0;
  })();

  const searchMessage = (() => {
    const searchAction = [...actionResults].reverse().find((r) => r.action === "server02_search" && r.success);
    return searchAction?.message || "";
  })();

  // Debounced AI working state — prevents flicker from cross-store timing gaps
  const [isAiWorking, setIsAiWorking] = useState(false);
  const aiWorkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isExecutingActions) {
      // Immediately show animation
      if (aiWorkingTimerRef.current) { clearTimeout(aiWorkingTimerRef.current); aiWorkingTimerRef.current = null; }
      setIsAiWorking(true);
    } else {
      // Delay hiding to bridge micro-gaps between store updates
      aiWorkingTimerRef.current = setTimeout(() => setIsAiWorking(false), 400);
    }
    return () => { if (aiWorkingTimerRef.current) clearTimeout(aiWorkingTimerRef.current); };
  }, [isExecutingActions]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/server02/scan");
      const data = await response.json();
      setStats(data);
      const shareNames = (data.shareStats || []).map((s: { share_name: string }) => s.share_name);
      setShares(shareNames);
      if (data.progress && data.progress.status === "running") {
        applyProgress(data.progress);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  function applyProgress(p: Record<string, unknown>) {
    setIsScanning(p.status === "running");
    setScanProgress((p.message as string) || "");
    setScanShareIndex((p.completedShares as number) || 0);
    setScanTotalShares((p.totalShares as number) || 0);
    setScanShareResults((p.shareResults as string[]) || []);
    setScanStartedAt(p.startedAt ? new Date(p.startedAt as string) : null);
  }

  // Elapsed timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isScanning && scanStartedAt) {
      const tick = () => {
        const sec = Math.floor((Date.now() - scanStartedAt.getTime()) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        setScanElapsed(m > 0 ? `${m}分${s}秒` : `${s}秒`);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, [isScanning, scanStartedAt]);

  // Polling during scan
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isScanning) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch("/api/server02/scan?progress=1");
        const data = await res.json();
        const p = data.progress;

        if (!p) {
          setIsScanning(false);
          setScanProgress("");
          setScanShareResults([]);
          setScanStartedAt(null);
          setScanElapsed("");
          await fetchStats();
          return;
        }

        applyProgress(p);

        if (p.status === "completed" || p.status === "stopped") {
          setIsScanning(false);
          await fetchStats();
          setTimeout(() => {
            setScanProgress("");
            setScanShareResults([]);
            setScanStartedAt(null);
            setScanElapsed("");
          }, 8000);
        } else if (p.status === "failed") {
          setIsScanning(false);
          setTimeout(() => {
            setScanProgress("");
            setScanStartedAt(null);
            setScanElapsed("");
          }, 5000);
        }
      } catch {
        // ignore
      }
    };

    pollRef.current = setInterval(poll, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isScanning, fetchStats]);

  const handleScan = async (targetShare?: string) => {
    if (!canManageScan) return;
    try {
      const headers = getAuthHeaders();
      const body = targetShare ? { share: targetShare } : {};
      const response = await fetch("/api/server02/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.status === 409) {
        if (result.progress) applyProgress(result.progress);
        return;
      }
      setIsScanning(true);
      setScanStartedAt(new Date());
      setScanProgress("スキャンを開始しています...");
      setScanShareIndex(0);
      setScanTotalShares(0);
      setScanShareResults([]);
      setScanElapsed("");
    } catch (error) {
      console.error("Scan failed:", error);
      setScanProgress("スキャンの開始に失敗しました");
      setTimeout(() => setScanProgress(""), 5000);
    }
  };

  const handleStopScan = async () => {
    if (!canManageScan) return;
    try {
      await fetch("/api/server02/scan", { method: "DELETE", headers: getAuthHeaders() });
      setScanProgress("スキャンを停止中...");
    } catch {
      // next poll picks it up
    }
  };

  // ── AI Assistant: ページコンテキスト登録 ──
  const { setPageContext, clearPageContext, refreshTrigger } = usePageContextStore();

  useEffect(() => {
    const server02Actions: PageAction[] = [
      {
        name: "server02_search",
        description: "共有フォルダ内のファイルをキーワードで検索します",
        parameters: {
          q: { type: "string", description: "検索キーワード", required: true },
          share: { type: "string", description: "共有フォルダ名で絞り込み" },
          ext: { type: "string", description: "拡張子で絞り込み（例: pdf, xlsx）" },
          type: { type: "string", description: "種類で絞り込み", enum: ["file", "directory"] },
          limit: { type: "number", description: "最大取得件数（デフォルト20）" },
        },
      },
      {
        name: "server02_browse",
        description: "共有フォルダのディレクトリ構造を参照します",
        parameters: {
          share: { type: "string", description: "共有フォルダ名", required: true },
          path: { type: "string", description: "参照するパス（省略でルート）" },
        },
      },
      {
        name: "server02_read_file",
        description: "ファイルの内容を読み取ります。テキスト、Excel（.xlsx/.xls）、PDF（.pdf）、Word（.doc/.docx）に対応しています（5MB以下）",
        parameters: {
          file_path: { type: "string", description: "ファイルのフルパス（/Volumes/共有名/...）", required: true },
        },
      },
    ];

    setPageContext("server02", "Server02 ファイル検索", {
      totalIndexed: stats?.totalIndexed || 0,
      shareCount: shares.length,
      shares,
      topExtensions: stats?.topExtensions?.slice(0, 5) || [],
    }, server02Actions);
  }, [stats, shares, setPageContext]);

  // ページ離脱時のみコンテキストをクリア（依存値変更時はクリアしない）
  useEffect(() => {
    return () => clearPageContext();
  }, [clearPageContext]);

  // ── AI Assistant: リフレッシュトリガー ──
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchStats();
    }
  }, [refreshTrigger, fetchStats]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Server02 ファイル検索</h1>
            <p className="text-sm text-muted-foreground">
              AIアシスタントに話しかけてファイルを検索できます
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageScan && (
            <>
              {isScanning && (
                <Button
                  variant="outline"
                  onClick={handleStopScan}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Square className="h-4 w-4 mr-2" />
                  停止
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  disabled={isScanning}
                >
                  <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
                  {isScanning ? "スキャン中..." : "スキャン"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>スキャン対象</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleScan()}>
                      すべての共有フォルダ
                    </DropdownMenuItem>
                    {shares.map((share) => (
                      <DropdownMenuItem key={share} onClick={() => handleScan(share)}>
                        {share}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Scan Progress */}
      <ScanProgressSection
        isScanning={isScanning}
        scanProgress={scanProgress}
        scanStartedAt={scanStartedAt}
        scanElapsed={scanElapsed}
        scanShareIndex={scanShareIndex}
        scanTotalShares={scanTotalShares}
        scanShareResults={scanShareResults}
      />

      {/* Main Content: AI search results or welcome state */}
      {isAiWorking ? (
        <Card>
          <CardContent className="pt-6">
            <SearchingOverlay />
          </CardContent>
        </Card>
      ) : searchResults.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                検索結果
              </CardTitle>
              <span className="text-sm text-muted-foreground">{searchMessage}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">ファイル名</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">パス</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">共有フォルダ</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">サイズ</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">更新日時</th>
                    <th className="py-3 px-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((file) => (
                    <FileResultRow
                      key={file.id}
                      file={file}
                      onOpen={async (path, type) => {
                        try {
                          await openPath(path, type, getAuthHeaders);
                        } catch (error) {
                          const message = error instanceof Error
                            ? error.message
                            : "開けませんでした";
                          if (message.includes("認証が必要です")) {
                            alert(message);
                            openLogin();
                            return;
                          }
                          console.error(message);
                          alert(message);
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {searchTotal > searchResults.length && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {searchTotal.toLocaleString()} 件中 {searchResults.length} 件を表示しています。AIに「もっと表示して」と依頼できます。
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-7 w-7 text-primary/60" />
              </div>
              <div className="space-y-2 max-w-md">
                <p className="text-sm font-medium text-foreground">AIアシスタントに検索を依頼してください</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  右のチャットパネルから「○○に関するファイルを探して」と話しかけると、
                  共有フォルダ内を検索して結果をここに表示します。
                  ファイルの内容を要約したり、特定の拡張子で絞り込むこともできます。
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Badge variant="secondary" className="text-xs">「議事録を探して」</Badge>
                  <Badge variant="secondary" className="text-xs">「Excelファイルを検索」</Badge>
                  <Badge variant="secondary" className="text-xs">「技術グループの資料」</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Panel */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">インデックス済みエントリ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIndexed.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">最多拡張子</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topExtensions[0]?.extension || "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.topExtensions[0]?.count.toLocaleString() || 0} 件</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">共有フォルダ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shares.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">最終スキャン</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono">
                {stats.recentScans[0]
                  ? formatDate(stats.recentScans[0].completed_at || stats.recentScans[0].started_at)
                  : "—"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Share Stats Table */}
      {stats && stats.shareStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">共有フォルダ統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">共有フォルダ</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">ファイル数</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">フォルダ数</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">合計サイズ</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">最終更新</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.shareStats.map((s) => (
                    <tr key={s.share_name} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{s.share_name}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{s.file_count.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{s.dir_count.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatFileSize(s.total_size)}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(s.last_indexed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
