"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Folder,
  File,
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  FileAudio,
  FileVideo,
  FileJson,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  HardDrive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

interface SearchResponse {
  files: FileEntry[];
  total: number;
  page: number;
  limit: number;
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

interface DirectoryTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: DirectoryTreeNode[];
  isExpanded?: boolean;
}

// Helper: Format bytes to human-readable size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Helper: Format date to Japanese format
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

// Helper: Get appropriate icon for file type
function getFileIcon(extension: string | null, isDirectory: boolean) {
  if (isDirectory) {
    return <Folder className="h-4 w-4 text-blue-400" />;
  }

  const ext = extension?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <FileText className="h-4 w-4 text-red-400" />;
    case "doc":
    case "docx":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "xls":
    case "xlsx":
      return <FileText className="h-4 w-4 text-green-500" />;
    case "ppt":
    case "pptx":
      return <FileText className="h-4 w-4 text-orange-500" />;
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
    case "py":
    case "java":
    case "cpp":
    case "c":
    case "cs":
      return <FileCode className="h-4 w-4 text-yellow-400" />;
    case "json":
    case "xml":
    case "yaml":
    case "yml":
      return <FileJson className="h-4 w-4 text-purple-400" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
    case "svg":
      return <FileImage className="h-4 w-4 text-pink-400" />;
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <FileArchive className="h-4 w-4 text-yellow-600" />;
    case "mp3":
    case "wav":
    case "flac":
    case "aac":
      return <FileAudio className="h-4 w-4 text-purple-500" />;
    case "mp4":
    case "avi":
    case "mkv":
    case "mov":
      return <FileVideo className="h-4 w-4 text-cyan-400" />;
    default:
      return <File className="h-4 w-4 text-gray-400" />;
  }
}

