"use client";

import { useChatStore } from "@/stores/chat-store";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const { isPanelOpen, togglePanel } = useChatStore();

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Breadcrumb or page title will be rendered by page content */}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={togglePanel}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
            isPanelOpen
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <MessageSquare size={16} />
          <span className="hidden sm:inline">AI</span>
        </button>
      </div>
    </header>
  );
}
