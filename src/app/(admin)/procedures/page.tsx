import {
  ClipboardList,
  Search,
  Plus,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type ProcedureStatus = "公開中" | "下書き" | "レビュー中" | "アーカイブ";

interface Procedure {
  id: string;
  name: string;
  category: string;
  status: ProcedureStatus;
  author: string;
  updatedAt: string;
  steps: number;
}

const statusStyles: Record<ProcedureStatus, string> = {
  公開中: "bg-emerald-500/10 text-emerald-500",
  下書き: "bg-zinc-500/10 text-zinc-400",
  レビュー中: "bg-amber-500/10 text-amber-500",
  アーカイブ: "bg-red-500/10 text-red-400",
};

const procedures: Procedure[] = [
  {
    id: "PROC-001",
    name: "新入社員オンボーディング手順",
    category: "人事",
    status: "公開中",
    author: "田中太郎",
    updatedAt: "2026-04-08",
    steps: 12,
  },
  {
    id: "PROC-002",
    name: "サーバー障害対応フロー",
    category: "インフラ",
    status: "公開中",
    author: "佐藤次郎",
    updatedAt: "2026-04-07",
    steps: 8,
  },
  {
    id: "PROC-003",
    name: "顧客問い合わせ対応マニュアル",
    category: "カスタマーサポート",
    status: "レビュー中",
    author: "鈴木花子",
    updatedAt: "2026-04-06",
    steps: 15,
  },
  {
    id: "PROC-004",
    name: "リリース前チェックリスト",
    category: "開発",
    status: "公開中",
    author: "高橋健太",
    updatedAt: "2026-04-05",
    steps: 20,
  },
  {
    id: "PROC-005",
    name: "月次レポート作成手順",
    category: "経理",
    status: "下書き",
    author: "山田美咲",
    updatedAt: "2026-04-04",
    steps: 6,
  },
  {
    id: "PROC-006",
    name: "セキュリティインシデント対応",
    category: "セキュリティ",
    status: "レビュー中",
    author: "伊藤あかり",
    updatedAt: "2026-04-03",
    steps: 10,
  },
  {
    id: "PROC-007",
    name: "データバックアップ手順",
    category: "インフラ",
    status: "アーカイブ",
    author: "佐藤次郎",
    updatedAt: "2026-03-20",
    steps: 5,
  },
];

export default function ProceduresPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">手順リスト</h1>
            <p className="text-sm text-muted-foreground">
              手順書の作成・管理を行います
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          新規作成
        </button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="手順名で検索..."
                className="w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">すべてのステータス</option>
              <option value="公開中">公開中</option>
              <option value="下書き">下書き</option>
              <option value="レビュー中">レビュー中</option>
              <option value="アーカイブ">アーカイブ</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Procedures Table */}
      <Card>
        <CardHeader>
          <CardTitle>手順一覧</CardTitle>
          <CardDescription>全 {procedures.length} 件の手順</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">ID</th>
                  <th className="pb-3 pr-4 font-medium">
                    <span className="inline-flex items-center gap-1">
                      手順名
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="pb-3 pr-4 font-medium">カテゴリ</th>
                  <th className="pb-3 pr-4 font-medium">ステータス</th>
                  <th className="pb-3 pr-4 font-medium">作成者</th>
                  <th className="pb-3 pr-4 font-medium">
                    <span className="inline-flex items-center gap-1">
                      更新日
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="pb-3 pr-4 font-medium">ステップ数</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((proc) => (
                  <tr
                    key={proc.id}
                    className="border-b border-border/50 transition-colors hover:bg-muted/50"
                  >
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {proc.id}
                    </td>
                    <td className="py-3 pr-4 text-sm font-medium">
                      {proc.name}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        {proc.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[proc.status]}`}
                      >
                        {proc.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-sm">{proc.author}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {proc.updatedAt}
                    </td>
                    <td className="py-3 pr-4 text-sm text-center">
                      {proc.steps}
                    </td>
                    <td className="py-3">
                      <button className="rounded-md p-1 transition-colors hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
