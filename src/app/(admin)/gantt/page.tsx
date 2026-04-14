"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePageContextStore } from "@/stores/page-context-store";
import type { PageAction } from "@/stores/page-context-store";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Filter,
  X,
  MoreVertical,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================================
// Type Definitions
// ============================================================================

type ViewMode = "日" | "週" | "月";
type TaskStatus = "not_started" | "in_progress" | "completed" | "on_hold";

interface Task {
  id: number;
  project_id: number;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  color: string;
  sort_order: number;
  assignee?: string;
  description?: string;
  status: TaskStatus;
}

interface Project {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  tasks: Task[];
}

interface ApiResponse {
  projects: Project[];
}

interface ExpandedState {
  [key: number]: boolean;
}

interface DraggingState {
  taskId: number;
  projectId: number;
  startX: number;
  startProgress: number;
}

// ============================================================================
// Constants
// ============================================================================

const COLOR_MAP: { [key: string]: string } = {
  blue: "#3b82f6",
  indigo: "#6366f1",
  teal: "#14b8a6",
  emerald: "#10b981",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  amber: "#f59e0b",
  cyan: "#06b6d4",
};

const AVAILABLE_COLORS = [
  { name: "blue", label: "ブルー" },
  { name: "indigo", label: "インディゴ" },
  { name: "teal", label: "ティール" },
  { name: "emerald", label: "エメラルド" },
  { name: "violet", label: "バイオレット" },
  { name: "rose", label: "ローズ" },
  { name: "amber", label: "アンバー" },
  { name: "cyan", label: "シアン" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "in_progress", label: "進行中" },
  { value: "not_started", label: "未着手" },
  { value: "completed", label: "完了" },
  { value: "on_hold", label: "保留" },
];

const STATUS_LABEL_MAP: Record<TaskStatus, string> = {
  in_progress: "進行中",
  not_started: "未着手",
  completed: "完了",
  on_hold: "保留",
};

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getMonthLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stringToDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getTaskPositionAndWidth(
  task: Task,
  monthStart: Date,
  viewMode: ViewMode
): { left: number; width: number } {
  const startDate = stringToDate(task.start_date);
  const endDate = stringToDate(task.end_date);
  const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const monthEndDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  const clampedStart = startDate < monthStartDate ? monthStartDate : startDate;
  const clampedEnd = endDate > monthEndDate ? monthEndDate : endDate;

  if (clampedStart > monthEndDate || clampedEnd < monthStartDate) {
    return { left: 0, width: 0 };
  }

  const daysFromStart = Math.floor(
    (clampedStart.getTime() - monthStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const duration = Math.ceil(
    (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60 * 24) + 1
  );

  const totalDays = getDaysInMonth(monthStart);

  if (viewMode === "週") {
    const weeksInMonth = Math.ceil(totalDays / 7);
    const weekStart = Math.floor(daysFromStart / 7);
    const weekDuration = Math.max(1, Math.ceil(duration / 7));
    return {
      left: (weekStart / weeksInMonth) * 100,
      width: (weekDuration / weeksInMonth) * 100,
    };
  } else if (viewMode === "月") {
    return {
      left: (daysFromStart / totalDays) * 100,
      width: (duration / totalDays) * 100,
    };
  }

  // Default: 日 mode
  return {
    left: (daysFromStart / totalDays) * 100,
    width: (duration / totalDays) * 100,
  };
}

function getTodayProgress(
  monthStart: Date,
  viewMode: ViewMode
): number | null {
  const today = new Date();
  const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const monthEndDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  if (today < monthStartDate || today > monthEndDate) {
    return null;
  }

  const totalDays = getDaysInMonth(monthStart);
  const daysFromStart = Math.floor(
    (today.getTime() - monthStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (viewMode === "週") {
    const weeksInMonth = Math.ceil(totalDays / 7);
    const weekPosition = Math.floor(daysFromStart / 7) + 0.5;
    return (weekPosition / weeksInMonth) * 100;
  } else if (viewMode === "月") {
    return ((daysFromStart + 0.5) / totalDays) * 100;
  }

  return ((daysFromStart + 0.5) / totalDays) * 100;
}

function getTimelineLabels(
  monthStart: Date,
  viewMode: ViewMode
): string[] {
  const totalDays = getDaysInMonth(monthStart);

  if (viewMode === "週") {
    const weeks = Math.ceil(totalDays / 7);
    return Array.from({ length: weeks }, (_, i) => `W${i + 1}`);
  } else if (viewMode === "月") {
    return Array.from({ length: 3 }, (_, i) => {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth() + i, 1);
      return `${date.getMonth() + 1}月`;
    });
  }

  return Array.from({ length: totalDays }, (_, i) => String(i + 1));
}

// ============================================================================
// Dialog Components
// ============================================================================

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string }) => void;
  isLoading: boolean;
}

