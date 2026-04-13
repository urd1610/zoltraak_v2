import {
  BarChart3,
  Hash,
  Camera,
  Play,
  TrendingUp,
  Users,
  MessageCircle,
  FileText,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const platforms = [
  {
    name: "Twitter / X",
    icon: Hash,
    color: "bg-sky-500",
    followers: "12,480",
    followersChange: "+3.2%",
    engagement: "4.7%",
    engagementChange: "+0.8%",
    posts: 342,
    postsThisWeek: 18,
    barData: [65, 45, 80, 55, 70, 90, 75],
  },
  {
    name: "Instagram",
    icon: Camera,
    color: "bg-pink-500",
    followers: "28,930",
    followersChange: "+5.1%",
    engagement: "6.2%",
    engagementChange: "+1.2%",
    posts: 215,
    postsThisWeek: 7,
    barData: [40, 60, 55, 75, 85, 50, 70],
  },
  {
    name: "YouTube",
    icon: Play,
    color: "bg-red-500",
    followers: "5,120",
    followersChange: "+1.8%",
    engagement: "8.4%",
    engagementChange: "+2.1%",
    posts: 48,
    postsThisWeek: 2,
    barData: [30, 50, 45, 60, 40, 70, 85],
  },
];

const days = ["月", "火", "水", "木", "金", "土", "日"];

export default function SnsAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-indigo-400" />
        <h1 className="text-2xl font-bold tracking-tight">SNS分析</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <Card key={platform.name}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div
                    className={`${platform.color} rounded-md p-1.5 text-white`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle>{platform.name}</CardTitle>
                </div>
                <CardDescription>過去7日間のパフォーマンス</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* KPI Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      フォロワー
                    </div>
                    <p className="text-lg font-semibold">
                      {platform.followers}
                    </p>
                    <p className="text-xs text-emerald-400">
                      {platform.followersChange}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      エンゲージ
                    </div>
                    <p className="text-lg font-semibold">
                      {platform.engagement}
                    </p>
                    <p className="text-xs text-emerald-400">
                      {platform.engagementChange}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      投稿数
                    </div>
                    <p className="text-lg font-semibold">{platform.posts}</p>
                    <p className="text-xs text-muted-foreground">
                      今週 {platform.postsThisWeek}件
                    </p>
                  </div>
                </div>

                {/* Bar Chart */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    日別インプレッション
                  </p>
                  <div className="flex items-end gap-1.5 h-24">
                    {platform.barData.map((value, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className={`w-full rounded-sm ${platform.color} opacity-80 transition-all`}
                          style={{ height: `${value}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {days[i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            最近のエンゲージメント
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                platform: "Twitter / X",
                content:
                  "新機能リリースのお知らせが1,240件のいいねを獲得しました",
                time: "2時間前",
              },
              {
                platform: "Instagram",
                content:
                  "チームビルディングの写真投稿がフォロワーに好評です（コメント86件）",
                time: "5時間前",
              },
              {
                platform: "YouTube",
                content:
                  "チュートリアル動画の視聴回数が3,000回を突破しました",
                time: "1日前",
              },
              {
                platform: "Twitter / X",
                content:
                  "技術ブログのシェアが420件のリツイートを獲得しました",
                time: "2日前",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 rounded-md border border-border/50 p-3"
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.platform}
                  </p>
                  <p className="text-sm">{item.content}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
