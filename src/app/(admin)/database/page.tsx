"use client";

import { useState } from "react";
import { Database, Play, Table, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

const sampleResults = [
  { id: 1, name: "田中 太郎", email: "tanaka@example.com", plan: "プロ", created_at: "2025-11-03" },
  { id: 2, name: "佐藤 花子", email: "sato@example.com", plan: "ビジネス", created_at: "2025-12-15" },
  { id: 3, name: "鈴木 一郎", email: "suzuki@example.com", plan: "スターター", created_at: "2026-01-22" },
  { id: 4, name: "高橋 美咲", email: "takahashi@example.com", plan: "プロ", created_at: "2026-02-08" },
  { id: 5, name: "伊藤 健太", email: "ito@example.com", plan: "ビジネス", created_at: "2026-03-14" },
];

const columns = ["id", "name", "email", "plan", "created_at"] as const;

export default function DatabasePage() {
  const [query, setQuery] = useState(
    "SELECT id, name, email, plan, created_at\nFROM users\nORDER BY created_at DESC\nLIMIT 10;"
  );
  const [executed, setExecuted] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DB操作</h1>
          <p className="text-sm text-muted-foreground">
            SQLクエリの実行とデータベース管理
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            SQLエディタ
          </CardTitle>
          <CardDescription>
            クエリを入力して実行ボタンを押してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExecuted(false);
            }}
            className="h-36 w-full resize-y rounded-lg border border-border bg-zinc-900 p-4 font-mono text-sm text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder="SELECT * FROM ..."
            spellCheck={false}
          />
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            本番データベースに接続中
          </div>
          <button
            onClick={() => setExecuted(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            <Play className="h-4 w-4" />
            実行
          </button>
        </CardFooter>
      </Card>

      {executed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5 text-muted-foreground" />
              クエリ結果
            </CardTitle>
            <CardDescription>
              {sampleResults.length} 行を取得 (実行時間: 23ms)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {columns.map((col) => (
                      <th key={col} className="pb-3 pr-4 font-mono font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleResults.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4 font-mono text-muted-foreground">
                        {row.id}
                      </td>
                      <td className="py-3 pr-4">{row.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.email}
                      </td>
                      <td className="py-3 pr-4">{row.plan}</td>
                      <td className="py-3 text-muted-foreground">
                        {row.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
