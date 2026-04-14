export interface ActionCall {
  action: string;
  params: Record<string, unknown>;
}

export interface ActionResult {
  action: string;
  success: boolean;
  message: string;
  data?: unknown;
}

const ACTION_BLOCK_REGEX = /```action\s*\n([\s\S]*?)```/g;

export function parseActions(content: string): ActionCall[] {
  const actions: ActionCall[] = [];
  let match;
  ACTION_BLOCK_REGEX.lastIndex = 0;
  while ((match = ACTION_BLOCK_REGEX.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.action && typeof parsed.action === "string") {
        actions.push({
          action: parsed.action,
          params: parsed.params ?? {},
        });
      }
    } catch {
      // skip malformed action blocks
    }
  }
  return actions;
}

export function stripActionBlocks(content: string): string {
  return content.replace(ACTION_BLOCK_REGEX, "").trim();
}

export async function executeAction(call: ActionCall): Promise<ActionResult> {
  try {
    switch (call.action) {
      // ── Schedule Actions ──
      case "schedule_add": {
        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(call.params),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "スケジュールを追加しました", data };
      }

      case "schedule_update": {
        const res = await fetch("/api/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(call.params),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "スケジュールを更新しました", data };
      }

      case "schedule_delete": {
        const { id, scope } = call.params as { id: number; scope?: string };
        const params = new URLSearchParams({ id: String(id), scope: scope || "single" });
        const res = await fetch(`/api/schedule?${params}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return { action: call.action, success: true, message: "スケジュールを削除しました" };
      }

      // ── Gantt Project Actions ──
      case "gantt_add_project": {
        const res = await fetch("/api/gantt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "project", ...call.params }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "プロジェクトを追加しました", data };
      }

      case "gantt_update_project": {
        const res = await fetch("/api/gantt", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "project", ...call.params }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "プロジェクトを更新しました", data };
      }

      case "gantt_delete_project": {
        const { id } = call.params as { id: number };
        const res = await fetch(`/api/gantt?type=project&id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return { action: call.action, success: true, message: "プロジェクトを削除しました" };
      }

      // ── Gantt Task Actions ──
      case "gantt_add_task": {
        const res = await fetch("/api/gantt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "task", ...call.params }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "タスクを追加しました", data };
      }

      case "gantt_update_task": {
        const res = await fetch("/api/gantt", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "task", ...call.params }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "タスクを更新しました", data };
      }

      case "gantt_delete_task": {
        const { id } = call.params as { id: number };
        const res = await fetch(`/api/gantt?type=task&id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return { action: call.action, success: true, message: "タスクを削除しました" };
      }

      default:
        return { action: call.action, success: false, message: `不明なアクション: ${call.action}` };
    }
  } catch (err) {
    return {
      action: call.action,
      success: false,
      message: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}
