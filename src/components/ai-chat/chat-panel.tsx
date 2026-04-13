"use client";

import { useChatStore } from "@/stores/chat-store";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ModelSelector } from "./model-selector";
import { X, Trash2 } from "lucide-react";

export function ChatPanel() {
  const { isPanelOpen, setPanelOpen, clearMessages, messages } = useChatStore();

  if (!isPanelOpen) return null;

  return (
    <aside className="flex flex-col w-[360px] shrink-0 h-full bg-sidebar border-l border-sidebar-border">
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        <span className="text-sm font-semibold text-sidebar-foreground">
          AIアシスタント
        </span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="会話をクリア"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => setPanelOpen(false)}
            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <ModelSelector />
      <MessageList />
      <ChatInput />
    </aside>
  );
}
