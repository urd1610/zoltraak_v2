"use client";

import { useState, useRef, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { createId } from "@/lib/utils";
import type { ChatCompletionChunk } from "@/types/ai";
import { Send, Square } from "lucide-react";

const SSE_EVENT_SEPARATOR = /\r?\n\r?\n/;

function getSseEventData(rawEvent: string) {
  const dataLines = rawEvent
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join("\n").trim();
}

export function ChatInput() {
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  /** IME 変換中・確定直後は Enter で送信しない（compositionEnd が keydown より先に来る環境対策） */
  const imeComposingRef = useRef(false);
  const {
    isStreaming,
    selectedModel,
    selectedProvider,
    messages,
    error,
    addMessage,
    startStream,
    appendStreamChunk,
    finalizeStream,
    resetStream,
    setError,
  } = useChatStore();

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");

    const userMsg = {
      id: createId(),
      role: "user" as const,
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    startStream();

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          model: selectedModel,
          provider: selectedProvider,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasAssistantContent = false;
      let streamCompleted = false;

      const processEvent = (rawEvent: string) => {
        const data = getSseEventData(rawEvent);
        if (!data) {
          return false;
        }

        if (data === "[DONE]") {
          return true;
        }

        try {
          const chunk = JSON.parse(data) as ChatCompletionChunk;
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            hasAssistantContent = true;
            appendStreamChunk(content);
          }
        } catch {
          // skip malformed chunks
        }

        return false;
      };

      while (!streamCompleted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(SSE_EVENT_SEPARATOR);
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (processEvent(event)) {
            streamCompleted = true;
            break;
          }
        }
      }

      buffer += decoder.decode();
      if (!streamCompleted && buffer.trim()) {
        const trailingEvents = buffer.split(SSE_EVENT_SEPARATOR);
        for (const event of trailingEvents) {
          if (processEvent(event)) {
            streamCompleted = true;
            break;
          }
        }
      }

      if (!hasAssistantContent) {
        resetStream();
        setError("AIから空の応答が返されました。再度お試しください。");
        return;
      }

      finalizeStream(selectedModel, selectedProvider);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        resetStream();
        setError((err as Error).message);
      }
    } finally {
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, selectedModel, selectedProvider, addMessage, startStream, appendStreamChunk, finalizeStream, resetStream, setError]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    finalizeStream(selectedModel, selectedProvider);
  }, [selectedModel, selectedProvider, finalizeStream]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing || imeComposingRef.current) return;
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="border-t border-sidebar-border p-3">
      {error && (
        <p className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => {
            imeComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            requestAnimationFrame(() => {
              imeComposingRef.current = false;
            });
          }}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          rows={1}
          className="flex-1 resize-none bg-sidebar-accent border border-sidebar-border rounded-lg px-3 py-2 text-sm text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px] max-h-[120px]"
          style={{ height: "auto", overflow: "hidden" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
        />
        {isStreaming ? (
          <button
            onClick={stopStreaming}
            className="shrink-0 p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
