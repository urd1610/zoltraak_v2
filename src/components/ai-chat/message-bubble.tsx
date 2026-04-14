"use client";

import { ChatMessage } from "@/types/ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { User, Bot, Zap } from "lucide-react";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

/** Hide ```action ... ``` blocks from displayed content */
function cleanDisplayContent(content: string): string {
  return content.replace(/```action\s*\n?[\s\S]*?```/g, "").trim();
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";
  const isActionResult = !!(message as ChatMessage & { isActionResult?: boolean }).isActionResult;

  if (isActionResult) {
    return (
      <div className="flex gap-2 flex-row">
        <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 bg-amber-500/20 text-amber-500">
          <Zap size={14} />
        </div>
        <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-amber-500/10 text-foreground border border-amber-500/20">
          <div className="whitespace-pre-wrap text-xs font-medium">{message.content}</div>
        </div>
      </div>
    );
  }

  const displayContent = isUser ? message.content : cleanDisplayContent(message.content);

  // Don't show empty assistant messages (all content was action blocks)
  if (!isUser && !displayContent && !isStreaming) return null;

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5",
          isUser ? "bg-primary/20 text-primary" : "bg-chart-2/20 text-chart-2"
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary/15 text-foreground"
            : "bg-card text-foreground border border-border"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{displayContent}</p>
        ) : (
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
