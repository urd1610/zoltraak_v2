import {
  LayoutDashboard,
  Users,
  Activity,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  Settings,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const kpiCards = [
  {
    title: "ユーザー数",
    value: "12,847",
    change: "+12.5%",
    trend: "up" as const,
    icon: Users,
    description: "前月比",
  },
  {
    title: "セッション数",
    value: "48,392",
    change: "+8.2%",
    trend: "up" as const,
    icon: Activity,
    description: "前月比",
  },
  {
    title: "月間売上",
    value: "¥3,842,000",
    change: "+23.1%",
    trend: "up" as const,
    icon: DollarSign,
    description: "前月比",
  },
  {
    title: "エラー率",
    value: "0.12%",
    change: "-0.03%",
    trend: "down" as const,
    icon: AlertTriangle,
    description: "前月比",
  },
];

const recentActivity = [
  {
    action: "新規ユーザー登録",
    user: "田中太郎",
    time: "5分前",
  },
  {
    action: "手順書を更新",
    user: "鈴木花子",
    time: "12分前",
  },
  {
    action: "プロジェクト作成",
    user: "佐藤次郎",
    time: "30分前",
  },
  {
    action: "スケジュール変更",
    user: "山田美咲",
    time: "1時間前",
  },
  {
    action: "レポート出力",
    user: "高橋健太",
    time: "2時間前",
  },
  {
    action: "セッション完了",
    user: "伊藤あかり",
    time: "3時間前",
  },
];

const quickActions = [
  { label: "新規プロジェクト", icon: Plus },
  { label: "レポート作成", icon: FileText },
  { label: "設定", icon: Settings },
  { label: "データ更新", icon: RefreshCw },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            システム全体の概況を確認できます
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{kpi.title}</CardDescription>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-emerald-500" />
                )}
                <span className="text-emerald-500">{kpi.change}</span>
                <span className="text-muted-foreground">{kpi.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
            <CardDescription>直近のシステム操作履歴</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.user}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
            <CardDescription>よく使う操作</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border/50 p-4 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <action.icon className="h-5 w-5 text-primary" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
