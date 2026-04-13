import { Map, Flag, CheckCircle2, Circle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type MilestoneStatus = "completed" | "in-progress" | "upcoming";

interface Milestone {
  title: string;
  description: string;
  date: string;
  status: MilestoneStatus;
  items: string[];
}

const milestones: Milestone[] = [
  {
    title: "フェーズ 1: 基盤構築",
    description: "システムの基盤となるインフラとアーキテクチャの構築",
    date: "2026年 1月 - 2月",
    status: "completed",
    items: [
      "クラウドインフラのセットアップ",
      "CI/CDパイプラインの構築",
      "認証・認可基盤の実装",
      "データベーススキーマ設計",
    ],
  },
  {
    title: "フェーズ 2: コア機能開発",
    description: "主要なビジネスロジックとAPIの開発",
    date: "2026年 3月 - 4月",
    status: "in-progress",
    items: [
      "ユーザー管理API",
      "手順管理システム",
      "スケジュール機能",
      "ガントチャート機能",
    ],
  },
  {
    title: "フェーズ 3: UI/UX改善",
    description: "ダッシュボードとユーザーインターフェースの洗練",
    date: "2026年 5月 - 6月",
    status: "upcoming",
    items: [
      "ダッシュボードウィジェット",
      "レスポンシブデザイン対応",
      "ダークモード最適化",
      "アクセシビリティ改善",
    ],
  },
  {
    title: "フェーズ 4: AI統合",
    description: "AIアシスタントと自動化機能の統合",
    date: "2026年 7月 - 8月",
    status: "upcoming",
    items: [
      "AIチャットアシスタント",
      "自動手順生成",
      "予測分析ダッシュボード",
      "自然言語クエリ",
    ],
  },
  {
    title: "フェーズ 5: 本番リリース",
    description: "品質保証とプロダクション環境への展開",
    date: "2026年 9月 - 10月",
    status: "upcoming",
    items: [
      "負荷テスト・性能最適化",
      "セキュリティ監査",
      "ベータテスト",
      "本番環境デプロイ",
    ],
  },
];

const statusConfig: Record<
  MilestoneStatus,
  { icon: typeof CheckCircle2; color: string; lineColor: string; label: string }
> = {
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    lineColor: "bg-emerald-500",
    label: "完了",
  },
  "in-progress": {
    icon: Clock,
    color: "text-blue-500",
    lineColor: "bg-blue-500",
    label: "進行中",
  },
  upcoming: {
    icon: Circle,
    color: "text-muted-foreground",
    lineColor: "bg-border",
    label: "予定",
  },
};

export default function RoadmapPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Map className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ロードマップ</h1>
          <p className="text-sm text-muted-foreground">
            プロジェクトのマイルストーンとタイムラインを確認できます
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>全体進捗</CardTitle>
          <CardDescription>プロジェクト完了率</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex justify-between text-sm">
                <span>進捗状況</span>
                <span className="font-medium">30%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: "30%" }}
                />
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">完了 1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">進行中 1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">予定 3</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>タイムライン</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {milestones.map((milestone, i) => {
              const config = statusConfig[milestone.status];
              const Icon = config.icon;
              const isLast = i === milestones.length - 1;

              return (
                <div key={i} className="relative flex gap-6 pb-8 last:pb-0">
                  {/* Timeline line and dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                        milestone.status === "completed"
                          ? "border-emerald-500 bg-emerald-500/10"
                          : milestone.status === "in-progress"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-border bg-muted"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    {!isLast && (
                      <div
                        className={`mt-2 w-0.5 flex-1 ${config.lineColor}`}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">
                          {milestone.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            milestone.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : milestone.status === "in-progress"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {config.label}
                        </span>
                      </div>
                    </div>
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Flag className="h-3 w-3" />
                      {milestone.date}
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {milestone.items.map((item, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                        >
                          {milestone.status === "completed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
