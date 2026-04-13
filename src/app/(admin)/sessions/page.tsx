import {
  Monitor,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Smartphone,
  Laptop,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type SessionStatus = "アクティブ" | "アイドル" | "切断";

interface Session {
  id: string;
  user: string;
  email: string;
  device: "desktop" | "mobile";
  browser: string;
  ip: string;
  location: string;
  status: SessionStatus;
  startedAt: string;
  lastActivity: string;
}

const statusStyles: Record<SessionStatus, { dot: string; text: string }> = {
  アクティブ: { dot: "bg-emerald-500", text: "text-emerald-500" },
  アイドル: { dot: "bg-amber-500", text: "text-amber-500" },
  切断: { dot: "bg-red-500", text: "text-red-400" },
};

const sessions: Session[] = [
  {
    id: "sess_001",
    user: "田中太郎",
    email: "tanaka@example.com",
    device: "desktop",
    browser: "Chrome 124",
    ip: "192.168.1.101",
    location: "東京",
    status: "アクティブ",
    startedAt: "09:15",
    lastActivity: "1分前",
  },
  {
    id: "sess_002",
    user: "鈴木花子",
    email: "suzuki@example.com",
    device: "desktop",
    browser: "Firefox 126",
    ip: "192.168.1.102",
    location: "大阪",
    status: "アクティブ",
    startedAt: "08:45",
    lastActivity: "3分前",
  },
  {
    id: "sess_003",
    user: "佐藤次郎",
    email: "sato@example.com",
    device: "mobile",
    browser: "Safari 18",
    ip: "10.0.0.55",
    location: "名古屋",
    status: "アイドル",
    startedAt: "10:20",
    lastActivity: "15分前",
  },
  {
    id: "sess_004",
    user: "山田美咲",
    email: "yamada@example.com",
    device: "desktop",
    browser: "Chrome 124",
    ip: "192.168.1.105",
    location: "東京",
    status: "アクティブ",
    startedAt: "07:30",
    lastActivity: "5分前",
  },
  {
    id: "sess_005",
    user: "高橋健太",
    email: "takahashi@example.com",
    device: "mobile",
    browser: "Chrome Mobile",
    ip: "10.0.0.78",
    location: "福岡",
    status: "切断",
    startedAt: "11:00",
    lastActivity: "30分前",
  },
  {
    id: "sess_006",
    user: "伊藤あかり",
    email: "ito@example.com",
    device: "desktop",
    browser: "Edge 124",
    ip: "192.168.1.110",
    location: "札幌",
    status: "アイドル",
    startedAt: "09:50",
    lastActivity: "20分前",
  },
  {
    id: "sess_007",
    user: "渡辺大輔",
    email: "watanabe@example.com",
    device: "desktop",
    browser: "Chrome 124",
    ip: "192.168.1.115",
    location: "東京",
    status: "アクティブ",
    startedAt: "08:00",
    lastActivity: "2分前",
  },
];

const summaryCards = [
  {
    label: "アクティブセッション",
    value: sessions.filter((s) => s.status === "アクティブ").length,
    icon: Wifi,
    color: "text-emerald-500",
  },
  {
    label: "アイドルセッション",
    value: sessions.filter((s) => s.status === "アイドル").length,
    icon: Monitor,
    color: "text-amber-500",
  },
  {
    label: "切断セッション",
    value: sessions.filter((s) => s.status === "切断").length,
    icon: WifiOff,
    color: "text-red-400",
  },
  {
    label: "合計セッション",
    value: sessions.length,
    icon: Globe,
    color: "text-primary",
  },
];

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              セッション管理
            </h1>
            <p className="text-sm text-muted-foreground">
              アクティブなセッションを監視・管理します
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
          <RefreshCw className="h-4 w-4" />
          更新
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} size="sm">
            <CardContent className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="ユーザー名またはIPアドレスで検索..."
              className="w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>セッション一覧</CardTitle>
          <CardDescription>
            現在のセッション {sessions.length} 件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">ユーザー</th>
                  <th className="pb-3 pr-4 font-medium">デバイス</th>
                  <th className="pb-3 pr-4 font-medium">ブラウザ</th>
                  <th className="pb-3 pr-4 font-medium">IPアドレス</th>
                  <th className="pb-3 pr-4 font-medium">場所</th>
                  <th className="pb-3 pr-4 font-medium">ステータス</th>
                  <th className="pb-3 pr-4 font-medium">開始時刻</th>
                  <th className="pb-3 pr-4 font-medium">最終操作</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const DeviceIcon =
                    session.device === "desktop" ? Laptop : Smartphone;
                  const style = statusStyles[session.status];

                  return (
                    <tr
                      key={session.id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 pr-4">
                        <div>
                          <p className="text-sm font-medium">{session.user}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                      </td>
                      <td className="py-3 pr-4 text-sm">{session.browser}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {session.ip}
                      </td>
                      <td className="py-3 pr-4 text-sm">{session.location}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                          />
                          <span className={style.text}>{session.status}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {session.startedAt}
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {session.lastActivity}
                      </td>
                      <td className="py-3">
                        <button className="rounded-md p-1 transition-colors hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
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
