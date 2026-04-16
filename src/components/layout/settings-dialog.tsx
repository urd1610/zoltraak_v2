"use client";

import { useEffect, useMemo } from "react";
import { Shield, ArrowUp, ArrowDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSettingsStore } from "@/stores/settings-store";

const allNavItems = [
  { label: "ダッシュボード", href: "/dashboard" },
  { label: "手順リスト", href: "/procedures" },
  { label: "スケジュール", href: "/schedule" },
  { label: "ガントチャート", href: "/gantt" },
  { label: "ロードマップ", href: "/roadmap" },
  { label: "セッション管理", href: "/sessions" },
  { label: "ユーザー管理", href: "/users" },
  { label: "Stripe連携", href: "/stripe" },
  { label: "DB操作", href: "/database" },
  { label: "メール送信", href: "/email" },
  { label: "Gmail受信箱", href: "/gmail" },
  { label: "配信カレンダー", href: "/calendar" },
  { label: "SNS分析", href: "/sns-analytics" },
  { label: "採点", href: "/scoring" },
  { label: "ライト", href: "/lite" },
  { label: "ジョブズ", href: "/jobs" },
  { label: "OGP画像", href: "/ogp" },
  { label: "要件定義", href: "/requirements" },
  { label: "Server02", href: "/server02" },
];

type OrderedNavItem = {
  label: string;
  href: string;
  sort_order: number;
  defaultOrder: number;
};

function buildOrderedNavItems(
  navSettings: Array<{ nav_href: string; sort_order?: number | null }>
) {
  return allNavItems
    .map((item, index) => {
      const setting = navSettings.find((s) => s.nav_href === item.href);
      return {
        label: item.label,
        href: item.href,
        sort_order:
          typeof setting?.sort_order === "number" ? setting.sort_order : index,
        defaultOrder: index,
      };
    })
    .sort((a, b) => {
      if (a.sort_order === b.sort_order) {
        return a.defaultOrder - b.defaultOrder;
      }
      return a.sort_order - b.sort_order;
    });
}

function Toggle({
  active,
  onToggle,
  disabled,
}: {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-checked={active}
      role="switch"
      className="relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      style={{ width: 40, height: 20 }}
    >
      <span
        className={`absolute inset-0 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
      />
      <span
        className="absolute h-4 w-4 rounded-full bg-background shadow transition-transform"
        style={{ transform: active ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function NotificationsToggle() {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);

  const handleToggle = () => {
    useSettingsStore.setState((s) => ({
      notificationsEnabled: !s.notificationsEnabled,
    }));
  };

  return <Toggle active={notificationsEnabled} onToggle={handleToggle} />;
}

export function SettingsDialog() {
  const {
    isSettingsOpen,
    closeSettings,
    navSettings,
    fetchNavSettings,
    getAuthHeaders,
    isAdmin,
    isEditorOrAdmin,
    isLoggedIn,
  } = useSettingsStore();

  const canEdit = isLoggedIn && isEditorOrAdmin();
  const canToggleAdminOnly = isLoggedIn && isAdmin();
  const orderedNavItems = useMemo(
    () => buildOrderedNavItems(navSettings),
    [navSettings]
  );

  useEffect(() => {
    if (isSettingsOpen) {
      fetchNavSettings();
    }
  }, [isSettingsOpen, fetchNavSettings]);

  const handleToggleHidden = async (nav_href: string, currentIsHidden: boolean) => {
    const headers = { "Content-Type": "application/json", ...getAuthHeaders() };
    try {
      await fetch("/api/nav-visibility", {
        method: "PUT",
        headers,
        body: JSON.stringify({ nav_href, is_hidden: !currentIsHidden }),
      });
      await fetchNavSettings();
    } catch {
      // silent — UI will reflect server state on next fetch
    }
  };

  const handleToggleAdminOnly = async (nav_href: string, currentAdminOnly: boolean) => {
    const headers = { "Content-Type": "application/json", ...getAuthHeaders() };
    try {
      await fetch("/api/nav-visibility", {
        method: "PUT",
        headers,
        body: JSON.stringify({ nav_href, admin_only: !currentAdminOnly }),
      });
      await fetchNavSettings();
    } catch {
      // silent
    }
  };

  const persistNavOrder = async (items: OrderedNavItem[]) => {
    const headers = { "Content-Type": "application/json", ...getAuthHeaders() };
    try {
      await Promise.all(
        items.map((item, index) =>
          fetch("/api/nav-visibility", {
            method: "PUT",
            headers,
            body: JSON.stringify({ nav_href: item.href, sort_order: index }),
          }),
        ),
      );
      await fetchNavSettings();
    } catch {
      await fetchNavSettings();
    }
  };

  const moveNavItem = async (index: number, direction: -1 | 1) => {
    if (!canEdit) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedNavItems.length) return;

    const next = [...orderedNavItems];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    await persistNavOrder(next);
  };

  return (
    <Sheet open={isSettingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <SheetContent side="right" className="flex flex-col w-96 sm:max-w-md p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle>設定</SheetTitle>
          <SheetDescription>アプリケーションの設定を管理します</SheetDescription>
        </SheetHeader>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* 一般設定 */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              一般設定
            </h3>
            <div className="space-y-3 rounded-md border border-border bg-popover p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">言語</span>
                <span className="text-sm text-muted-foreground">日本語</span>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">テーマ</span>
                <span className="text-sm text-muted-foreground">ダーク</span>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">通知</span>
                <NotificationsToggle />
              </div>
            </div>
          </section>

          {/* サイドバー表示設定 */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
              サイドバー表示設定
            </h3>

            {/* column headers */}
            <div className="flex items-center justify-end gap-6 px-3 pb-1">
              <span className="text-[10px] text-muted-foreground w-10 text-center">表示</span>
              <span className="text-[10px] text-muted-foreground w-10 text-center">管理者のみ</span>
              <span className="text-[10px] text-muted-foreground w-16 text-center">並び順</span>
            </div>

            <div className="rounded-md border border-border bg-popover divide-y divide-border">
              {orderedNavItems.map((item, index) => {
                const setting = navSettings.find((s) => s.nav_href === item.href);
                const isHidden = setting?.is_hidden ?? false;
                const adminOnly = setting?.admin_only ?? false;

                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between px-3 py-2 gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-sm text-foreground truncate">{item.label}</span>
                      {adminOnly && (
                        <Shield
                          className="shrink-0 text-amber-500"
                          size={12}
                          aria-label="管理者のみ"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      {/* 表示 toggle — active when NOT hidden */}
                      <Toggle
                        active={!isHidden}
                        onToggle={() => handleToggleHidden(item.href, isHidden)}
                        disabled={!canEdit}
                      />

                      {/* 管理者のみ toggle */}
                      <Toggle
                        active={adminOnly}
                        onToggle={() => handleToggleAdminOnly(item.href, adminOnly)}
                        disabled={!canToggleAdminOnly}
                      />

                      <button
                        type="button"
                        disabled={!canEdit || index === 0}
                        onClick={() => moveNavItem(index, -1)}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        title="上へ移動"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={!canEdit || index === orderedNavItems.length - 1}
                        onClick={() => moveNavItem(index, 1)}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        title="下へ移動"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
