"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settings-store";

interface UserData {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

type UserRole = "admin" | "editor" | "viewer";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理者",
  editor: "編集者",
  viewer: "閲覧者",
};

const roleBadge: Record<UserRole, string> = {
  admin: "bg-red-500/20 text-red-400 ring-red-500/30",
  editor: "bg-blue-500/20 text-blue-400 ring-blue-500/30",
  viewer: "bg-zinc-500/20 text-zinc-400 ring-zinc-500/30",
};

const roleIcon: Record<UserRole, typeof Shield> = {
  admin: ShieldCheck,
  editor: Shield,
  viewer: UserIcon,
};

interface NewUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface EditUserForm {
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UsersPage() {
  const { isLoggedIn, isAdmin, getAuthHeaders } = useSettingsStore();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New user form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewUserForm>({
    name: "",
    email: "",
    password: "",
    role: "viewer",
  });
  const [newFormError, setNewFormError] = useState<string | null>(null);
  const [newFormLoading, setNewFormLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: "",
    email: "",
    role: "viewer",
    is_active: true,
    password: "",
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormLoading, setEditFormLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", { headers: getAuthHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (isLoggedIn && isAdmin()) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, isAdmin, fetchUsers]);

  // Access denied
  if (!isLoggedIn || !isAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">管理者権限が必要です</h1>
        <p className="text-sm text-muted-foreground">
          このページにアクセスするには管理者としてログインしてください
        </p>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === "admin").length;
  const editorCount = users.filter((u) => u.role === "editor").length;
  const viewerCount = users.filter((u) => u.role === "viewer").length;

  // Handlers
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setNewFormError(null);
    setNewFormLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setShowNewForm(false);
      setNewForm({ name: "", email: "", password: "", role: "viewer" });
      await fetchUsers();
    } catch (e) {
      setNewFormError(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setNewFormLoading(false);
    }
  }

  function startEdit(user: UserData) {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password: "",
    });
    setEditFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFormError(null);
  }

  async function handleSave(id: number) {
    setEditFormError(null);
    setEditFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        id,
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.password) body.password = editForm.password;
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setEditingId(null);
      await fetchUsers();
    } catch (e) {
      setEditFormError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setEditFormLoading(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
            <p className="text-sm text-muted-foreground">
              登録ユーザーの一覧と権限管理
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setShowNewForm((v) => !v);
            setNewFormError(null);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          新規ユーザー
        </Button>
      </div>

      {/* New user form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新規ユーザーを作成</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">名前</label>
                  <Input
                    required
                    placeholder="山田 太郎"
                    value={newForm.name}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">メールアドレス</label>
                  <Input
                    required
                    type="email"
                    placeholder="user@example.com"
                    value={newForm.email}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">パスワード</label>
                  <Input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={newForm.password}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">ロール</label>
                  <select
                    value={newForm.role}
                    onChange={(e) =>
                      setNewForm((f) => ({
                        ...f,
                        role: e.target.value as UserRole,
                      }))
                    }
                    className="w-full bg-secondary border border-border rounded-md text-sm px-2 py-1.5 text-foreground"
                  >
                    <option value="admin">管理者</option>
                    <option value="editor">編集者</option>
                    <option value="viewer">閲覧者</option>
                  </select>
                </div>
              </div>

              {newFormError && (
                <p className="text-sm text-destructive">{newFormError}</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={newFormLoading}>
                  {newFormLoading ? "作成中..." : "作成"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewFormError(null);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {(["admin", "editor", "viewer"] as UserRole[]).map((role) => {
          const Icon = roleIcon[role];
          const count =
            role === "admin"
              ? adminCount
              : role === "editor"
              ? editorCount
              : viewerCount;
          return (
            <Card key={role}>
              <CardHeader>
                <CardDescription>{ROLE_LABEL[role]}</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {loading ? "—" : `${count} 名`}
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* User table */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>
            {loading ? "読み込み中..." : `全 ${users.length} 名のユーザー`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              読み込み中...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">名前</th>
                    <th className="pb-3 pr-4 font-medium">メールアドレス</th>
                    <th className="pb-3 pr-4 font-medium">ロール</th>
                    <th className="pb-3 pr-4 font-medium">ステータス</th>
                    <th className="pb-3 pr-4 font-medium">最終ログイン</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isEditing = editingId === user.id;
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        {isEditing ? (
                          <>
                            {/* Editing row */}
                            <td className="py-2 pr-4">
                              <Input
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    name: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    email: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <select
                                value={editForm.role}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    role: e.target.value as UserRole,
                                  }))
                                }
                                className="bg-secondary border border-border rounded-md text-sm px-2 py-1.5 text-foreground"
                              >
                                <option value="admin">管理者</option>
                                <option value="editor">編集者</option>
                                <option value="viewer">閲覧者</option>
                              </select>
                            </td>
                            <td className="py-2 pr-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditForm((f) => ({
                                    ...f,
                                    is_active: !f.is_active,
                                  }))
                                }
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset cursor-pointer transition-colors ${
                                  editForm.is_active
                                    ? "bg-green-500/20 text-green-400 ring-green-500/30"
                                    : "bg-red-500/20 text-red-400 ring-red-500/30"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    editForm.is_active
                                      ? "bg-green-400"
                                      : "bg-red-400"
                                  }`}
                                />
                                {editForm.is_active ? "有効" : "無効"}
                              </button>
                            </td>
                            <td className="py-2 pr-4">
                              <Input
                                type="password"
                                placeholder="新パスワード（任意）"
                                value={editForm.password}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    password: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm w-40"
                              />
                              {editFormError && (
                                <p className="text-xs text-destructive mt-1">
                                  {editFormError}
                                </p>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                  onClick={() => handleSave(user.id)}
                                  disabled={editFormLoading}
                                  title="保存"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={cancelEdit}
                                  title="キャンセル"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Normal row */}
                            <td className="py-3 pr-4 font-medium">
                              {user.name}
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              {user.email}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleBadge[user.role]}`}
                              >
                                {ROLE_LABEL[user.role]}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                  user.is_active
                                    ? "bg-green-500/20 text-green-400 ring-green-500/30"
                                    : "bg-red-500/20 text-red-400 ring-red-500/30"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    user.is_active
                                      ? "bg-green-400"
                                      : "bg-red-400"
                                  }`}
                                />
                                {user.is_active ? "有効" : "無効"}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              {formatDate(user.last_login_at)}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => startEdit(user)}
                                  title="編集"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    handleDelete(user.id, user.name)
                                  }
                                  title="削除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        ユーザーが見つかりません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
