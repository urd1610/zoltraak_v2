"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Pencil,
  MapPin,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ApiEvent {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  category: string;
  color: string;
  location: string;
  description: string | null;
  priority: string;
  recurrence_type: string;
  recurrence_end_date: string | null;
  recurrence_parent_id: number | null;
}

type CalendarEvent = ApiEvent;
type CalendarView = "month" | "week";

/** Build "YYYY-MM-DD" from year, month, day */
function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Check if a given date string falls within the event's date range */
function eventCoversDate(event: CalendarEvent, dateStr: string): boolean {
  return event.start_date <= dateStr && event.end_date >= dateStr;
}

/** Extract display info for an event relative to the current month */
function formatEventDateDisplay(event: CalendarEvent): string {
  const sd = event.start_date;
  const ed = event.end_date;
  if (sd === ed) {
    const d = parseInt(sd.split("-")[2]);
    const m = parseInt(sd.split("-")[1]);
    return `${m}月${d}日`;
  }
  const sm = parseInt(sd.split("-")[1]);
  const sDay = parseInt(sd.split("-")[2]);
  const em = parseInt(ed.split("-")[1]);
  const eDay = parseInt(ed.split("-")[2]);
  const sy = parseInt(sd.split("-")[0]);
  const ey = parseInt(ed.split("-")[0]);
  if (sy === ey && sm === em) {
    return `${sm}月${sDay}日 - ${eDay}日`;
  }
  if (sy === ey) {
    return `${sm}月${sDay}日 - ${em}月${eDay}日`;
  }
  return `${sy}/${sm}/${sDay} - ${ey}/${em}/${eDay}`;
}

/** Time range snippet for list rows (Japanese-style compact) */
function formatEventTimeSnippet(event: CalendarEvent): string | null {
  if (event.is_all_day) return null;
  if (event.start_time && event.end_time) {
    return `${event.start_time}〜${event.end_time}`;
  }
  if (event.start_time) return `${event.start_time}〜`;
  return null;
}

const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];

const categoryColorMap: Record<string, string> = {
  "会議": "bg-blue-500",
  "スプリント": "bg-emerald-500",
  "1on1": "bg-violet-500",
  "マイルストーン": "bg-red-500",
  "全体": "bg-amber-500",
  "休み": "bg-rose-500",
  "その他": "bg-gray-500",
};

const priorityMap: Record<string, { label: string; icon: string; color: string }> = {
  low: { label: "低", icon: "↓", color: "text-blue-500" },
  medium: { label: "中", icon: "→", color: "text-yellow-500" },
  high: { label: "高", icon: "↑", color: "text-orange-500" },
  urgent: { label: "緊急", icon: "⚡", color: "text-red-500" },
};

const categories = [
  "すべて",
  "会議",
  "スプリント",
  "1on1",
  "マイルストーン",
  "全体",
  "休み",
  "その他",
];

const recurrenceTypeMap: Record<string, string> = {
  "none": "なし",
  "daily": "毎日",
  "weekdays": "平日（月〜金）",
  "weekly": "毎週",
  "monthly": "毎月",
  "yearly": "毎年",
};

function generateCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();

  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

const TODAY_YEAR = 2026;
const TODAY_MONTH = 4;
const TODAY_DAY = 13;
const TODAY_DATE = new Date(TODAY_YEAR, TODAY_MONTH - 1, TODAY_DAY);

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekStartForMonth(year: number, month: number): Date {
  const referenceDate =
    year === TODAY_YEAR && month === TODAY_MONTH
      ? TODAY_DATE
      : new Date(year, month - 1, 1);
  return getStartOfWeek(referenceDate);
}

function getWeekRange(startDate: Date) {
  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);
  const endDate = addDays(normalizedStart, 6);
  return {
    startDate: normalizedStart,
    endDate,
    startDay: normalizedStart.getDate(),
    endDay: endDate.getDate(),
    startMonth: normalizedStart.getMonth() + 1,
    endMonth: endDate.getMonth() + 1,
  };
}

