import {
  ImageIcon,
  Layout,
  Type,
  Palette,
  Eye,
  Download,
  Copy,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const templates = [
  {
    id: 1,
    name: "ブログ記事",
    description: "テキスト中央配置、グラデーション背景",
    gradient: "from-indigo-600 to-purple-600",
    selected: true,
  },
  {
    id: 2,
    name: "イベント告知",
    description: "日付・タイトル・場所を配置",
    gradient: "from-emerald-600 to-teal-600",
    selected: false,
  },
  {
    id: 3,
    name: "プロダクト紹介",
    description: "ロゴ+キャッチコピー構成",
    gradient: "from-orange-600 to-red-600",
    selected: false,
  },
  {
    id: 4,
    name: "技術記事",
    description: "コードスニペット風デザイン",
    gradient: "from-gray-700 to-gray-900",
    selected: false,
  },
];

export default function OgpPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ImageIcon className="h-7 w-7 text-pink-400" />
        <h1 className="text-2xl font-bold tracking-tight">OGP画像</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                プレビュー
              </CardTitle>
              <CardDescription>1200 x 630px (OG Image推奨サイズ)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* OGP Preview */}
              <div className="aspect-[1200/630] w-full rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 text-center space-y-4">
                  <p className="text-white/70 text-xs tracking-widest uppercase">
                    Zoltraak Blog
                  </p>
                  <h2 className="text-white text-xl md:text-2xl lg:text-3xl font-bold leading-tight">
                    Next.jsで始める
                    <br />
                    モダンWebアプリケーション開発
                  </h2>
                  <p className="text-white/60 text-sm">2026年4月9日</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-3">
              <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Download className="h-3.5 w-3.5" />
                ダウンロード
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                <Copy className="h-3.5 w-3.5" />
                URLをコピー
              </button>
            </CardFooter>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                テキスト設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  タイトル
                </label>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                  Next.jsで始めるモダンWebアプリケーション開発
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  サブタイトル
                </label>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                  Zoltraak Blog
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    日付
                  </label>
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    2026年4月9日
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    フォントサイズ
                  </label>
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    32px
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                テンプレート
              </CardTitle>
              <CardDescription>デザインテンプレートを選択</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    tmpl.selected
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <div
                    className={`aspect-[1200/630] w-full rounded-md bg-gradient-to-br ${tmpl.gradient} mb-2 flex items-center justify-center`}
                  >
                    <Layout className="h-6 w-6 text-white/40" />
                  </div>
                  <p className="text-sm font-medium">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tmpl.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>カラーパレット</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[
                  "bg-indigo-500",
                  "bg-purple-500",
                  "bg-pink-500",
                  "bg-red-500",
                  "bg-orange-500",
                  "bg-amber-500",
                  "bg-emerald-500",
                  "bg-teal-500",
                  "bg-sky-500",
                  "bg-blue-500",
                  "bg-gray-700",
                  "bg-gray-900",
                ].map((color) => (
                  <div
                    key={color}
                    className={`aspect-square rounded-md ${color} cursor-pointer ring-offset-2 ring-offset-background hover:ring-2 hover:ring-primary transition-all`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