export default function Server02Page() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShare, setSelectedShare] = useState("");
  const [selectedExtension, setSelectedExtension] = useState("");
  const [selectedType, setSelectedType] = useState<"" | "file" | "directory">("");
  const [viewMode, setViewMode] = useState<"search" | "browse">("search");
  const [listView, setListView] = useState<"table" | "grid">("table");

  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [isSearching, setIsSearching] = useState(false);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [shares, setShares] = useState<string[]>([]);
  const [extensions, setExtensions] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string>("");

  const [browseRoot, setBrowseRoot] = useState<DirectoryTreeNode[]>([]);
  const [browseShare, setBrowseShare] = useState("");
  const [browsePath, setBrowsePath] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ name: string; path: string }>>([]);

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (query: string, page: number) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("page", page.toString());
      params.set("limit", pageSize.toString());
      if (selectedShare) params.set("share", selectedShare);
      if (selectedExtension) params.set("ext", selectedExtension);
      if (selectedType) params.set("type", selectedType);

      const response = await fetch(`/api/server02/search?${params}`);
      const data: SearchResponse = await response.json();
      setSearchResults(data.files || []);
      setTotalResults(data.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  }, [selectedShare, selectedExtension, selectedType, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCurrentPage(1);

    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      if (query.trim()) {
        performSearch(query, 1);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    }, 300);
    setSearchTimeout(timeout);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    if (searchQuery.trim()) {
      performSearch(searchQuery, 1);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/server02/scan");
      const data: StatsData = await response.json();
      setStats(data);

      const shareNames = data.shareStats.map((s) => s.share_name);
      setShares(shareNames);

      const exts = data.topExtensions.map((e) => e.extension || "no-ext");
      setExtensions(exts);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const handleScan = async (targetShare?: string) => {
    setIsScanning(true);
    setScanProgress("スキャンを開始しています...");

    try {
      const body = targetShare ? { share: targetShare } : {};
      const response = await fetch("/api/server02/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setScanProgress(
        `完了: ${result.totalFiles} ファイル, ${result.totalDirectories} フォルダ, ${formatFileSize(result.totalSize)}`
      );

      // Refresh stats
      await fetchStats();

      setTimeout(() => setScanProgress(""), 3000);
    } catch (error) {
      console.error("Scan failed:", error);
      setScanProgress("スキャンに失敗しました");
      setTimeout(() => setScanProgress(""), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBrowse = async (share: string) => {
    setBrowseShare(share);
    setViewMode("browse");
    setBrowsePath(share);
    setBreadcrumbs([{ name: share, path: share }]);

    try {
      const params = new URLSearchParams();
      params.set("share", share);

      const response = await fetch(`/api/server02/browse?${params}`);
      const data = await response.json();

      if (data.files && Array.isArray(data.files)) {
        const nodes: DirectoryTreeNode[] = data.files.map((f: FileEntry) => ({
          name: f.file_name,
          path: f.file_path,
          isDirectory: f.is_directory,
          children: f.is_directory ? [] : undefined,
          isExpanded: false,
        }));
        setBrowseRoot(nodes);
      }
    } catch (error) {
      console.error("Browse failed:", error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxPages = Math.ceil(totalResults / pageSize);
  const hasNextPage = currentPage < maxPages;
  const hasPreviousPage = currentPage > 1;

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      performSearch(searchQuery, currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      performSearch(searchQuery, currentPage + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Server02 ファイル検索</h1>
            <p className="text-sm text-muted-foreground">
              共有フォルダのファイルを検索・ブラウズします
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer">
            <RefreshCw className="h-4 w-4" />
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
                <DropdownMenuItem
                  key={share}
                  onClick={() => handleScan(share)}
                >
                  {share}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scan Progress / Status */}
      {scanProgress && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-3 text-sm text-blue-300">
          {scanProgress}
        </div>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Main Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ファイル名またはパスで検索..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {/* Share Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  共有フォルダ
                  {selectedShare && <Badge className="ml-1">{selectedShare}</Badge>}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuCheckboxItem
                    checked={!selectedShare}
                    onCheckedChange={() => {
                      setSelectedShare("");
                      handleFilterChange();
                    }}
                  >
                    すべて
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {shares.map((share) => (
                    <DropdownMenuCheckboxItem
                      key={share}
                      checked={selectedShare === share}
                      onCheckedChange={() => {
                        setSelectedShare(share);
                        handleFilterChange();
                      }}
                    >
                      {share}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Extension Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  拡張子
                  {selectedExtension && <Badge className="ml-1">{selectedExtension}</Badge>}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 max-h-60 overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={!selectedExtension}
                    onCheckedChange={() => {
                      setSelectedExtension("");
                      handleFilterChange();
                    }}
                  >
                    すべて
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {extensions.map((ext) => (
                    <DropdownMenuCheckboxItem
                      key={ext}
                      checked={selectedExtension === ext}
                      onCheckedChange={() => {
                        setSelectedExtension(ext);
                        handleFilterChange();
                      }}
                    >
                      .{ext}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  種類
                  {selectedType && <Badge className="ml-1">{selectedType === "file" ? "ファイル" : "フォルダ"}</Badge>}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40">
                  <DropdownMenuCheckboxItem
                    checked={!selectedType}
                    onCheckedChange={() => {
                      setSelectedType("");
                      handleFilterChange();
                    }}
                  >
                    すべて
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={selectedType === "file"}
                    onCheckedChange={() => {
                      setSelectedType("file");
                      handleFilterChange();
                    }}
                  >
                    ファイル
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={selectedType === "directory"}
                    onCheckedChange={() => {
                      setSelectedType("directory");
                      handleFilterChange();
                    }}
                  >
                    フォルダ
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters */}
              {(selectedShare || selectedExtension || selectedType) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedShare("");
                    setSelectedExtension("");
                    setSelectedType("");
                    setCurrentPage(1);
                  }}
                >
                  フィルターをクリア
                </Button>
              )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              {isSearching
                ? "検索中..."
                : totalResults > 0
                  ? `${totalResults.toLocaleString()} 件見つかりました (${currentPage}/${maxPages} ページ)`
                  : searchQuery
                    ? "検索結果がありません"
                    : "検索キーワードを入力してください"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "search" | "browse")}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="search">検索</TabsTrigger>
          <TabsTrigger value="browse">ブラウズ</TabsTrigger>
        </TabsList>

        {/* Search Results Tab */}
        <TabsContent value="search">
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {/* Results Table */}
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-foreground">
                            ファイル名
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">
                            パス
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">
                            共有フォルダ
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-foreground">
                            サイズ
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">
                            更新日時
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((file) => (
                          <tr
                            key={file.id}
                            className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {getFileIcon(file.extension, file.is_directory)}
                                <span className="font-medium truncate">
                                  {file.file_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-xs">
                              {file.file_path}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className="text-xs">
                                {file.share_name}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {file.is_directory ? "—" : formatFileSize(file.file_size)}
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {formatDate(file.modified_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Pagination */}
              {maxPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {(currentPage - 1) * pageSize + 1}〜
                    {Math.min(currentPage * pageSize, totalResults)} / {totalResults.toLocaleString()} 件
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={!hasPreviousPage}
                    >
                      前へ
                    </Button>
                    {Array.from({ length: Math.min(maxPages, 5) }, (_, i) => {
                      const pageNum = currentPage > 3 ? currentPage - 2 + i : i + 1;
                      if (pageNum > maxPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => performSearch(searchQuery, pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : searchQuery ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                検索結果がありません
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                検索キーワードを入力してください
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse">
          <div className="space-y-4">
            {/* Share List for Browsing */}
            {!browseShare ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">共有フォルダを選択</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {shares.map((share) => (
                      <button
                        key={share}
                        onClick={() => handleBrowse(share)}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted transition-colors text-left"
                      >
                        <Folder className="h-5 w-5 text-blue-400 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{share}</div>
                          <div className="text-xs text-muted-foreground">
                            {stats?.shareStats.find((s) => s.share_name === share)
                              ?.total_entries.toLocaleString() || 0}{" "}
                             件
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">フォルダを閲覧</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBrowseShare("");
                        setBrowseRoot([]);
                        setBreadcrumbs([]);
                      }}
                    >
                      戻る
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {breadcrumbs.map((crumb, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {idx > 0 && <ChevronRight className="h-3 w-3" />}
                        <button
                          onClick={() => {
                            setBrowsePath(crumb.path);
                            setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
                          }}
                          className="hover:text-foreground transition-colors"
                        >
                          {crumb.name === browseShare ? "ルート" : crumb.name}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Directory Tree */}
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {browseRoot.length > 0 ? (
                      browseRoot.map((node) => (
                        <DirectoryItem
                          key={node.path}
                          node={node}
                          share={browseShare}
                          onNavigate={(path, name) => {
                            setBrowsePath(path);
                            setBreadcrumbs([
                              ...breadcrumbs,
                              { name, path },
                            ]);
                          }}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        フォルダが空です
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Stats Panel */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Indexed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                インデックス済みエントリ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalIndexed.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* Top Extension */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                最多拡張子
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.topExtensions[0]?.extension || "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.topExtensions[0]?.count.toLocaleString() || 0} 件
              </p>
            </CardContent>
          </Card>

          {/* Share Count */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                共有フォルダ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shares.length}</div>
            </CardContent>
          </Card>

          {/* Last Scan */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                最終スキャン
              </CardTitle>
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
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      共有フォルダ
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      ファイル数
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      フォルダ数
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      合計サイズ
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      最終更新
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.shareStats.map((s) => (
                    <tr
                      key={s.share_name}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{s.share_name}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {s.file_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {s.dir_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {formatFileSize(s.total_size)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {formatDate(s.last_indexed)}
                      </td>
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

// Directory Tree Item Component
function DirectoryItem({
  node,
  share,
  onNavigate,
}: {
  node: DirectoryTreeNode;
  share: string;
  onNavigate: (path: string, name: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<DirectoryTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChildren = async () => {
    if (isLoading || children.length > 0) return;
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("share", share);
      params.set("path", node.path);

      const response = await fetch(`/api/server02/browse?${params}`);
      const data = await response.json();

      if (data.files && Array.isArray(data.files)) {
        const items: DirectoryTreeNode[] = data.files.map((f: FileEntry) => ({
          name: f.file_name,
          path: f.file_path,
          isDirectory: f.is_directory,
          children: f.is_directory ? [] : undefined,
          isExpanded: false,
        }));
        setChildren(items);
      }
    } catch (error) {
      console.error("Failed to load directory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    if (node.isDirectory) {
      if (!isExpanded) {
        await loadChildren();
      }
      setIsExpanded(!isExpanded);
    }
  };

  if (!node.isDirectory) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors">
        {getFileIcon(node.name.split(".").pop() || null, false)}
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted rounded transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        )}
        <Folder className="h-4 w-4 text-blue-400 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
        {isLoading && <span className="text-xs text-muted-foreground ml-auto">読込中...</span>}
      </button>
      {isExpanded && (
        <div className="ml-4 border-l border-border/50">
          {children.map((child) => (
            <DirectoryItem key={child.path} node={child} share={share} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}
