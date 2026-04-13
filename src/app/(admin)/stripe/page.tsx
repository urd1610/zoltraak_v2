"use client";

import {
  CreditCard,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const overviewCards = [
  {
    title: "月間売上",
    value: "¥1,284,500",
    change: "+12.3%",
    up: true,
    icon: DollarSign,
  },
  {
    title: "アクティブ契約数",
    value: "342",
    change: "+8 件",
    up: true,
    icon: Users,
  },
  {
    title: "平均単価",
    value: "¥3,756",
    change: "-2.1%",
    up: false,
    icon: TrendingUp,
  },
  {
    title: "解約率",
    value: "1.8%",
    change: "-0.3%",
    up: true,
    icon: CreditCard,
  },
];

const payments = [
  {
    id: "pi_3Qx9Kl2e",
    customer: "田中 太郎",
    plan: "プロプラン",
    amount: "¥9,800",
    status: "成功",
    date: "2026-04-09",
  },
  {
    id: "pi_3Qx8Jm4f",
    customer: "佐藤 花子",
    plan: "ビジネスプラン",
    amount: "¥29,800",
    status: "成功",
    date: "2026-04-08",
  },
  {
    id: "pi_3Qx7Hn3g",
    customer: "鈴木 一郎",
    plan: "スタータープラン",
    amount: "¥2,980",
    status: "失敗",
    date: "2026-04-08",
  },
  {
    id: "pi_3Qx6Gp5h",
    customer: "高橋 美咲",
    plan: "プロプラン",
    amount: "¥9,800",
    status: "成功",
    date: "2026-04-07",
  },
  {
    id: "pi_3Qx5Fq6i",
    customer: "伊藤 健太",
    plan: "ビジネスプラン",
    amount: "¥29,800",
    status: "返金",
    date: "2026-04-06",
  },
  {
    id: "pi_3Qx4Er7j",
    customer: "渡辺 さくら",
    plan: "スタータープラン",
    amount: "¥2,980",
    status: "成功",
    date: "2026-04-05",
  },
];

const statusStyle: Record<string, string> = {
  成功: "bg-green-500/20 text-green-400 ring-green-500/30",
  失敗: "bg-red-500/20 text-red-400 ring-red-500/30",
  返金: "bg-yellow-500/20 text-yellow-400 ring-yellow-500/30",
};

export default function StripePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-7 w-7 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stripe連携</h1>
          <p className="text-sm text-muted-foreground">
            サブスクリプションと決済の管理
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader>
                <CardDescription className="flex items-center justify-between">
                  {card.title}
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardDescription>
                <CardTitle className="text-2xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    card.up ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {card.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {card.change}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">
                  前月比
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>決済履歴</CardTitle>
          <CardDescription>直近の決済トランザクション</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">ID</th>
                  <th className="pb-3 pr-4 font-medium">顧客</th>
                  <th className="pb-3 pr-4 font-medium">プラン</th>
                  <th className="pb-3 pr-4 font-medium">金額</th>
                  <th className="pb-3 pr-4 font-medium">ステータス</th>
                  <th className="pb-3 font-medium">日付</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {p.id}
                    </td>
                    <td className="py-3 pr-4">{p.customer}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {p.plan}
                    </td>
                    <td className="py-3 pr-4 font-medium">{p.amount}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyle[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{p.date}</td>
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
