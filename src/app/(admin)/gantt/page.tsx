import {
  GanttChart,
  Plus,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  Settings2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ViewMode = "日" | "週" | "月";

interface GanttTask {
  id: string;
  name: string;
  startDay: number;
  duration: number;
  progress: number;
  color: string;
  isGroup?: boolean;
  children?: GanttTask[];
}

const projects: GanttTask[] = [
  {
    id: "p1",
    name: "第1回 全般AI活用技能",
    startDay: 1,
    duration: 28,
    progress: 65,
    color: "bg-blue-500",
    isGroup: true,
    children: [
      {
        id: "p1-1",
        name: "マーケティング・準備",
        startDay: 1,
        duration: 10,
        progress: 100,
        color: "bg-emerald-500",
      },
      {
        id: "p1-2",
        name: "試験準備",
        startDay: 8,
        duration: 8,
        progress: 85,
        color: "bg-cyan-500",
      },
      {
        id: "p1-3",
        name: "試験実施",
        startDay: 16,
        duration: 5,
        progress: 40,
        color: "bg-violet-500",
      },
      {
        id: "p1-4",
        name: "採点・結果通知",
        startDay: 21,
        duration: 5,
        progress: 0,
        color: "bg-amber-500",
      },
      {
        id: "p1-5",
        name: "振り返り・改善",
        startDay: 26,
        duration: 3,
        progress: 0,
        color: "bg-rose-500",
      },
    ],
  },
  {
    id: "p2",
    name: "プラットフォーム開発",
    startDay: 3,
    duration: 25,
    progress: 45,
    color: "bg-indigo-500",
    isGroup: true,
    children: [
      {
        id: "p2-1",
        name: "要件定義・設計",
        startDay: 3,
        duration: 7,
        progress: 100,
        color: "bg-emerald-500",
      },
      {
        id: "p2-2",
        name: "フロントエンド実装",
        startDay: 10,
        duration: 12,
        progress: 60,
        color: "bg-blue-500",
      },
      {
        id: "p2-3",
        name: "バックエンドAPI開発",
        startDay: 10,
        duration: 10,
        progress: 50,
        color: "bg-cyan-500",
      },
      {
        id: "p2-4",
        name: "テスト・QA",
        startDay: 22,
        duration: 4,
        progress: 0,
        color: "bg-amber-500",
      },
      {
        id: "p2-5",
        name: "デプロイ",
        startDay: 26,
        duration: 2,
        progress: 0,
        color: "bg-rose-500",
      },
    ],
  },
  {
    id: "p3",
    name: "コンテンツ制作",
    startDay: 5,
    duration: 20,
    progress: 30,
    color: "bg-teal-500",
    isGroup: true,
    children: [
      {
        id: "p3-1",
        name: "カリキュラム設計",
        startDay: 5,
        duration: 5,
        progress: 100,
        color: "bg-emerald-500",
      },
      {
        id: "p3-2",
        name: "教材作成",
        startDay: 10,
        duration: 10,
        progress: 35,
        color: "bg-blue-500",
      },
      {
        id: "p3-3",
        name: "動画収録・編集",
        startDay: 15,
        duration: 8,
        progress: 10,
        color: "bg-violet-500",
      },
      {
        id: "p3-4",
        name: "レビュー・修正",
        startDay: 23,
        duration: 2,
        progress: 0,
        color: "bg-amber-500",
      },
    ],
  },
];

const totalDays = 30;
const dayLabels = Array.from({ length: totalDays }, (_, i) => i + 1);

function TaskRow({
  task,
  indent = 0,
  isChild = false,
}: {
  task: GanttTask;
  indent?: number;
  isChild?: boolean;
}) {
  return (
    <>
      {/* Task name row (left side) -- rendered via the combined row */}
      <div className="contents">
        {/* Left panel: task name */}
        <div
          className={`flex items-center gap-1.5 border-b border-border/30 py-2 pr-3 ${
            isChild ? "pl-" + (indent * 4 + 2) : "pl-2"
          }`}
          style={{ paddingLeft: `${indent * 16 + 8}px` }}
        >
          {task.isGroup ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <span className="w-3.5" />
          )}
          <span
            className={`truncate text-xs ${task.isGroup ? "font-semibold" : ""}`}
          >
            {task.name}
          </span>
        </div>

        {/* Progress cell */}
        <div className="flex items-center justify-center border-b border-border/30 py-2 text-xs text-muted-foreground">
          {task.progress}%
        </div>

        {/* Timeline bar area */}
        <div className="relative border-b border-border/30 py-2">
          <div className="relative h-6">
            {/* Bar background */}
            <div
              className={`absolute top-0.5 h-5 rounded ${task.isGroup ? "bg-muted/80" : task.color + "/20"}`}
              style={{
                left: `${((task.startDay - 1) / totalDays) * 100}%`,
                width: `${(task.duration / totalDays) * 100}%`,
              }}
            >
              {/* Progress fill */}
              <div
                className={`h-full rounded ${task.isGroup ? "bg-primary/60" : task.color}`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            {/* Progress label on bar */}
            {task.progress > 0 && task.duration > 2 && (
              <div
                className="absolute top-0.5 flex h-5 items-center text-[10px] font-medium text-white"
                style={{
                  left: `${((task.startDay - 1) / totalDays) * 100 + 0.5}%`,
                }}
              >
                <span className="ml-1.5">{task.progress > 15 ? `${task.progress}%` : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Child tasks */}
      {task.children?.map((child) => (
        <TaskRow key={child.id} task={child} indent={indent + 1} isChild />
      ))}
    </>
  );
}

export default function GanttPage() {
  const activeView: ViewMode = "日";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GanttChart className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              ガントチャート
            </h1>
            <p className="text-sm text-muted-foreground">
              プロジェクトのタスク進捗をタイムラインで管理します
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          プロジェクト追加
        </button>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* View toggles */}
              {(["日", "週", "月"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === activeView
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {mode}
                </button>
              ))}
              <div className="mx-2 h-5 w-px bg-border" />
              <span className="text-sm text-muted-foreground">
                2026年4月
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-accent">
                <Filter className="h-3.5 w-3.5" />
                フィルター
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-accent">
                <Download className="h-3.5 w-3.5" />
                エクスポート
              </button>
              <button className="rounded-md border border-input p-1.5 transition-colors hover:bg-accent">
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">プロジェクトタイムライン</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <div
              className="min-w-[1000px]"
              style={{
                display: "grid",
                gridTemplateColumns: "240px 60px 1fr",
              }}
            >
              {/* Header row */}
              <div className="border-b-2 border-border pb-2 pl-2 text-xs font-semibold text-muted-foreground">
                タスク名
              </div>
              <div className="border-b-2 border-border pb-2 text-center text-xs font-semibold text-muted-foreground">
                進捗
              </div>
              <div className="border-b-2 border-border pb-2">
                <div className="flex">
                  {dayLabels.map((day) => (
                    <div
                      key={day}
                      className={`flex-1 text-center text-[10px] ${
                        day === 9
                          ? "font-bold text-primary"
                          : "text-muted-foreground"
                      } ${[6, 7, 13, 14, 20, 21, 27, 28].includes(day) ? "text-muted-foreground/40" : ""}`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Today marker context -- we'll overlay it */}

              {/* Task rows */}
              {projects.map((project) => (
                <TaskRow key={project.id} task={project} />
              ))}
            </div>

            {/* Today indicator line - positioned over the timeline area */}
            <div className="relative min-w-[1000px]">
              <div
                className="pointer-events-none absolute bottom-0 top-0 w-px bg-primary/60"
                style={{
                  /* Day 9 out of 30, offset by left columns (240+60=300px) */
                  left: `calc(300px + ${((9 - 0.5) / totalDays) * (100)}% * (1 - 300px / 100%))`,
                }}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <span className="text-xs font-medium text-muted-foreground">
              凡例:
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded bg-emerald-500" />
              <span className="text-xs text-muted-foreground">完了</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded bg-blue-500" />
              <span className="text-xs text-muted-foreground">進行中</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded bg-amber-500" />
              <span className="text-xs text-muted-foreground">待機中</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-6 rounded bg-rose-500" />
              <span className="text-xs text-muted-foreground">未着手</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="h-4 w-px bg-primary/60" />
              <span className="text-xs text-muted-foreground">本日</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} size="sm">
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${project.color}`} />
                <span className="text-sm font-medium">{project.name}</span>
              </div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-muted-foreground">全体進捗</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${project.color}`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {project.children?.map((child) => (
                  <div key={child.id} className="flex items-center gap-1.5">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${child.color}`}
                    />
                    <span className="truncate text-[10px] text-muted-foreground">
                      {child.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
