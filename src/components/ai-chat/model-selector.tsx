"use client";

import { useChatStore } from "@/stores/chat-store";
import { sortModelsForDisplay } from "@/lib/ai/model-sort";
import { ModelInfo, ProviderId } from "@/types/ai";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function getModelLabel(provider: ProviderId, modelId: string) {
  return defaultModels[provider].find((model) => model.id === modelId)?.name ?? modelId;
}

function mergeModels(
  provider: ProviderId,
  models: Array<Pick<ModelInfo, "id" | "name">>
): ModelInfo[] {
  const deduped = new Map<string, ModelInfo>();

  for (const model of models) {
    deduped.set(model.id, {
      id: model.id,
      name: model.name,
      provider,
    });
  }

  return Array.from(deduped.values());
}

export function ModelSelector() {
  const {
    selectedProvider,
    selectedModel,
    setProvider,
    setModel,
    availableModelsByProvider,
    setAvailableModels,
  } = useChatStore();

  useEffect(() => {
    const controller = new AbortController();

    async function fetchModels() {
      try {
        const res = await fetch(`/api/models?provider=${selectedProvider}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setAvailableModels(selectedProvider, data.models ?? []);
      } catch {
        // Keep the current in-memory cache/defaults when fetching fails.
      }
    }
    fetchModels();

    return () => controller.abort();
  }, [selectedProvider, setAvailableModels]);

  const providerModels = availableModelsByProvider[selectedProvider] ?? [];
  const baseModels = mergeModels(selectedProvider, [
    ...defaultModels[selectedProvider],
    ...providerModels,
  ]);

  const selectedModelLabel =
    baseModels.find((model) => model.id === selectedModel)?.name ??
    providerModels.find((model) => model.id === selectedModel)?.name ??
    getModelLabel(selectedProvider, selectedModel);

  const selectedModelOption: ModelInfo = {
    id: selectedModel,
    name: selectedModelLabel,
    provider: selectedProvider,
  };

  const mergedModels = baseModels.some((model) => model.id === selectedModel)
    ? baseModels
    : mergeModels(selectedProvider, [...baseModels, selectedModelOption]);

  const models =
    selectedProvider === "openrouter"
      ? sortModelsForDisplay(mergedModels)
      : mergedModels;

  const modelItems = models.map((model) => ({
    value: model.id,
    label: model.name,
  }));

  return (
    <div className="flex gap-2 px-3 py-2 border-b border-sidebar-border">
      <select
        value={selectedProvider}
        onChange={(e) => {
          const provider = e.target.value as ProviderId;
          setProvider(provider);
        }}
        className="flex-1 h-8 px-2 text-xs bg-sidebar-accent border border-sidebar-border rounded-md text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="openrouter">OpenRouter</option>
        <option value="lmstudio">LM Studio</option>
      </select>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Select items={modelItems} value={selectedModel} onValueChange={(value) => value && setModel(value)}>
          <SelectTrigger className="h-8 w-full min-w-0 bg-sidebar-accent px-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProvider === "openrouter" && (
          <p className="px-1 text-[10px] text-muted-foreground">
            {providerModels.length > 0 ? `${providerModels.length} models loaded` : "Loading models..."}
          </p>
        )}
      </div>
    </div>
  );
}
