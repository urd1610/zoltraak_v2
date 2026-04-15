"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useChatStore } from "@/stores/chat-store";
import { usePageContextStore } from "@/stores/page-context-store";
import { createId, cn } from "@/lib/utils";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { parseActions, executeAction, stripActionBlocks } from "@/lib/ai/action-executor";
import type { ActionResult } from "@/lib/ai/action-executor";
import type { ChatCompletionChunk } from "@/types/ai";
import { Send, Square } from "lucide-react";

const SSE_EVENT_SEPARATOR = /\r?\n\r?\n/;

// Actions that should update the main page display (trigger loading animation & result storage)
const PAGE_UPDATE_ACTIONS = new Set([
  "server02_search",
  "schedule_add", "schedule_update", "schedule_delete",
  "gantt_add_project", "gantt_update_project", "gantt_delete_project",
  "gantt_add_task", "gantt_update_task", "gantt_delete_task",
]);

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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ file_name: string; file_path: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const imeComposingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const { currentPage, pageDescription, pageData, availableActions, triggerRefresh, setActionResults, setIsExecutingActions, actionResults } =
    usePageContextStore();

  // Extract files from the latest search result for @mention
  const mentionableFiles = useMemo(() => {
    if (currentPage !== "server02") return [];
    const searchAction = [...actionResults].reverse().find(
      (r) => r.action === "server02_search" && r.success
    );
    if (!searchAction?.data) return [];
    const data = searchAction.data as { files?: Array<{ id: number; file_name: string; file_path: string; extension: string | null; is_directory: boolean }> };
    return (data.files || []).filter(f => !f.is_directory);
  }, [currentPage, actionResults]);

  const filteredMentions = useMemo(() => {
    if (!showMentions) return [];
    const q = mentionQuery.toLowerCase();
    return mentionableFiles
      .filter(f => f.file_name.toLowerCase().includes(q) || f.file_path.toLowerCase().includes(q))
      .slice(0, 8);
  }, [showMentions, mentionQuery, mentionableFiles]);

  const selectMention = useCallback((file: { id: number; file_name: string; file_path: string; extension: string | null; is_directory: boolean }) => {
    const before = input.slice(0, mentionStartPos);
    const after = input.slice(mentionStartPos + 1 + mentionQuery.length);
    const newInput = `${before}@${file.file_name} ${after}`;
    setInput(newInput);
    setAttachedFiles(prev => {
      if (prev.some(f => f.file_path === file.file_path)) return prev;
      return [...prev, { file_name: file.file_name, file_path: file.file_path }];
    });
    setShowMentions(false);
    textareaRef.current?.focus();
  }, [input, mentionStartPos, mentionQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart ?? value.length;
    setInput(value);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex >= 0 && mentionableFiles.length > 0) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only show if no newline in the query (still typing the mention)
      if (!textAfterAt.includes("\n")) {
        setMentionQuery(textAfterAt);
        setMentionStartPos(atIndex);
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");

    let messageContent = text;
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(f =>
        `[添付ファイル: ${f.file_name} (パス: ${f.file_path})]`
      ).join("\n");
      messageContent = `${fileContext}\n\n${text}`;
    }

    const userMsg = {
      id: createId(),
      role: "user" as const,
      content: messageContent,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setAttachedFiles([]);

    startStream();

    // Build system prompt with page context
    const systemPrompt = buildSystemPrompt(
      currentPage
        ? { currentPage, pageDescription, pageData, availableActions }
        : null
    );

    const allMessages = [
      { role: "system" as const, content: systemPrompt },
      ...[...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

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

      // Check for action blocks in streaming content BEFORE finalizing
      // so we can set isExecutingActions=true without a gap
      const streamContent = useChatStore.getState().streamingContent;
      const actionCalls = parseActions(streamContent);
      console.log("[AI Action] Parsed actions from stream:", actionCalls.length, actionCalls);
      const hasPageUpdateAction = actionCalls.some((c) => PAGE_UPDATE_ACTIONS.has(c.action));

      if (hasPageUpdateAction) {
        setIsExecutingActions(true);
      }

      finalizeStream(selectedModel, selectedProvider);

      if (actionCalls.length > 0) {
        const results: ActionResult[] = [];
        for (const call of actionCalls) {
          console.log("[AI Action] Executing:", call.action, call.params);
          const result = await executeAction(call);
          console.log("[AI Action] Result:", result.action, result.success, result.message, result.data ? "has data" : "no data");
          results.push(result);
        }

        // Only update page display for actions that produce visual results
        // (e.g. search results). Read/browse actions stay in chat only.
        const pageResults = results.filter((r) => PAGE_UPDATE_ACTIONS.has(r.action));
        if (pageResults.length > 0) {
          console.log("[AI Action] Storing page results:", pageResults.length);
          setActionResults(pageResults);
        }
        setIsExecutingActions(false);

        // Add action result message
        const resultLines = results.map((r) =>
          r.success
            ? `✅ ${r.message}`
            : `❌ ${r.message}`
        );

        const resultMsg = {
          id: createId(),
          role: "assistant" as const,
          content: resultLines.join("\n"),
          timestamp: Date.now(),
          isActionResult: true,
        };
        addMessage(resultMsg);

        // Trigger page data refresh
        triggerRefresh();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        resetStream();
        setError((err as Error).message);
      }
    } finally {
      abortRef.current = null;
      // Always clear executing state on completion/error
      setIsExecutingActions(false);
    }
  }, [input, isStreaming, messages, selectedModel, selectedProvider, currentPage, pageDescription, pageData, availableActions, addMessage, startStream, appendStreamChunk, finalizeStream, resetStream, setError, triggerRefresh, setActionResults, setIsExecutingActions, attachedFiles, mentionableFiles, selectMention, filteredMentions]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    finalizeStream(selectedModel, selectedProvider);
  }, [selectedModel, selectedProvider, finalizeStream]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        selectMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

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
      {currentPage && (
        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{pageDescription}に接続中</span>
        </div>
      )}
      {/* Attached files chips */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {attachedFiles.map((f) => (
            <span
              key={f.file_path}
              className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary"
            >
              @{f.file_name}
              <button
                type="button"
                onClick={() => setAttachedFiles(prev => prev.filter(x => x.file_path !== f.file_path))}
                className="hover:text-destructive ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        {/* @mention dropdown */}
        {showMentions && filteredMentions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-sidebar-border bg-sidebar shadow-lg max-h-48 overflow-y-auto z-50">
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                検索結果のファイル
              </div>
              {filteredMentions.map((file, i) => (
                <button
                  key={file.id}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors",
                    i === mentionIndex
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  onMouseEnter={() => setMentionIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent textarea blur
                    selectMention(file);
                  }}
                >
                  <span className="truncate font-medium">{file.file_name}</span>
                  <span className="text-[10px] text-muted-foreground truncate ml-auto">{file.extension ? `.${file.extension}` : ""}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onCompositionStart={() => { imeComposingRef.current = true; }}
            onCompositionEnd={() => { requestAnimationFrame(() => { imeComposingRef.current = false; }); }}
            onKeyDown={handleKeyDown}
            placeholder={
              currentPage === "server02" && mentionableFiles.length > 0
                ? "@でファイルをメンション..."
                : currentPage
                  ? `${pageDescription}について質問や操作を入力...`
                  : "メッセージを入力..."
            }
            rows={1}
            className="flex-1 resize-none bg-sidebar-accent border border-sidebar-border rounded-lg px-3 py-2 text-sm text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px] max-h-[120px]"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
            onBlur={() => {
              // Delay hiding to allow click on dropdown
              setTimeout(() => setShowMentions(false), 200);
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
    </div>
  );
}
