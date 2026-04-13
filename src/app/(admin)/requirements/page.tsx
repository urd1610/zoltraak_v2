import {
  FileText,
  BookOpen,
  PenLine,
  Eye,
  Save,
  Clock,
  Tag,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const sampleMarkdown = `# プロジェクト要件定義書

## 1. 概要

本プロジェクトは、社内業務効率化を目的とした管理ダッシュボードの開発である。
主要なSNSプラットフォームのデータ統合、タスク管理、レポート生成機能を提供する。

## 2. 機能要件

### 2.1 ダッシュボード
- リアルタイムKPI表示
- グラフ・チャートによるデータ可視化
- カスタマイズ可能なウィジェット配置

### 2.2 SNS分析
- Twitter/X, Instagram, YouTubeのデータ連携
- フォロワー推移・エンゲージメント率の追跡
- 投稿パフォーマンスの比較分析

### 2.3 ジョブ管理
- バックグラウンドジョブの監視
- 実行履歴の保持（90日間）
- 失敗時のリトライ機能とアラート通知

## 3. 非機能要件

| 項目 | 要件 |
|------|------|
| レスポンス時間 | 画面遷移 500ms以内 |
| 可用性 | 99.9% (月間ダウンタイム 43分以内) |
| 同時接続数 | 100ユーザー |
| データ保持期間 | 3年間 |

## 4. 技術スタック

- **フロントエンド**: Next.js 15, React 19, Tailwind CSS
- **バックエンド**: Node.js, Prisma
- **データベース**: PostgreSQL
- **インフラ**: Vercel, AWS S3

## 5. スケジュール

1. 要件定義・設計: 2週間
2. 開発フェーズ1 (MVP): 4週間
3. テスト・QA: 2週間
4. リリース・運用開始: 1週間`;

const samplePreviewSections = [
  { tag: "h1", text: "プロジェクト要件定義書" },
  { tag: "h2", text: "1. 概要" },
  {
    tag: "p",
    text: "本プロジェクトは、社内業務効率化を目的とした管理ダッシュボードの開発である。主要なSNSプラットフォームのデータ統合、タスク管理、レポート生成機能を提供する。",
  },
  { tag: "h2", text: "2. 機能要件" },
  { tag: "h3", text: "2.1 ダッシュボード" },
  { tag: "li", text: "リアルタイムKPI表示" },
  { tag: "li", text: "グラフ・チャートによるデータ可視化" },
  { tag: "li", text: "カスタマイズ可能なウィジェット配置" },
  { tag: "h3", text: "2.2 SNS分析" },
  { tag: "li", text: "Twitter/X, Instagram, YouTubeのデータ連携" },
  { tag: "li", text: "フォロワー推移・エンゲージメント率の追跡" },
  { tag: "li", text: "投稿パフォーマンスの比較分析" },
  { tag: "h3", text: "2.3 ジョブ管理" },
  { tag: "li", text: "バックグラウンドジョブの監視" },
  { tag: "li", text: "実行履歴の保持（90日間）" },
  { tag: "li", text: "失敗時のリトライ機能とアラート通知" },
  { tag: "h2", text: "3. 非機能要件" },
  { tag: "h2", text: "4. 技術スタック" },
  { tag: "h2", text: "5. スケジュール" },
];

const metadata = [
  { label: "作成者", value: "田中 太郎" },
  { label: "作成日", value: "2026-04-01" },
  { label: "最終更新", value: "2026-04-09" },
  { label: "バージョン", value: "v1.3" },
  { label: "ステータス", value: "レビュー中" },
];

const tags = ["管理ダッシュボード", "SNS連携", "業務効率化", "Next.js"];

export default function RequirementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-violet-400" />
        <h1 className="text-2xl font-bold tracking-tight">要件定義</h1>
      </div>

      {/* Metadata Bar */}
      <Card>
        <CardContent className="pt-1">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {metadata.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {item.label}:
                </span>
                <span className="text-xs font-medium">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] text-violet-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor and Preview Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-muted-foreground" />
              エディタ
            </CardTitle>
            <CardDescription>Markdown形式で記述</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-[600px] w-full rounded-md border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed text-muted-foreground overflow-auto whitespace-pre-wrap">
              {sampleMarkdown}
            </div>
          </CardContent>
          <CardFooter className="gap-3">
            <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Save className="h-3.5 w-3.5" />
              保存
            </button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Clock className="h-3 w-3" />
              最終保存: 5分前
            </div>
          </CardFooter>
        </Card>

        {/* Preview */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              プレビュー
            </CardTitle>
            <CardDescription>レンダリング結果</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-[600px] w-full rounded-md border border-border bg-muted/10 p-4 overflow-auto space-y-3">
              {samplePreviewSections.map((section, i) => {
                switch (section.tag) {
                  case "h1":
                    return (
                      <h1
                        key={i}
                        className="text-xl font-bold border-b border-border/50 pb-2"
                      >
                        {section.text}
                      </h1>
                    );
                  case "h2":
                    return (
                      <h2
                        key={i}
                        className="text-lg font-semibold mt-4 text-foreground/90"
                      >
                        {section.text}
                      </h2>
                    );
                  case "h3":
                    return (
                      <h3
                        key={i}
                        className="text-base font-medium mt-2 text-foreground/80"
                      >
                        {section.text}
                      </h3>
                    );
                  case "p":
                    return (
                      <p
                        key={i}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {section.text}
                      </p>
                    );
                  case "li":
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground pl-4"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                        {section.text}
                      </div>
                    );
                  default:
                    return null;
                }
              })}

              {/* Table Preview */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border border-border/50">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="border border-border/50 px-3 py-1.5 text-left font-medium">
                        項目
                      </th>
                      <th className="border border-border/50 px-3 py-1.5 text-left font-medium">
                        要件
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr>
                      <td className="border border-border/50 px-3 py-1.5">
                        レスポンス時間
                      </td>
                      <td className="border border-border/50 px-3 py-1.5">
                        画面遷移 500ms以内
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-border/50 px-3 py-1.5">
                        可用性
                      </td>
                      <td className="border border-border/50 px-3 py-1.5">
                        99.9%
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-border/50 px-3 py-1.5">
                        同時接続数
                      </td>
                      <td className="border border-border/50 px-3 py-1.5">
                        100ユーザー
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-border/50 px-3 py-1.5">
                        データ保持期間
                      </td>
                      <td className="border border-border/50 px-3 py-1.5">
                        3年間
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="text-lg font-semibold mt-4 text-foreground/90">
                4. 技術スタック
              </h2>
              <div className="space-y-1 pl-4 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground/80">フロントエンド</strong>
                  : Next.js 15, React 19, Tailwind CSS
                </p>
                <p>
                  <strong className="text-foreground/80">バックエンド</strong>:
                  Node.js, Prisma
                </p>
                <p>
                  <strong className="text-foreground/80">データベース</strong>:
                  PostgreSQL
                </p>
                <p>
                  <strong className="text-foreground/80">インフラ</strong>:
                  Vercel, AWS S3
                </p>
              </div>

              <h2 className="text-lg font-semibold mt-4 text-foreground/90">
                5. スケジュール
              </h2>
              <div className="space-y-1 pl-4 text-sm text-muted-foreground">
                <p>1. 要件定義・設計: 2週間</p>
                <p>2. 開発フェーズ1 (MVP): 4週間</p>
                <p>3. テスト・QA: 2週間</p>
                <p>4. リリース・運用開始: 1週間</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              プレビューはリアルタイムで更新されます
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