function ProjectDialog({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({ name, color });
      setName("");
      setColor("blue");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#0f1623] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e6edf3]">
            プロジェクト追加
          </h2>
          <button
            onClick={onClose}
            className="text-[#e6edf3]/60 hover:text-[#e6edf3]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
              プロジェクト名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: プラットフォーム開発"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-3">
              色選択
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  className={`h-10 rounded-md border-2 transition-all ${
                    color === c.name
                      ? "border-[#58a6ff]"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: COLOR_MAP[c.name] }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md border border-[#30363d] bg-[#161b22] px-4 py-2 text-sm font-medium text-[#e6edf3] hover:bg-[#30363d] disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim()}
            className="rounded-md bg-[#58a6ff] px-4 py-2 text-sm font-medium text-[#0f1623] hover:bg-[#79c0ff] disabled:opacity-50"
          >
            {isLoading ? "保存中..." : "追加"}
          </button>
        </div>
      </div>
    </>
  );
}

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Task>) => void;
  task?: Task;
  isLoading: boolean;
}

function TaskDialog({
  isOpen,
  onClose,
  onSubmit,
  task,
  isLoading,
}: TaskDialogProps) {
  const [formData, setFormData] = useState<Partial<Task>>(
    task || {
      name: "",
      start_date: dateToString(new Date()),
      end_date: dateToString(new Date()),
      progress: 0,
      color: "blue",
      assignee: "",
      description: "",
      status: "not_started",
    }
  );

  useEffect(() => {
    if (task) {
      setFormData(task);
    }
  }, [task]);

  const handleSubmit = () => {
    if (
      formData.name?.trim() &&
      formData.start_date &&
      formData.end_date
    ) {
      onSubmit(formData);
      if (!task) {
        setFormData({
          name: "",
          start_date: dateToString(new Date()),
          end_date: dateToString(new Date()),
          progress: 0,
          color: "blue",
          assignee: "",
          description: "",
          status: "not_started",
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-lg bg-[#0f1623] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e6edf3]">
            {task ? "タスク編集" : "タスク追加"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#e6edf3]/60 hover:text-[#e6edf3]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
              タスク名
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="タスク名"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
                開始日
              </label>
              <input
                type="date"
                value={formData.start_date || ""}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
                終了日
              </label>
              <input
                type="date"
                value={formData.end_date || ""}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
              進捗: {formData.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress || 0}
              onChange={(e) =>
                setFormData({ ...formData, progress: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-3">
              色選択
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setFormData({ ...formData, color: c.name })}
                  className={`h-8 rounded-md border-2 transition-all ${
                    formData.color === c.name
                      ? "border-[#58a6ff]"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: COLOR_MAP[c.name] }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
              担当者
            </label>
            <input
              type="text"
              value={formData.assignee || ""}
              onChange={(e) =>
                setFormData({ ...formData, assignee: e.target.value })
              }
              placeholder="例: 田中太郎"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
              ステータス
            </label>
            <select
              value={formData.status || "not_started"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as TaskStatus,
                })
              }
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#e6edf3]/80 mb-2">
              説明
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="タスクの詳細説明"
              rows={3}
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md border border-[#30363d] bg-[#161b22] px-4 py-2 text-sm font-medium text-[#e6edf3] hover:bg-[#30363d] disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name?.trim()}
            className="rounded-md bg-[#58a6ff] px-4 py-2 text-sm font-medium text-[#0f1623] hover:bg-[#79c0ff] disabled:opacity-50"
          >
            {isLoading ? "保存中..." : task ? "更新" : "追加"}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Tooltip Component
// ============================================================================

interface TooltipProps {
  task: Task;
  x: number;
  y: number;
}

function Tooltip({ task, x, y }: TooltipProps) {
  const startDate = stringToDate(task.start_date);
  const endDate = stringToDate(task.end_date);
  const durationDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1
  );

  return (
    <div
      className="fixed z-50 rounded-md bg-[#161b22] p-3 shadow-lg border border-[#30363d]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: "none",
      }}
    >
      <div className="text-sm font-semibold text-[#e6edf3]">{task.name}</div>
      <div className="text-xs text-[#8b949e] mt-1">
        {task.start_date} 〜 {task.end_date}
      </div>
      <div className="text-xs text-[#8b949e]">{durationDays}日間</div>
      <div className="text-xs text-[#8b949e]">進捗: {task.progress}%</div>
      {task.assignee && (
        <div className="text-xs text-[#8b949e]">担当: {task.assignee}</div>
      )}
    </div>
  );
}

