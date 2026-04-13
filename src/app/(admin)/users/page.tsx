"use client";

import { Users, Shield, ShieldCheck, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const users = [
  {
    name: "田中 太郎",
    email: "tanaka@example.com",
    role: "管理者",
    lastLogin: "2026-04-09 10:23",
  },
  {
    name: "佐藤 花子",
    email: "sato@example.com",
    role: "編集者",
    lastLogin: "2026-04-08 18:45",
  },
  {
    name: "鈴木 一郎",
    email: "suzuki@example.com",
    role: "閲覧者",
    lastLogin: "2026-04-07 09:12",
  },
  {
    name: "高橋 美咲",
    email: "takahashi@example.com",
    role: "管理者",
    lastLogin: "2026-04-09 08:01",
  },
  {
    name: "伊藤 健太",
    email: "ito@example.com",
    role: "編集者",
    lastLogin: "2026-04-06 14:33",
  },
  {
    name: "渡辺 さくら",
    email: "watanabe@example.com",
    role: "閲覧者",
    lastLogin: "2026-04-05 21:10",
  },
  {
    name: "山本 大輔",
    email: "yamamoto@example.com",
    role: "編集者",
    lastLogin: "2026-04-09 07:55",
  },
];

const roleBadge: Record<string, string> = {
  管理者: "bg-red-500/20 text-red-400 ring-red-500/30",
  編集者: "bg-blue-500/20 text-blue-400 ring-blue-500/30",
  閲覧者: "bg-zinc-500/20 text-zinc-400 ring-zinc-500/30",
};

const roleIcon: Record<string, typeof Shield> = {
  管理者: ShieldCheck,
  編集者: Shield,
  閲覧者: User,
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
          <p className="text-sm text-muted-foreground">
            登録ユーザーの一覧と権限管理
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["管理者", "編集者", "閲覧者"] as const).map((role) => {
          const Icon = roleIcon[role];
          const count = users.filter((u) => u.role === role).length;
          return (
            <Card key={role}>
              <CardHeader>
                <CardDescription>{role}</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {count} 名
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>全 {users.length} 名のユーザー</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">名前</th>
                  <th className="pb-3 pr-4 font-medium">メールアドレス</th>
                  <th className="pb-3 pr-4 font-medium">ロール</th>
                  <th className="pb-3 font-medium">最終ログイン</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.email}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium">{user.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleBadge[user.role]}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {user.lastLogin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
