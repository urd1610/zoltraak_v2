"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Video,
  Mail as MailIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Delivery = {
  day: number;
  title: string;
  type: "メルマガ" | "動画" | "ブログ";
  time: string;
};

const deliveries: Delivery[] = [
  { day: 1, title: "月刊ニュースレター vol.42", type: "メルマガ", time: "09:00" },
  { day: 3, title: "新機能チュートリアル動画", type: "動画", time: "12:00" },
  { day: 5, title: "SEO対策ガイド記事", type: "ブログ", time: "10:00" },
  { day: 8, title: "ユーザー事例インタビュー", type: "ブログ", time: "10:00" },
  { day: 9, title: "週次アップデート通知", type: "メルマガ", time: "09:00" },
  { day: 12, title: "製品デモウェビナー", type: "動画", time: "14:00" },
  { day: 15, title: "月中レポートメール", type: "メルマガ", time: "09:00" },
  { day: 18, title: "開発者ブログ: API v3", type: "ブログ", time: "10:00" },
  { day: 20, title: "機能紹介ショート動画", type: "動画", time: "15:00" },
  { day: 22, title: "週次アップデート通知", type: "メルマガ", time: "09:00" },
  { day: 25, title: "活用事例まとめ記事", type: "ブログ", time: "10:00" },
  { day: 28, title: "月末ダイジェストメール", type: "メルマガ", time: "18:00" },
  { day: 30, title: "来月予告ティザー動画", type: "動画", time: "12:00" },
];

const typeConfig: Record<
  Delivery["type"],
  { color: string; bg: string; icon: typeof FileText }
> = {
  メルマガ: { color: "text-blue-400", bg: "bg-blue-500/20", icon: MailIcon },
  動画: { color: "text-purple-400", bg: "bg-purple-500/20", icon: Video },
  ブログ: { color: "text-emerald-400", bg: "bg-emerald-500/20", icon: FileText },
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [year] = useState(2026);
  const [month] = useState(3); // April (0-indexed)

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = 9;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-7 w-7 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">配信カレンダー</h1>
          <p className="text-sm text-muted-foreground">
            コンテンツ配信スケジュールの管理
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(["メルマガ", "動画", "ブログ"] as const).map((type) => {
          const cfg = typeConfig[type];
          const Icon = cfg.icon;
          const count = deliveries.filter((d) => d.type === type).length;
          return (
            <Card key={type}>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                  {type}
                </CardDescription>
                <CardTitle className="text-2xl">{count} 件</CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{year}年{month + 1}月</CardTitle>
              <CardDescription>
                配信予定: {deliveries.length} 件
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-zinc-800 hover:text-zinc-100">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-zinc-800 hover:text-zinc-100">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map((wd, i) => (
              <div
                key={wd}
                className={`pb-2 text-center text-xs font-medium ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                }`}
              >
                {wd}
              </div>
            ))}
            {cells.map((day, i) => {
              const dayDeliveries = day
                ? deliveries.filter((d) => d.day === day)
                : [];
              const isToday = day === today;
              const colIndex = i % 7;
              return (
                <div
                  key={i}
                  className={`min-h-[5.5rem] rounded-lg border p-1.5 ${
                    day
                      ? "border-border/50 bg-zinc-900/50"
                      : "border-transparent"
                  } ${isToday ? "ring-2 ring-cyan-500/50" : ""}`}
                >
                  {day && (
                    <>
                      <span
                        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          isToday
                            ? "bg-cyan-500 font-bold text-white"
                            : colIndex === 0
                            ? "text-red-400"
                            : colIndex === 6
                            ? "text-blue-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayDeliveries.map((d, j) => {
                          const cfg = typeConfig[d.type];
                          return (
                            <div
                              key={j}
                              className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color}`}
                              title={`${d.time} ${d.title}`}
                            >
                              {d.title}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>今月の配信スケジュール</CardTitle>
          <CardDescription>全配信予定の一覧</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deliveries.map((d, i) => {
              const cfg = typeConfig[d.type];
              const Icon = cfg.icon;
              const isPast = d.day < today;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border border-border/50 p-3 ${
                    isPast ? "opacity-50" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className={cfg.color}>{d.type}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>{month + 1}月{d.day}日</div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {d.time}
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
