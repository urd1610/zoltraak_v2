import {
  Zap,
  LayoutDashboard,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  ImageIcon,
  Briefcase,
  Settings,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const quickLinks = [
  {
    title: "ダッシュボード",
    description: "全体の概要と主要KPIを確認",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    title: "SNS分析",
    description: "各プラットフォームのパフォーマンス",
    icon: BarChart3,
    href: "/sns-analytics",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    title: "スケジュール",
    description: "予定とタスクの管理",
    icon: CalendarDays,
    href: "/schedule",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    title: "採点",
    description: "評価とスコアリング",
    icon: ClipboardCheck,
    href: "/scoring",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    title: "要件定義",
    description: "ドキュメント作成と管理",
    icon: FileText,
    href: "/requirements",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    title: "OGP画像",
    description: "OG画像の生成とプレビュー",
    icon: ImageIcon,
    href: "/ogp",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    title: "ジョブ管理",
    description: "バックグラウンドジョブの監視",
    icon: Briefcase,
    href: "/jobs",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    title: "設定",
    description: "アプリケーションの設定",
    icon: Settings,
    href: "/settings",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
  },
];

const recentActivity = [
  { text: "SNS分析レポートが更新されました", time: "10分前" },
  { text: "採点結果を3件追加しました", time: "30分前" },
  { text: "OGP画像テンプレートを公開しました", time: "1時間前" },
  { text: "バッチジョブ「日次レポート」が完了しました", time: "2時間前" },
];

export default function LitePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-7 w-7 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ライトモード</h1>
          <p className="text-sm text-muted-foreground">
            主要機能へのクイックアクセス
          </p>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.title}
              className="group cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            >
              <CardContent className="pt-1">
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg p-2 ${link.bg}`}>
                    <Icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3">
                  <p className="font-semibold text-sm">{link.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {link.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
            <CardDescription>直近の操作と通知</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border/50 p-3"
                >
                  <p className="text-sm">{item.text}</p>
                  <span className="shrink-0 text-xs text-muted-foreground ml-4">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>システムステータス</CardTitle>
            <CardDescription>各サービスの稼働状況</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "API サーバー", status: "正常", ok: true },
                { name: "データベース", status: "正常", ok: true },
                { name: "ストレージ", status: "正常", ok: true },
                { name: "ジョブキュー", status: "遅延あり", ok: false },
              ].map((service, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border/50 p-3"
                >
                  <p className="text-sm font-medium">{service.name}</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        service.ok ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        service.ok
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
