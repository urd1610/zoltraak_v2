"use client";

import { useState } from "react";
import { Send, Mail, Clock, CheckCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

const sentHistory = [
  {
    to: "tanaka@example.com",
    subject: "4月のウェビナーご案内",
    date: "2026-04-09 10:00",
    status: "送信済",
  },
  {
    to: "sato@example.com",
    subject: "アカウント更新のお知らせ",
    date: "2026-04-08 15:30",
    status: "送信済",
  },
  {
    to: "suzuki@example.com",
    subject: "お支払い確認のご連絡",
    date: "2026-04-08 09:15",
    status: "失敗",
  },
  {
    to: "takahashi@example.com",
    subject: "新機能リリースのお知らせ",
    date: "2026-04-07 14:00",
    status: "送信済",
  },
  {
    to: "ito@example.com",
    subject: "サービスメンテナンスのご案内",
    date: "2026-04-06 11:45",
    status: "送信済",
  },
  {
    to: "watanabe@example.com",
    subject: "ご契約更新についてのご連絡",
    date: "2026-04-05 16:20",
    status: "送信済",
  },
];

const statusStyle: Record<string, { class: string; icon: typeof CheckCircle }> = {
  送信済: { class: "text-green-400", icon: CheckCircle },
  失敗: { class: "text-red-400", icon: XCircle },
};

export default function EmailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">メール送信</h1>
          <p className="text-sm text-muted-foreground">
            メールの作成と送信履歴の管理
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新規メール作成</CardTitle>
          <CardDescription>宛先と内容を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              宛先
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full rounded-lg border border-border bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              件名
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="メールの件名を入力"
              className="w-full rounded-lg border border-border bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              本文
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="メール本文を入力してください..."
              className="w-full resize-y rounded-lg border border-border bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <button className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500">
            <Send className="h-4 w-4" />
            送信
          </button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>送信履歴</CardTitle>
          <CardDescription>直近の送信メール一覧</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">宛先</th>
                  <th className="pb-3 pr-4 font-medium">件名</th>
                  <th className="pb-3 pr-4 font-medium">送信日時</th>
                  <th className="pb-3 font-medium">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {sentHistory.map((mail, i) => {
                  const st = statusStyle[mail.status];
                  const Icon = st.icon;
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4 font-mono text-xs">
                        {mail.to}
                      </td>
                      <td className="py-3 pr-4">{mail.subject}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {mail.date}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${st.class}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {mail.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
