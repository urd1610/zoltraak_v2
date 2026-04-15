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

// Match ```action ... ``` blocks with flexible whitespace handling
const ACTION_BLOCK_REGEX = /```action\s*\n?([\s\S]*?)```/g;

export function parseActions(content: string): ActionCall[] {
  const actions: ActionCall[] = [];
  let match;
  ACTION_BLOCK_REGEX.lastIndex = 0;
  while ((match = ACTION_BLOCK_REGEX.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.action && typeof parsed.action === "string") {
        // Support both { action, params: {...} } and flat { action, field1, field2, ... }
        let params: Record<string, unknown>;
        if (parsed.params && typeof parsed.params === "object" && !Array.isArray(parsed.params)) {
          params = parsed.params;
        } else {
          // Flat format: everything except "action" is a param
          const { action: _, ...rest } = parsed;
          params = rest;
        }
        actions.push({ action: parsed.action, params });
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

function validateRequired(params: Record<string, unknown>, fields: string[]): string | null {
  const missing = fields.filter((f) => params[f] == null || params[f] === "");
  if (missing.length > 0) {
    return `必須フィールドが不足しています: ${missing.join(", ")}`;
  }
  return null;
}

export async function executeAction(call: ActionCall): Promise<ActionResult> {
  try {
    switch (call.action) {
      // ── Schedule Actions ──
      case "schedule_add": {
        const err = validateRequired(call.params, ["title", "start_date", "end_date", "category", "color"]);
        if (err) throw new Error(err);

        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(call.params),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "スケジュールを追加しました", data };
      }

      case "schedule_update": {
        const err = validateRequired(call.params, ["id"]);
        if (err) throw new Error(err);

        const res = await fetch("/api/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(call.params),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "スケジュールを更新しました", data };
      }

      case "schedule_delete": {
        const err = validateRequired(call.params, ["id"]);
        if (err) throw new Error(err);

        const { id, scope } = call.params as { id: number; scope?: string };
        const qs = new URLSearchParams({ id: String(id), scope: scope || "single" });
        const res = await fetch(`/api/schedule?${qs}`, { method: "DELETE" });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        return { action: call.action, success: true, message: "スケジュールを削除しました" };
      }

      // ── Gantt Project Actions ──
      case "gantt_add_project": {
        const err = validateRequired(call.params, ["name", "color"]);
        if (err) throw new Error(err);

        const res = await fetch("/api/gantt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "project", ...call.params }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "プロジェクトを追加しました", data };
      }

      case "gantt_update_project": {
        const err = validateRequired(call.params, ["id"]);
        if (err) throw new Error(err);

        const res = await fetch("/api/gantt", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "project", ...call.params }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "プロジェクトを更新しました", data };
      }

      case "gantt_delete_project": {
        const err = validateRequired(call.params, ["id"]);
        if (err) throw new Error(err);

        const { id } = call.params as { id: number };
        const res = await fetch(`/api/gantt?type=project&id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        return { action: call.action, success: true, message: "プロジェクトを削除しました" };
      }

      // ── Gantt Task Actions ──
      case "gantt_add_task": {
        const err = validateRequired(call.params, ["project_id", "name", "start_date", "end_date"]);
        if (err) throw new Error(err);

        const res = await fetch("/api/gantt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "task", ...call.params }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "タスクを追加しました", data };
      }

      case "gantt_update_task": {
        const err = validateRequired(call.params, ["id"]);
        if (err) throw new Error(err);

        const res = await fetch("/api/gantt", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "task", ...call.params }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "タスクを更新しました", data };
      }

      case "gantt_delete_task": {
        const err = validateRequired(call.params, ["id"]);
        if (err) throw new Error(err);

        const { id } = call.params as { id: number };
        const res = await fetch(`/api/gantt?type=task&id=${id}`, { method: "DELETE" });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${res.status}`);
        }
        return { action: call.action, success: true, message: "タスクを削除しました" };
      }

      // ── Server02 Actions ──
      case "server02_search": {
        const err = validateRequired(call.params, ["q"]);
        if (err) throw new Error(err);

        const qs = new URLSearchParams();
        qs.set("q", String(call.params.q));
        if (call.params.share) qs.set("share", String(call.params.share));
        if (call.params.ext) qs.set("ext", String(call.params.ext));
        if (call.params.type) qs.set("type", String(call.params.type));
        qs.set("limit", String(call.params.limit || 20));

        const res = await fetch(`/api/server02/search?${qs}`, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error("検索に失敗しました");
        const data = await res.json();
        return { action: call.action, success: true, message: `${data.total}件のファイルが見つかりました`, data };
      }

      case "server02_browse": {
        const err = validateRequired(call.params, ["share"]);
        if (err) throw new Error(err);

        const qs = new URLSearchParams();
        qs.set("share", String(call.params.share));
        if (call.params.path) qs.set("path", String(call.params.path));

        const res = await fetch(`/api/server02/browse?${qs}`, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error("フォルダの参照に失敗しました");
        const data = await res.json();
        const count = data.files?.length || 0;
        return { action: call.action, success: true, message: `${count}件のエントリを取得しました`, data };
      }

      case "server02_read_file": {
        const err = validateRequired(call.params, ["file_path"]);
        if (err) throw new Error(err);

        const qs = new URLSearchParams();
        qs.set("path", String(call.params.file_path));

        const res = await fetch(`/api/server02/read?${qs}`, {
          signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || "ファイルの読み取りに失敗しました");
        }
        const data = await res.json();
        return { action: call.action, success: true, message: "ファイル内容を取得しました", data };
      }

      default:
        return { action: call.action, success: false, message: `不明なアクション: ${call.action}` };
    }
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
    return {
      action: call.action,
      success: false,
      message: isTimeout
        ? "リクエストがタイムアウトしました。サーバーの応答が遅い可能性があります。"
        : err instanceof Error ? err.message : "不明なエラー",
    };
  }
}
