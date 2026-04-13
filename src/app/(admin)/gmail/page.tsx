"use client";

import { Inbox, Star, Paperclip, Mail, MailOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const emails = [
  {
    sender: "山田 拓也",
    email: "yamada@corp.jp",
    subject: "【重要】来週の会議アジェンダについて",
    preview: "お疲れ様です。来週月曜日の定例会議のアジェンダを共有します。今回は...",
    date: "10:23",
    read: false,
    starred: true,
    hasAttachment: true,
  },
  {
    sender: "株式会社テックソリューション",
    email: "info@techsol.co.jp",
    subject: "API連携に関するお見積もり",
    preview: "先日ご依頼いただきましたAPI連携の件につきまして、お見積もりを...",
    date: "09:45",
    read: false,
    starred: false,
    hasAttachment: true,
  },
  {
    sender: "中村 理恵",
    email: "nakamura@example.com",
    subject: "Re: デザインレビューのフィードバック",
    preview: "フィードバックありがとうございます。修正版を添付しましたので...",
    date: "昨日",
    read: true,
    starred: false,
    hasAttachment: false,
  },
  {
    sender: "GitHub",
    email: "notifications@github.com",
    subject: "[zoltraak] Pull Request #142: feat: add calendar view",
    preview: "takahashi requested your review on this pull request...",
    date: "昨日",
    read: true,
    starred: true,
    hasAttachment: false,
  },
  {
    sender: "小林 雅人",
    email: "kobayashi@example.com",
    subject: "プロジェクト進捗報告 - 4月第1週",
    preview: "今週の進捗をご報告いたします。フロントエンド実装が予定より...",
    date: "4月7日",
    read: true,
    starred: false,
    hasAttachment: true,
  },
  {
    sender: "AWS",
    email: "no-reply@aws.amazon.com",
    subject: "Your AWS bill for March 2026",
    preview: "Your total AWS charges for the billing period are...",
    date: "4月5日",
    read: true,
    starred: false,
    hasAttachment: false,
  },
  {
    sender: "松本 美優",
    email: "matsumoto@example.com",
    subject: "カスタマーサポート改善提案",
    preview: "先月のサポートチケット分析結果をまとめました。主な改善ポイントは...",
    date: "4月4日",
    read: true,
    starred: false,
    hasAttachment: true,
  },
];

export default function GmailPage() {
  const unreadCount = emails.filter((e) => !e.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="h-7 w-7 text-red-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gmail受信箱</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} 件の未読メール
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>受信トレイ</CardTitle>
          <CardDescription>全 {emails.length} 件</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {emails.map((email, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0 ${
                !email.read ? "bg-blue-500/5" : ""
              }`}
            >
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {email.read ? (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Mail className="h-4 w-4 text-blue-400" />
                )}
                <Star
                  className={`h-4 w-4 ${
                    email.starred
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate text-sm ${
                      !email.read ? "font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {email.sender}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {email.date}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p
                    className={`truncate text-sm ${
                      !email.read ? "font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {email.subject}
                  </p>
                  {email.hasAttachment && (
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground/70">
                  {email.preview}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