// ============================================================================
// Task Row Component
// ============================================================================

interface TaskRowProps {
  task: Task;
  projectColor: string;
  isExpanded: boolean;
  onExpandToggle: (projectId: number) => void;
  monthStart: Date;
  viewMode: ViewMode;
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: number, projectId: number) => void;
  tooltipTask: Task | null;
  onTooltipChange: (task: Task | null) => void;
}

function TaskRow({
  task,
  projectColor,
  monthStart,
  viewMode,
  onTaskClick,
  onTaskDelete,
  tooltipTask,
  onTooltipChange,
}: TaskRowProps) {
  const { left, width } = getTaskPositionAndWidth(task, monthStart, viewMode);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="group relative flex h-10 items-center border-b border-[#21262d] hover:bg-[#161b22]/50">
      <div className="sticky left-0 z-20 w-[280px] min-w-[280px] flex items-center px-3 text-xs text-[#e6edf3]/70 truncate bg-[#161b22] border-r border-[#21262d]">
        {task.name}
      </div>

      <div
        className="relative flex-1 h-full"
        onMouseEnter={() => onTooltipChange(task)}
        onMouseLeave={() => onTooltipChange(null)}
      >
        {width > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md cursor-pointer hover:brightness-110 transition-all overflow-hidden"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              backgroundColor: COLOR_MAP[task.color] || COLOR_MAP.blue,
            }}
            onClick={() => onTaskClick(task)}
          >
            <div
              className="h-full rounded-l-md"
              style={{
                width: `${task.progress}%`,
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            />
            {task.progress > 0 && width > 5 && (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-sm">
                {task.progress}%
              </div>
            )}
          </div>
        )}
      </div>

      <div
        ref={menuRef}
        className="absolute right-0 top-0 bottom-0 pr-2 flex items-center opacity-0 group-hover:opacity-100"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 hover:bg-[#30363d] rounded"
        >
          <MoreVertical className="h-4 w-4 text-[#8b949e]" />
        </button>

        {showMenu && (
          <div className="absolute right-8 top-0 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg whitespace-nowrap z-50">
            <button
              onClick={() => {
                onTaskClick(task);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#e6edf3] hover:bg-[#30363d]"
            >
              編集
            </button>
            <button
              onClick={() => {
                onTaskDelete(task.id, task.project_id);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#f85149] hover:bg-[#30363d]"
            >
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Project Header Component
// ============================================================================

interface ProjectHeaderProps {
  project: Project;
  isExpanded: boolean;
  onExpandToggle: () => void;
  onAddTask: () => void;
  onProjectClick: () => void;
  onProjectDelete: () => void;
}

function ProjectHeader({
  project,
  isExpanded,
  onExpandToggle,
  onAddTask,
  onProjectClick,
  onProjectDelete,
}: ProjectHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const completedTasks = project.tasks.filter((t) => t.progress === 100).length;
  const totalTasks = project.tasks.length;
  const avgProgress =
    totalTasks > 0
      ? Math.round(
          project.tasks.reduce((sum, t) => sum + t.progress, 0) / totalTasks
        )
      : 0;

  return (
    <div className="group relative flex h-10 items-center border-b border-[#21262d] bg-[#0d1117] font-semibold hover:bg-[#161b22]/50">
      <div className="sticky left-0 z-20 w-[280px] min-w-[280px] flex items-center px-3 gap-2 bg-[#0d1117] border-r border-[#21262d]">
        <button
          onClick={onExpandToggle}
          className="flex-shrink-0 p-0.5 hover:bg-[#30363d] rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[#8b949e]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#8b949e]" />
          )}
        </button>
        <div
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: COLOR_MAP[project.color] || COLOR_MAP.blue }}
        />
        <div
          className="flex-1 truncate text-sm text-[#e6edf3] cursor-pointer hover:text-[#58a6ff]"
          onClick={onProjectClick}
        >
          {project.name}
        </div>
        <div className="text-xs text-[#8b949e]">
          {completedTasks}/{totalTasks}
        </div>
      </div>

      <div className="flex-1 flex items-center px-2">
        <div className="text-xs text-[#8b949e]">{avgProgress}%</div>
      </div>

      <div
        ref={menuRef}
        className="absolute right-0 top-0 bottom-0 pr-2 flex items-center opacity-0 group-hover:opacity-100"
      >
        <button
          onClick={onAddTask}
          className="p-1 hover:bg-[#30363d] rounded text-[#58a6ff]"
          title="タスク追加"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 hover:bg-[#30363d] rounded"
        >
          <MoreVertical className="h-4 w-4 text-[#8b949e]" />
        </button>

        {showMenu && (
          <div className="absolute right-8 top-0 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg whitespace-nowrap z-50">
            <button
              onClick={() => {
                onProjectClick();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#e6edf3] hover:bg-[#30363d]"
            >
              編集
            </button>
            <button
              onClick={() => {
                onProjectDelete();
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#f85149] hover:bg-[#30363d]"
            >
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function GanttPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<ViewMode>("日");
  const [expandedProjects, setExpandedProjects] = useState<ExpandedState>({});
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isDialogLoading, setIsDialogLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [tooltipTask, setTooltipTask] = useState<Task | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/gantt");
      if (!response.ok) throw new Error("Failed to fetch");
      const data: ApiResponse = await response.json();
      setProjects(data.projects);
      setError(null);

      // Initialize expanded state
      const expanded: ExpandedState = {};
      data.projects.forEach((p) => {
        expanded[p.id] = true;
      });
      setExpandedProjects(expanded);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── AI Assistant: ページコンテキ���ト登録 ──
  const { setPageContext, clearPageContext, refreshTrigger } = usePageContextStore();

  useEffect(() => {
    const ganttActions: PageAction[] = [
      {
        name: "gantt_add_project",
        description: "新しいプロジェクトを追加します",
        parameters: {
          name: { type: "string", description: "プロジェクト名", required: true },
          color: { type: "string", description: "プロジェクトの色", required: true, enum: ["blue", "indigo", "teal", "emerald", "violet", "rose", "amber", "cyan"] },
        },
      },
      {
        name: "gantt_update_project",
        description: "既存のプロジェクトを更新します",
        parameters: {
          id: { type: "number", description: "プ���ジェクトID", required: true },
          name: { type: "string", description: "プロジェクト名" },
          color: { type: "string", description: "プロジェクトの色", enum: ["blue", "indigo", "teal", "emerald", "violet", "rose", "amber", "cyan"] },
        },
      },
      {
        name: "gantt_delete_project",
        description: "プロジェクトとそのタスクを全て削除します。注意: この操作は元に戻せません",
        parameters: {
          id: { type: "number", description: "プロジェクトID", required: true },
        },
      },
      {
        name: "gantt_add_task",
        description: "プロジェクトに新しいタスクを追加します",
        parameters: {
          project_id: { type: "number", description: "所属するプロジェクトのID", required: true },
          name: { type: "string", description: "タスク名", required: true },
          start_date: { type: "string", description: "開始日 (YYYY-MM-DD)", required: true },
          end_date: { type: "string", description: "終了日 (YYYY-MM-DD)", required: true },
          progress: { type: "number", description: "進捗率 (0-100)" },
          color: { type: "string", description: "カラーHEX値 (例: #3b82f6)" },
          assignee: { type: "string", description: "担当者名" },
          description: { type: "string", description: "説明" },
          status: { type: "string", description: "ステータス", enum: ["not_started", "in_progress", "completed", "on_hold"] },
        },
      },
      {
        name: "gantt_update_task",
        description: "既存のタスクを更新します",
        parameters: {
          id: { type: "number", description: "タスクID", required: true },
          name: { type: "string", description: "タスク名" },
          start_date: { type: "string", description: "開始日 (YYYY-MM-DD)" },
          end_date: { type: "string", description: "終了日 (YYYY-MM-DD)" },
          progress: { type: "number", description: "進捗��� (0-100)" },
          color: { type: "string", description: "カラーHEX値" },
          assignee: { type: "string", description: "担���者名" },
          description: { type: "string", description: "説明" },
          status: { type: "string", description: "��テータス", enum: ["not_started", "in_progress", "completed", "on_hold"] },
        },
      },
      {
        name: "gantt_delete_task",
        description: "タスクを削除します",
        parameters: {
          id: { type: "number", description: "タスクID", required: true },
        },
      },
    ];

    const projectsSummary = projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      tasks: p.tasks.map((t) => ({
        id: t.id,
        name: t.name,
        start_date: t.start_date,
        end_date: t.end_date,
        progress: t.progress,
        status: t.status,
        assignee: t.assignee,
        description: t.description,
      })),
    }));

    setPageContext(
      "gantt",
      "ガントチャート",
      {
        totalProjects: projects.length,
        totalTasks: projects.reduce((sum, p) => sum + p.tasks.length, 0),
        projects: projectsSummary,
      },
      ganttActions
    );

    return () => clearPageContext();
  }, [projects, setPageContext, clearPageContext]);

  // ─��� AI Assistant: リフレッシュトリガー ──
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchData();
    }
  }, [refreshTrigger, fetchData]);

  // Handle keyboard for dialog close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowProjectDialog(false);
        setShowTaskDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle mouse move for tooltip
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tooltipTask && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top + 10,
      });
    }
  };

  // Handle dragging progress
  const handleProgressDragStart = (
    e: React.MouseEvent,
    taskId: number,
    projectId: number,
    currentProgress: number
  ) => {
    e.preventDefault();
    setDragging({
      taskId,
      projectId,
      startX: e.clientX,
      startProgress: currentProgress,
    });
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const delta = e.clientX - dragging.startX;
        const pixelsPerPercent = rect.width / 100;
        const deltaPercent = delta / pixelsPerPercent;
        const newProgress = Math.max(
          0,
          Math.min(100, dragging.startProgress + deltaPercent)
        );

        // Update local state for visual feedback
        setProjects((prev) =>
          prev.map((p) =>
            p.id === dragging.projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === dragging.taskId
                      ? { ...t, progress: Math.round(newProgress) }
                      : t
                  ),
                }
              : p
          )
        );
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (timelineRef.current && dragging) {
        const rect = timelineRef.current.getBoundingClientRect();
        const delta = e.clientX - dragging.startX;
        const pixelsPerPercent = rect.width / 100;
        const deltaPercent = delta / pixelsPerPercent;
        const newProgress = Math.max(
          0,
          Math.min(100, dragging.startProgress + deltaPercent)
        );

        // Update via API
        const task = projects
          .flatMap((p) => p.tasks)
          .find((t) => t.id === dragging.taskId);
        if (task) {
          try {
            await fetch("/api/gantt", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "task",
                id: task.id,
                progress: Math.round(newProgress),
              }),
            });
            await fetchData();
          } catch (err) {
            console.error("Failed to update task progress:", err);
          }
        }
      }

      setDragging(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, projects, fetchData]);

  // Dialog handlers
  const handleAddProject = async (data: { name: string; color: string }) => {
    setIsDialogLoading(true);
    try {
      const response = await fetch("/api/gantt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "project",
          name: data.name,
          color: data.color,
        }),
      });

      if (!response.ok) throw new Error("Failed to create project");

      setShowProjectDialog(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to add project:", err);
    } finally {
      setIsDialogLoading(false);
    }
  };

  const handleAddTask = async (formData: Partial<Task>) => {
    if (!selectedProjectId) return;

    setIsDialogLoading(true);
    try {
      if (selectedTask) {
        // Update task
        await fetch("/api/gantt", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task",
            id: selectedTask.id,
            ...formData,
          }),
        });
      } else {
        // Create task
        await fetch("/api/gantt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task",
            project_id: selectedProjectId,
            ...formData,
          }),
        });
      }

      setShowTaskDialog(false);
      setSelectedTask(null);
      setSelectedProjectId(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to save task:", err);
    } finally {
      setIsDialogLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number, projectId: number) => {
    if (!confirm("このタスクを削除しますか?")) return;

    try {
      const response = await fetch(
        `/api/gantt?type=task&id=${taskId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete task");

      await fetchData();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm("このプロジェクトを削除しますか?")) return;

    try {
      const response = await fetch(
        `/api/gantt?type=project&id=${projectId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete project");

      await fetchData();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  // Filtering
  const filteredProjects = projects.map((p) => ({
    ...p,
    tasks:
      filterStatus === "all"
        ? p.tasks
        : p.tasks.filter((t) => t.status === filterStatus),
  }));

  // Timeline labels
  const timelineLabels = getTimelineLabels(monthStart, viewMode);

  // Today progress
  const todayProgress = getTodayProgress(monthStart, viewMode);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#30363d] border-t-[#58a6ff]" />
          </div>
          <p className="text-[#8b949e]">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#0f1623] text-[#e6edf3] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#58a6ff]/20 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-[#58a6ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ガントチャート</h1>
            <p className="text-sm text-[#8b949e]">
              プロジェクトのタスク進捗をタイムラインで管理します
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowProjectDialog(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#58a6ff] px-4 py-2 text-sm font-medium text-[#0f1623] hover:bg-[#79c0ff]"
        >
          <Plus className="h-4 w-4" />
          プロジェクト追加
        </button>
      </div>

      {/* Toolbar */}
      <Card className="bg-[#161b22] border-[#30363d]">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {(["日", "週", "月"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === viewMode
                      ? "bg-[#58a6ff] text-[#0f1623]"
                      : "bg-[#30363d] text-[#8b949e] hover:bg-[#3d444d]"
                  }`}
                >
                  {mode}
                </button>
              ))}
              <div className="mx-2 h-5 w-px bg-[#30363d]" />
              <span className="text-sm text-[#8b949e]">
                {getMonthLabel(monthStart)}
              </span>
              <button
                onClick={() =>
                  setMonthStart(
                    new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
                  )
                }
                className="p-1 hover:bg-[#30363d] rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setMonthStart(
                    new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
                  )
                }
                className="p-1 hover:bg-[#30363d] rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="p-1.5 hover:bg-[#30363d] rounded text-[#58a6ff]"
                title="今日へ移動"
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#8b949e]" />
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as TaskStatus | "all"
                  )
                }
                className="rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
              >
                <option value="all">全て</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      {error && (
        <div className="rounded-md bg-[#f85149]/10 border border-[#f85149] p-3 text-sm text-[#f85149]">
          {error}
        </div>
      )}

      {filteredProjects.length === 0 ? (
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardContent className="py-12">
            <div className="text-center text-[#8b949e]">
              <p className="mb-2">プロジェクトがありません</p>
              <button
                onClick={() => setShowProjectDialog(true)}
                className="text-[#58a6ff] hover:underline"
              >
                プロジェクトを追加してください
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#161b22] border-[#30363d] overflow-hidden">
          <CardHeader className="pb-0 border-b border-[#30363d]">
            <CardTitle className="text-base">プロジェクトタイムライン</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="overflow-x-auto min-h-[400px]">
              <div
                ref={timelineRef}
                className="min-w-[1400px]"
                onMouseMove={handleTimelineMouseMove}
              >
                {/* Header */}
                <div className="flex border-b border-[#30363d]">
                  <div className="sticky left-0 z-20 w-[280px] min-w-[280px] px-3 py-2 border-r border-[#30363d] bg-[#161b22]">
                    <div className="text-xs font-semibold text-[#8b949e]">
                      プロジェクト・タスク
                    </div>
                  </div>
                  <div className="flex-1 flex">
                    {timelineLabels.map((label, idx) => (
                      <div
                        key={idx}
                        className="flex-1 text-center py-2 text-xs font-medium text-[#8b949e] border-l border-[#30363d] bg-[#0d1117]"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows with grid background */}
                <div className="relative">
                  {/* Today marker */}
                  {todayProgress !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#f85149]/80 pointer-events-none z-10"
                      style={{
                        left: `calc(280px + (100% - 280px) * ${todayProgress / 100})`,
                      }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#f85149]" />
                    </div>
                  )}

                  {filteredProjects.map((project) => (
                    <div key={project.id}>
                      <ProjectHeader
                        project={project}
                        isExpanded={expandedProjects[project.id] || false}
                        onExpandToggle={() =>
                          setExpandedProjects((prev) => ({
                            ...prev,
                            [project.id]: !prev[project.id],
                          }))
                        }
                        onAddTask={() => {
                          setSelectedProjectId(project.id);
                          setSelectedTask(null);
                          setShowTaskDialog(true);
                        }}
                        onProjectClick={() => {
                          setSelectedProjectId(project.id);
                          setShowProjectDialog(true);
                        }}
                        onProjectDelete={() =>
                          handleDeleteProject(project.id)
                        }
                      />

                      {expandedProjects[project.id] &&
                        project.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            projectColor={project.color}
                            isExpanded={expandedProjects[project.id] || false}
                            onExpandToggle={() => {}}
                            monthStart={monthStart}
                            viewMode={viewMode}
                            onTaskClick={(t) => {
                              setSelectedTask(t);
                              setSelectedProjectId(project.id);
                              setShowTaskDialog(true);
                            }}
                            onTaskDelete={handleDeleteTask}
                            tooltipTask={tooltipTask}
                            onTooltipChange={setTooltipTask}
                          />
                        ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tooltip */}
              {tooltipTask && (
                <Tooltip
                  task={tooltipTask}
                  x={tooltipPos.x}
                  y={tooltipPos.y}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {filteredProjects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const completedTasks = project.tasks.filter(
              (t) => t.progress === 100
            ).length;
            const totalTasks = project.tasks.length;
            const avgProgress =
              totalTasks > 0
                ? Math.round(
                    project.tasks.reduce((sum, t) => sum + t.progress, 0) /
                      totalTasks
                  )
                : 0;

            return (
              <Card key={project.id} className="bg-[#161b22] border-[#30363d]">
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: COLOR_MAP[project.color] || COLOR_MAP.blue,
                      }}
                    />
                    <span className="text-sm font-semibold text-[#e6edf3]">
                      {project.name}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[#8b949e]">全体進捗</span>
                        <span className="font-semibold text-[#e6edf3]">
                          {avgProgress}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#30363d]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${avgProgress}%`,
                            backgroundColor:
                              COLOR_MAP[project.color] || COLOR_MAP.blue,
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-[#8b949e]">
                      完了: {completedTasks}/{totalTasks}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ProjectDialog
        isOpen={showProjectDialog}
        onClose={() => {
          setShowProjectDialog(false);
          setSelectedProjectId(null);
        }}
        onSubmit={handleAddProject}
        isLoading={isDialogLoading}
      />

      <TaskDialog
        isOpen={showTaskDialog}
        onClose={() => {
          setShowTaskDialog(false);
          setSelectedTask(null);
          setSelectedProjectId(null);
        }}
        onSubmit={handleAddTask}
        task={selectedTask || undefined}
        isLoading={isDialogLoading}
      />
    </div>
  );
}
