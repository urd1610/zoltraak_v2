"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settings-store";
import type { AuthUser } from "@/stores/settings-store";

function RoleBadge({ role }: { role: AuthUser["role"] }) {
  const config: Record<
    AuthUser["role"],
    { label: string; className: string }
  > = {
    admin: {
      label: "管理者",
      className:
        "bg-red-500/10 text-red-400 ring-red-500/30",
    },
    editor: {
      label: "編集者",
      className:
        "bg-blue-500/10 text-blue-400 ring-blue-500/30",
    },
    viewer: {
      label: "閲覧者",
      className:
        "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30",
    },
  };

  const { label, className } = config[role];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

export function LoginDialog() {
  const { isLoginOpen, closeLogin, isLoggedIn, user, login, logout, fetchNavSettings } =
    useSettingsStore();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? "ログインに失敗しました。");
        return;
      }

      const data: { token: string; user: AuthUser } = await res.json();
      login(data.token, data.user);
      await fetchNavSettings();
      setEmail("");
      setPassword("");
      closeLogin();
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    closeLogin();
  }

  return (
    <Sheet open={isLoginOpen} onOpenChange={(open: boolean) => !open && closeLogin()}>
      <SheetContent side="right" className="bg-popover text-foreground">
        {isLoggedIn && user ? (
          <>
            <SheetHeader>
              <SheetTitle>アカウント</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col items-center gap-4 px-4 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-base font-medium text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <RoleBadge role={user.role} />
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                ログアウト
              </Button>
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>ログイン</SheetTitle>
              <SheetDescription>
                アカウントにログインしてください
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    メールアドレス
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@example.com"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    パスワード
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={loading}
              >
                {loading ? "ログイン中..." : "ログイン"}
              </Button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
