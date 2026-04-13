import {
  Briefcase,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Pause,
  RefreshCw,
  Timer,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type JobStatus = "待機中" | "実行中" | "完了" | "失敗";

interface Job {
  name: string;
  status: JobStatus;
  startedAt: string;
  duration: string;
  description: string;
}

const jobs: Job[] = [
  {
    name: "日次レポート生成",
    status: "完了",
    startedAt: "2026-04-09 06:00",
    duration: "3分42秒",
    description: "全ユーザーの日次アクティビティレポートを生成",
  },
  {
    name: "SNSデータ同期",
    status: "実行中",
    startedAt: "2026-04-09 09:30",
    duration: "実行中...",
    description: "Twitter/Instagram/YouTubeのデータを同期",
  },
  {
    name: "OGP画像バッチ生成",
    status: "待機中",
    startedAt: "—",
    duration: "—",
    description: "未生成のOGP画像を一括作成",
  },
  {
    name: "データベースバックアップ",
    status: "完了",
    startedAt: "2026-04-09 03:00",
    duration: "12分18秒",
    description: "全テーブルのフルバックアップ",
  },
  {
    name: "メール通知送信",
    status: "失敗",
    startedAt: "2026-04-09 08:15",
    duration: "0分3秒",
    description: "週次サマリーメールの一括送信",
  },
  {
    name: "キャッシュ再構築",
    status: "完了",
    startedAt: "2026-04-09 05:00",
    duration: "1分55秒",
    description: "ページキャッシュとAPIキャッシュの再構築",
  },
  {
    name: "ログローテーション",
    status: "待機中",
    startedAt: "—",
    duration: "—",
    description: "30日以上のログファイルをアーカイブ",
  },
  {
    name: "スコアリング集計",
    status: "完了",
    startedAt: "2026-04-09 07:00",
    duration: "5分12秒",
    description: "全採点データの集計と統計レポート生成",
  },
];

function statusConfig(status: JobStatus) {
  switch (status) {
    case "待機中":
      return {
        icon: Pause,
        className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
      };
    case "実行中":
      return {
        icon: Loader2,
        className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
        spin: true,
      };
    case "完了":
      return {
        icon: CheckCircle2,
        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "失敗":
      return {
        icon: XCircle,
        className: "bg-red-500/15 text-red-400 border-red-500/30",
      };
  }
}

const statusCounts = {
  waiting: jobs.filter((j) => j.status === "待機中").length,
  running: jobs.filter((j) => j.status === "実行中").length,
  completed: jobs.filter((j) => j.status === "完了").length,
  failed: jobs.filter((j) => j.status === "失敗").length,
};

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-7 w-7 text-orange-400" />
        <h1 className="text-2xl font-bold tracking-tight">ジョブ管理</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "待機中",
            count: statusCounts.waiting,
            icon: Clock,
            color: "text-gray-400",
          },
          {
            label: "実行中",
            count: statusCounts.running,
            icon: RefreshCw,
            color: "text-sky-400",
          },
          {
            label: "完了",
            count: statusCounts.completed,
            icon: CheckCircle2,
            color: "text-emerald-400",
          },
          {
            label: "失敗",
            count: statusCounts.failed,
            icon: XCircle,
            color: "text-red-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-bold">{stat.count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            ジョブ一覧
          </CardTitle>
          <CardDescription>
            バックグラウンドジョブの実行状況（全{jobs.length}件）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    ジョブ名
                  </th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">
                    ステータス
                  </th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    開始時刻
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    所要時間
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => {
                  const config = statusConfig(job.status);
                  const StatusIcon = config.icon;
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <p className="font-medium">{job.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {job.description}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
                        >
                          <StatusIcon
                            className={`h-3 w-3 ${"spin" in config && config.spin ? "animate-spin" : ""}`}
                          />
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {job.startedAt}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground whitespace-nowrap">
                        {job.duration}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
