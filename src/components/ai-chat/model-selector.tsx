"use client";

import { useChatStore } from "@/stores/chat-store";
import { ProviderId } from "@/types/ai";
import { useEffect } from "react";

const defaultModels: Record<ProviderId, { id: string; name: string }[]> = {
  openrouter: [
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "anthropic/claude-haiku-4", name: "Claude Haiku 4" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash" },
  ],
  lmstudio: [
    { id: "local-model", name: "ローカルモデル" },
  ],
};

export function ModelSelector() {
  const { selectedProvider, selectedModel, setProvider, setModel, availableModels, setAvailableModels } =
    useChatStore();

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(`/api/models?provider=${selectedProvider}`);
        const data = await res.json();
        if (data.models?.length > 0) {
          setAvailableModels(data.models);
        }
      } catch {
        // Use defaults on error
      }
    }
    fetchModels();
  }, [selectedProvider, setAvailableModels]);

  const models = availableModels.length > 0
    ? availableModels.filter((m) => m.provider === selectedProvider)
    : defaultModels[selectedProvider];

  return (
    <div className="flex gap-2 px-3 py-2 border-b border-sidebar-border">
      <select
        value={selectedProvider}
        onChange={(e) => {
          const provider = e.target.value as ProviderId;
          setProvider(provider);
          const first = defaultModels[provider]?.[0];
          if (first) setModel(first.id);
        }}
        className="flex-1 h-8 px-2 text-xs bg-sidebar-accent border border-sidebar-border rounded-md text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="openrouter">OpenRouter</option>
        <option value="lmstudio">LM Studio</option>
      </select>

      <select
        value={selectedModel}
        onChange={(e) => setModel(e.target.value)}
        className="flex-1 h-8 px-2 text-xs bg-sidebar-accent border border-sidebar-border rounded-md text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