export default function SchedulePage() {
  const [currentYear, setCurrentYear] = useState(TODAY_YEAR);
  const [currentMonth, setCurrentMonth] = useState(TODAY_MONTH);
  const [viewMode, setViewMode] = useState<CalendarView>("month");
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    getWeekStartForMonth(TODAY_YEAR, TODAY_MONTH)
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    scope: "single" | "all" | "future";
    label: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    start_date: "",
    end_date: "",
    is_all_day: false,
    start_time: "",
    end_time: "",
    category: "会議",
    location: "",
    priority: "medium",
    recurrence_type: "none" as string,
    recurrence_end_date: "",
  });

  const calendarDays = generateCalendarDays(currentYear, currentMonth);
  const monthRangeStart = new Date(currentYear, currentMonth - 1, 1);
  const monthRangeEnd = new Date(currentYear, currentMonth, 0);
  const weekRange = getWeekRange(currentWeekStart);
  const visibleRangeStart =
    monthRangeStart.getTime() <= weekRange.startDate.getTime()
      ? monthRangeStart
      : weekRange.startDate;
  const visibleRangeEnd =
    monthRangeEnd.getTime() >= weekRange.endDate.getTime()
      ? monthRangeEnd
      : weekRange.endDate;
  const visibleRangeStartStr = toDateStr(
    visibleRangeStart.getFullYear(),
    visibleRangeStart.getMonth() + 1,
    visibleRangeStart.getDate()
  );
  const visibleRangeEndStr = toDateStr(
    visibleRangeEnd.getFullYear(),
    visibleRangeEnd.getMonth() + 1,
    visibleRangeEnd.getDate()
  );
  const scheduleQuery = new URLSearchParams({
    start: visibleRangeStartStr,
    end: visibleRangeEndStr,
  }).toString();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/schedule?${scheduleQuery}`);
        const data = await response.json();
        setEvents(data.events as CalendarEvent[]);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
        setHasFetchedOnce(true);
      }
    };

    fetchEvents();
  }, [scheduleQuery]);

  const filteredEvents =
    selectedCategory === "すべて"
      ? events
      : events.filter((e) => e.category === selectedCategory);

  const isCurrentMonth = currentYear === TODAY_YEAR && currentMonth === TODAY_MONTH;
  const todayDay = isCurrentMonth ? TODAY_DAY : null;

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    setShowDeleteOptions(false);
    setDeleteConfirm(null);
  };

  const handleAddEventClick = () => {
    setShowAddModal(true);
    setShowEditModal(false);
    setFormData({
      title: "",
      start_date: "",
      end_date: "",
      is_all_day: false,
      start_time: "",
      end_time: "",
      category: "会議",
      location: "",
      priority: "medium",
      recurrence_type: "none",
      recurrence_end_date: "",
    });
  };

  const handleDayDoubleClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setShowAddModal(true);
    setShowEditModal(false);
    setFormData({
      title: "",
      start_date: dateStr,
      end_date: dateStr,
      is_all_day: false,
      start_time: "",
      end_time: "",
      category: "会議",
      location: "",
      priority: "medium",
      recurrence_type: "none",
      recurrence_end_date: "",
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleEditEventClick = (event: CalendarEvent) => {
    setFormData({
      title: event.title,
      start_date: event.start_date,
      end_date: event.end_date,
      is_all_day: event.is_all_day,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      category: event.category,
      location: event.location,
      priority: event.priority || "medium",
      recurrence_type: event.recurrence_type,
      recurrence_end_date: event.recurrence_end_date || "",
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleCategoryChange = (category: string) => {
    setFormData({ ...formData, category });
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const color = categoryColorMap[formData.category] || "bg-gray-500";
      const body: Record<string, unknown> = {
        title: formData.title,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_all_day: formData.is_all_day,
        start_time: formData.is_all_day ? null : formData.start_time,
        end_time: formData.is_all_day ? null : formData.end_time,
        category: formData.category,
        color,
        location: formData.location,
        priority: formData.priority,
        recurrence_type: formData.recurrence_type,
      };

      if (formData.recurrence_type !== "none") {
        body.recurrence_end_date = formData.recurrence_end_date;
      }

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const response2 = await fetch(`/api/schedule?${scheduleQuery}`);
        const data = await response2.json();
        setEvents(data.events as CalendarEvent[]);
        setShowAddModal(false);
      }
    } catch (error) {
      console.error("Failed to add event:", error);
    }
  };

  const handleSubmitEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      const color = categoryColorMap[formData.category] || "bg-gray-500";
      const body: Record<string, unknown> = {
        id: selectedEvent.id,
        title: formData.title,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_all_day: formData.is_all_day,
        start_time: formData.is_all_day ? null : formData.start_time,
        end_time: formData.is_all_day ? null : formData.end_time,
        category: formData.category,
        color,
        location: formData.location,
        priority: formData.priority,
        recurrence_type: formData.recurrence_type,
      };

      if (formData.recurrence_type !== "none") {
        body.recurrence_end_date = formData.recurrence_end_date;
      }

      const response = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const response2 = await fetch(`/api/schedule?${scheduleQuery}`);
        const data = await response2.json();
        setEvents(data.events as CalendarEvent[]);
        setShowEditModal(false);
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("Failed to edit event:", error);
    }
  };

  const handleDeleteEvent = async (eventId: number, scope: "single" | "all" | "future" = "single") => {
    try {
      const response = await fetch(`/api/schedule?id=${eventId}&scope=${scope}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const response2 = await fetch(`/api/schedule?${scheduleQuery}`);
        const data = await response2.json();
        setEvents(data.events as CalendarEvent[]);
        setSelectedEvent(null);
        setShowDeleteOptions(false);
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
      setCurrentWeekStart(getWeekStartForMonth(currentYear - 1, 12));
    } else {
      const nextMonth = currentMonth - 1;
      setCurrentMonth(nextMonth);
      setCurrentWeekStart(getWeekStartForMonth(currentYear, nextMonth));
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
      setCurrentWeekStart(getWeekStartForMonth(currentYear + 1, 1));
    } else {
      const nextMonth = currentMonth + 1;
      setCurrentMonth(nextMonth);
      setCurrentWeekStart(getWeekStartForMonth(currentYear, nextMonth));
    }
  };

  const handleTodayClick = () => {
    setCurrentYear(TODAY_YEAR);
    setCurrentMonth(TODAY_MONTH);
    setCurrentWeekStart(getWeekStartForMonth(TODAY_YEAR, TODAY_MONTH));
  };

  const handlePreviousWeek = () => {
    const nextWeekStart = addDays(currentWeekStart, -7);
    setCurrentWeekStart(nextWeekStart);
    setCurrentYear(nextWeekStart.getFullYear());
    setCurrentMonth(nextWeekStart.getMonth() + 1);
  };

  const handleNextWeek = () => {
    const nextWeekStart = addDays(currentWeekStart, 7);
    setCurrentWeekStart(nextWeekStart);
    setCurrentYear(nextWeekStart.getFullYear());
    setCurrentMonth(nextWeekStart.getMonth() + 1);
  };

  const handleCurrentWeekClick = () => {
    setCurrentWeekStart(getStartOfWeek(TODAY_DATE));
    setCurrentYear(TODAY_YEAR);
    setCurrentMonth(TODAY_MONTH);
  };

  if (!hasFetchedOnce && loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">スケジュール</h1>
              <p className="text-sm text-muted-foreground">
                月間・週間スケジュールを管理します
              </p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">スケジュール</h1>
            <p className="text-sm text-muted-foreground">
              月間・週間スケジュールを管理します
            </p>
          </div>
        </div>
        <button
          onClick={handleAddEventClick}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          予定を追加
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as CalendarView)}>
        <TabsList>
          <TabsTrigger value="month">月間</TabsTrigger>
          <TabsTrigger value="week">週間</TabsTrigger>
        </TabsList>
        {loading && hasFetchedOnce && (
          <p className="text-xs text-muted-foreground">表示を更新中...</p>
        )}

        {/* Month Tab */}
        <TabsContent value="month">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentYear}年 {currentMonth}月</CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousMonth}
                    className="rounded-md p-1.5 transition-colors hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleTodayClick}
                    className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    今日
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="rounded-md p-1.5 transition-colors hover:bg-muted"
                  >
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
                      i === 0 || i === 6 ? "text-muted-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayFilteredEvents = day
                    ? filteredEvents.filter((e) => eventCoversDate(e, toDateStr(currentYear, currentMonth, day)))
                    : [];
                  const isToday = isCurrentMonth && day === todayDay;
                  const colIndex = i % 7;
                  const isWeekend = colIndex === 0 || colIndex === 6;

                  return (
                    <div
                      key={i}
                      onDoubleClick={() => day && handleDayDoubleClick(day)}
                      className={`min-h-[100px] border-b border-r border-border/50 p-1.5 transition-colors hover:bg-muted/30 ${
                        isWeekend ? "bg-muted/10" : ""
                      } ${colIndex === 0 ? "border-l border-border/50" : ""} ${day ? "cursor-pointer" : ""}`}
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
                            {dayFilteredEvents.map((event) => {
                              const pi = priorityMap[event.priority];
                              return (
                                <button
                                  key={event.id}
                                  onClick={() => handleEventClick(event)}
                                  className={`w-full flex items-center gap-0.5 truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${event.color} transition-opacity hover:opacity-80 text-left ${event.priority === "urgent" ? "ring-1 ring-red-400" : ""}`}
                                >
                                  {pi && event.priority !== "medium" && (
                                    <span className="shrink-0 opacity-90">{pi.icon}</span>
                                  )}
                                  <span className="truncate">{event.title}</span>
                                </button>
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
        </TabsContent>

        {/* Week Tab */}
        <TabsContent value="week">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {currentYear}年 {weekRange.startMonth}月{weekRange.startDay}日 - {weekRange.endMonth}月{weekRange.endDay}日
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousWeek}
                    className="rounded-md p-1.5 transition-colors hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCurrentWeekClick}
                    className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    今週
                  </button>
                  <button
                    onClick={handleNextWeek}
                    className="rounded-md p-1.5 transition-colors hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-full">
                  {/* Time column */}
                  <div className="flex-shrink-0 w-16">
                    <div className="h-12" />
                    {Array.from({ length: 10 }).map((_, i) => {
                      const hour = 9 + i;
                      return (
                        <div
                          key={hour}
                          className="h-16 border-b border-border text-xs font-medium text-muted-foreground text-right pr-2 py-1"
                        >
                          {String(hour).padStart(2, "0")}:00
                        </div>
                      );
                    })}
                  </div>

                  {/* Days columns */}
                  {Array.from({ length: 7 }).map((_, dayOffset) => {
                    const date = new Date(weekRange.startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
                    const day = date.getDate();
                    const month = date.getMonth() + 1;
                    const dayNameIndex = date.getDay();
                    const dayName = daysOfWeek[dayNameIndex];
                    const dateStr = toDateStr(date.getFullYear(), month, day);
                    const dayEvents = filteredEvents.filter((e) => eventCoversDate(e, dateStr));

                    return (
                      <div
                        key={dayOffset}
                        className="flex-1 min-w-max border-l border-border"
                      >
                        <div className="h-12 border-b border-border p-2 text-center">
                          <div className="text-sm font-medium">{month}月{day}日</div>
                          <div className="text-xs text-muted-foreground">
                            {dayName}
                          </div>
                        </div>

                        <div className="relative">
                          {Array.from({ length: 10 }).map((_, i) => {
                            const hour = 9 + i;
                            return (
                              <div
                                key={hour}
                                className="h-16 border-b border-border/50"
                              />
                            );
                          })}

                          {/* Events positioned absolutely */}
                          {dayEvents.map((event) => {
                            const pi = priorityMap[event.priority];
                            const urgentRing = event.priority === "urgent" ? "ring-1 ring-red-400" : "";
                            const icon = pi && event.priority !== "medium" ? pi.icon : null;
                            if (event.is_all_day || !event.start_time) {
                              return (
                                <button
                                  key={event.id}
                                  onClick={() => handleEventClick(event)}
                                  className={`absolute left-1 right-1 rounded px-1.5 py-1 text-xs font-medium text-white ${event.color} transition-opacity hover:opacity-80 ${urgentRing}`}
                                  style={{ top: "4px", height: "24px" }}
                                >
                                  <div className="flex items-center gap-0.5 truncate text-left">
                                    {icon && <span className="shrink-0 opacity-90">{icon}</span>}
                                    <span className="truncate">{event.title}（終日）</span>
                                  </div>
                                </button>
                              );
                            }
                            const [hours] = event.start_time.split(":").map(Number);
                            const offsetFromNine = hours - 9;
                            const topOffset = offsetFromNine * 64;

                            return (
                              <button
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className={`absolute left-1 right-1 rounded px-1.5 py-1 text-xs font-medium text-white ${event.color} transition-opacity hover:opacity-80 ${urgentRing}`}
                                style={{
                                  top: `${48 + topOffset}px`,
                                  height: "40px",
                                }}
                              >
                                <div className="flex items-center gap-0.5 truncate text-left">
                                  {icon && <span className="shrink-0 opacity-90">{icon}</span>}
                                  <span className="truncate">{event.title}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upcoming events */}
      <Card>
        <CardHeader>
          <CardTitle>今後の予定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEvents
              .filter((e) => {
                const todayStr = isCurrentMonth && todayDay
                  ? toDateStr(currentYear, currentMonth, todayDay)
                  : toDateStr(currentYear, currentMonth, 1);
                return e.end_date >= todayStr;
              })
              .sort((a, b) => {
                const byDate = a.start_date.localeCompare(b.start_date);
                if (byDate !== 0) return byDate;
                const ta = a.start_time || "";
                const tb = b.start_time || "";
                return ta.localeCompare(tb);
              })
              .slice(0, 5)
              .map((event) => {
                const dateDisplay = formatEventDateDisplay(event);
                const timeSnippet = formatEventTimeSnippet(event);
                const loc = event.location?.trim();
                return (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${event.color}`} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium leading-snug truncate">{event.title}</p>
                        {event.priority !== "medium" && (
                          <span className={`shrink-0 text-xs font-semibold ${priorityMap[event.priority]?.color || ""}`}>
                            {priorityMap[event.priority]?.icon}{priorityMap[event.priority]?.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{dateDisplay}</span>
                        {timeSnippet && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                            {timeSnippet}
                          </span>
                        )}
                        {event.is_all_day && (
                          <span className="rounded bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                            終日
                          </span>
                        )}
                      </div>
                      {loc ? (
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80"
                            aria-hidden
                          />
                          <span className="min-w-0 leading-snug break-words">{loc}</span>
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Modal */}
      {selectedEvent && !showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex-1">
                <CardTitle>{selectedEvent.title}</CardTitle>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-md p-1.5 transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">日付</p>
                <p className="text-sm font-medium">
                  {formatEventDateDisplay(selectedEvent)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">カテゴリー</p>
                <Badge variant="secondary">{selectedEvent.category}</Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">重要度</p>
                <p className="text-sm font-medium">
                  <span className={priorityMap[selectedEvent.priority]?.color || "text-yellow-500"}>
                    {priorityMap[selectedEvent.priority]?.icon || "→"}{" "}
                    {priorityMap[selectedEvent.priority]?.label || "中"}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">時間</p>
                <p className="text-sm font-medium">
                  {selectedEvent.is_all_day
                    ? "終日"
                    : `${selectedEvent.start_time} - ${selectedEvent.end_time}`}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">場所</p>
                <p className="text-sm font-medium">{selectedEvent.location}</p>
              </div>

              {selectedEvent.recurrence_type !== "none" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">繰り返し</p>
                  <p className="text-sm font-medium">
                    {recurrenceTypeMap[selectedEvent.recurrence_type] || selectedEvent.recurrence_type}
                  </p>
                  {selectedEvent.recurrence_end_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      終了: {selectedEvent.recurrence_end_date}
                    </p>
                  )}
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">説明</p>
                  <p className="text-sm font-medium">{selectedEvent.description}</p>
                </div>
              )}

              {/* Default action buttons */}
              {!showDeleteOptions && !deleteConfirm && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    閉じる
                  </button>
                  <button
                    onClick={() => handleEditEventClick(selectedEvent)}
                    className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    編集
                  </button>
                  {selectedEvent.recurrence_type !== "none" ? (
                    <button
                      onClick={() => setShowDeleteOptions(true)}
                      className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setDeleteConfirm({ scope: "single", label: "この予定を削除しますか？" })
                      }
                      className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Recurring delete options */}
              {showDeleteOptions && !deleteConfirm && (
                <div className="flex flex-col gap-2 pt-2">
                  <p className="text-sm font-medium text-muted-foreground">削除方法を選択：</p>
                  <button
                    onClick={() =>
                      setDeleteConfirm({ scope: "single", label: "この予定のみ削除しますか？" })
                    }
                    className="w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                  >
                    この予定のみ削除
                  </button>
                  <button
                    onClick={() =>
                      setDeleteConfirm({ scope: "future", label: "この予定以降のすべての繰り返しを削除しますか？" })
                    }
                    className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
                  >
                    この予定以降を削除
                  </button>
                  <button
                    onClick={() =>
                      setDeleteConfirm({ scope: "all", label: "すべての繰り返しを削除しますか？" })
                    }
                    className="w-full rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                  >
                    すべての繰り返しを削除
                  </button>
                  <button
                    onClick={() => setShowDeleteOptions(false)}
                    className="w-full rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    キャンセル
                  </button>
                </div>
              )}

              {/* Delete confirmation */}
              {deleteConfirm && (
                <div className="flex flex-col gap-3 pt-2 border-t border-border">
                  <p className="text-sm font-medium text-center pt-2">
                    {deleteConfirm.label}
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    この操作は取り消せません
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDeleteConfirm(null);
                        setShowDeleteOptions(false);
                      }}
                      className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id, deleteConfirm.scope)}
                      className="flex-1 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                    >
                      削除する
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && !showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex-1">
                <CardTitle>予定を追加</CardTitle>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="rounded-md p-1.5 transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitEvent} className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="予定のタイトル"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="add-all-day"
                    checked={formData.is_all_day}
                    onChange={(e) =>
                      setFormData({ ...formData, is_all_day: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="add-all-day" className="text-sm font-medium">
                    終日
                  </label>
                </div>

                {!formData.is_all_day && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        開始時刻
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_time: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        終了時刻
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) =>
                          setFormData({ ...formData, end_time: e.target.value })
                        }
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    カテゴリー
                  </label>
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 shrink-0 rounded-full ${categoryColorMap[formData.category] || "bg-gray-500"}`} />
                    <select
                      value={formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="会議">会議</option>
                      <option value="スプリント">スプリント</option>
                      <option value="1on1">1on1</option>
                      <option value="マイルストーン">マイルストーン</option>
                      <option value="全体">全体</option>
                      <option value="休み">休み</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    重要度
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-base ${priorityMap[formData.priority]?.color || "text-yellow-500"}`}>
                      {priorityMap[formData.priority]?.icon || "→"}
                    </span>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                      <option value="urgent">緊急</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    場所
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="会議室または場所（任意）"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    繰り返し
                  </label>
                  <select
                    value={formData.recurrence_type}
                    onChange={(e) =>
                      setFormData({ ...formData, recurrence_type: e.target.value })
                    }
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="none">なし</option>
                    <option value="daily">毎日</option>
                    <option value="weekdays">平日のみ（月〜金）</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                    <option value="yearly">毎年</option>
                  </select>
                </div>

                {formData.recurrence_type !== "none" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      繰り返し終了日
                    </label>
                    <input
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, recurrence_end_date: e.target.value })
                      }
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    追加
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex-1">
                <CardTitle>予定を編集</CardTitle>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="rounded-md p-1.5 transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitEditEvent} className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="予定のタイトル"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-all-day"
                    checked={formData.is_all_day}
                    onChange={(e) =>
                      setFormData({ ...formData, is_all_day: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="edit-all-day" className="text-sm font-medium">
                    終日
                  </label>
                </div>

                {!formData.is_all_day && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        開始時刻
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_time: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        終了時刻
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) =>
                          setFormData({ ...formData, end_time: e.target.value })
                        }
                        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    カテゴリー
                  </label>
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 shrink-0 rounded-full ${categoryColorMap[formData.category] || "bg-gray-500"}`} />
                    <select
                      value={formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="会議">会議</option>
                      <option value="スプリント">スプリント</option>
                      <option value="1on1">1on1</option>
                      <option value="マイルストーン">マイルストーン</option>
                      <option value="全体">全体</option>
                      <option value="休み">休み</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    重要度
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-base ${priorityMap[formData.priority]?.color || "text-yellow-500"}`}>
                      {priorityMap[formData.priority]?.icon || "→"}
                    </span>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                      <option value="urgent">緊急</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    場所
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="会議室または場所（任意）"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    繰り返し
                  </label>
                  <select
                    value={formData.recurrence_type}
                    onChange={(e) =>
                      setFormData({ ...formData, recurrence_type: e.target.value })
                    }
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="none">なし</option>
                    <option value="daily">毎日</option>
                    <option value="weekdays">平日のみ（月〜金）</option>
                    <option value="weekly">毎週</option>
                    <option value="monthly">毎月</option>
                    <option value="yearly">毎年</option>
                  </select>
                </div>

                {formData.recurrence_type !== "none" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      繰り返し終了日
                    </label>
                    <input
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, recurrence_end_date: e.target.value })
                      }
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    保存
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
