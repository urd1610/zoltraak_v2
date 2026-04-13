"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ChatPanel } from "@/components/ai-chat/chat-panel";
import { SettingsDialog } from "@/components/layout/settings-dialog";
import { LoginDialog } from "@/components/layout/login-dialog";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <ChatPanel />
      <SettingsDialog />
      <LoginDialog />
    </div>
  );
}
