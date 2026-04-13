import { ClipboardCheck, Trophy, TrendingUp, Users, Star } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const scoringData = [
  {
    name: "田中 太郎",
    score: 92,
    comment: "プレゼン構成が非常に優れている。データの裏付けも十分。",
    date: "2026-04-08",
  },
  {
    name: "佐藤 花子",
    score: 87,
    comment: "提案内容に独創性がある。コスト面の検討をさらに深めたい。",
    date: "2026-04-08",
  },
  {
    name: "鈴木 一郎",
    score: 78,
    comment: "基本的な要件は満たしている。UIデザインの改善が望まれる。",
    date: "2026-04-07",
  },
  {
    name: "高橋 美咲",
    score: 95,
    comment: "全体的に完成度が高い。実装品質・ドキュメントともに秀逸。",
    date: "2026-04-07",
  },
  {
    name: "渡辺 健太",
    score: 68,
    comment: "アイデアは良いが実現可能性の検証が不足している。",
    date: "2026-04-06",
  },
  {
    name: "伊藤 さくら",
    score: 84,
    comment: "ユーザーリサーチに基づいた設計が評価できる。テスト計画を追加。",
    date: "2026-04-06",
  },
  {
    name: "山本 大輔",
    score: 73,
    comment: "技術選定は妥当。パフォーマンス最適化の観点が不足。",
    date: "2026-04-05",
  },
  {
    name: "中村 理恵",
    score: 91,
    comment: "要件を的確に把握し、拡張性のある設計を提案している。",
    date: "2026-04-05",
  },
];

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-400";
  if (score >= 80) return "text-sky-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
}

function scoreBadge(score: number) {
  if (score >= 90) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 80) return "bg-sky-500/15 text-sky-400 border-sky-500/30";
  if (score >= 70) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

const avg = Math.round(
  scoringData.reduce((sum, d) => sum + d.score, 0) / scoringData.length
);
const highest = Math.max(...scoringData.map((d) => d.score));
const lowest = Math.min(...scoringData.map((d) => d.score));
const above80 = scoringData.filter((d) => d.score >= 80).length;

export default function ScoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-7 w-7 text-amber-400" />
        <h1 className="text-2xl font-bold tracking-tight">採点</h1>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "平均スコア",
            value: `${avg}点`,
            icon: TrendingUp,
            color: "text-sky-400",
          },
          {
            label: "最高スコア",
            value: `${highest}点`,
            icon: Trophy,
            color: "text-emerald-400",
          },
          {
            label: "最低スコア",
            value: `${lowest}点`,
            icon: Star,
            color: "text-amber-400",
          },
          {
            label: "80点以上",
            value: `${above80}人 / ${scoringData.length}人`,
            icon: Users,
            color: "text-indigo-400",
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
                <p className="text-xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>スコア分布</CardTitle>
          <CardDescription>全採点結果の分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { range: "90-100", count: scoringData.filter((d) => d.score >= 90).length, color: "bg-emerald-500" },
              { range: "80-89", count: scoringData.filter((d) => d.score >= 80 && d.score < 90).length, color: "bg-sky-500" },
              { range: "70-79", count: scoringData.filter((d) => d.score >= 70 && d.score < 80).length, color: "bg-amber-500" },
              { range: "60-69", count: scoringData.filter((d) => d.score < 70).length, color: "bg-red-500" },
            ].map((bucket) => (
              <div key={bucket.range} className="flex items-center gap-3">
                <span className="w-16 text-xs text-muted-foreground text-right">
                  {bucket.range}
                </span>
                <div className="flex-1 h-5 rounded-sm bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full rounded-sm ${bucket.color} opacity-70`}
                    style={{
                      width: `${(bucket.count / scoringData.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-xs text-muted-foreground">
                  {bucket.count}件
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scoring Table */}
      <Card>
        <CardHeader>
          <CardTitle>採点結果一覧</CardTitle>
          <CardDescription>全{scoringData.length}件の採点データ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    名前
                  </th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">
                    スコア
                  </th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                    コメント
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    日付
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoringData.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium">{row.name}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${scoreBadge(row.score)}`}
                      >
                        {row.score}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {row.comment}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                      {row.date}
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
