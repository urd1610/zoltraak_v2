import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CalendarEvent {
  day: number;
  title: string;
  color: string;
}

const events: CalendarEvent[] = [
  { day: 2, title: "定例ミーティング", color: "bg-blue-500" },
  { day: 5, title: "スプリントレビュー", color: "bg-emerald-500" },
  { day: 7, title: "1on1", color: "bg-violet-500" },
  { day: 9, title: "プロジェクト締切", color: "bg-red-500" },
  { day: 9, title: "定例ミーティング", color: "bg-blue-500" },
  { day: 12, title: "全体会議", color: "bg-amber-500" },
  { day: 14, title: "1on1", color: "bg-violet-500" },
  { day: 15, title: "リリース日", color: "bg-emerald-500" },
  { day: 16, title: "定例ミーティング", color: "bg-blue-500" },
  { day: 19, title: "スプリント計画", color: "bg-cyan-500" },
  { day: 21, title: "1on1", color: "bg-violet-500" },
  { day: 23, title: "定例ミーティング", color: "bg-blue-500" },
  { day: 25, title: "月末レビュー", color: "bg-amber-500" },
  { day: 28, title: "1on1", color: "bg-violet-500" },
  { day: 30, title: "定例ミーティング", color: "bg-blue-500" },
];

const daysOfWeek = ["月", "火", "水", "木", "金", "土", "日"];

function generateCalendarDays(): (number | null)[] {
  // April 2026 starts on Wednesday (index 2), 30 days
  const startDayOfWeek = 2;
  const totalDays = 30;
  const days: (number | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(d);
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export default function SchedulePage() {
  const calendarDays = generateCalendarDays();
  const today = 9;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">スケジュール</h1>
            <p className="text-sm text-muted-foreground">
              月間スケジュールを管理します
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          予定を追加
        </button>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>2026年 4月</CardTitle>
            <div className="flex items-center gap-2">
              <button className="rounded-md p-1.5 transition-colors hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
                今日
              </button>
              <button className="rounded-md p-1.5 transition-colors hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-border pb-2 mb-1">
            {daysOfWeek.map((day, i) => (
              <div
                key={day}
                className={`text-center text-xs font-medium ${
                  i >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEvents = day
                ? events.filter((e) => e.day === day)
                : [];
              const isToday = day === today;
              const colIndex = i % 7;
              const isWeekend = colIndex >= 5;

              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r border-border/50 p-1.5 transition-colors hover:bg-muted/30 ${
                    isWeekend ? "bg-muted/10" : ""
                  } ${colIndex === 0 ? "border-l border-border/50" : ""}`}
                >
                  {day && (
                    <>
                      <div
                        className={`mb-1 flex h-6 w-6 items-center justify-center text-xs ${
                          isToday
                            ? "rounded-full bg-primary font-bold text-primary-foreground"
                            : isWeekend
                              ? "text-muted-foreground/60"
                              : "text-foreground"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.map((event, j) => (
                          <div
                            key={j}
                            className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${event.color}`}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming events */}
      <Card>
        <CardHeader>
          <CardTitle>今後の予定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events
              .filter((e) => e.day >= today)
              .slice(0, 5)
              .map((event, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                >
                  <div className={`h-2 w-2 rounded-full ${event.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      4月{event.day}日
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
