import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "@/lib/utils";
import { ChatMessage, ProviderId, ModelInfo } from "@/types/ai";

const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderId, string> = {
  openrouter: "anthropic/claude-sonnet-4",
  lmstudio: "local-model",
};

interface ChatState {
  messages: ChatMessage[];
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedModelsByProvider: Record<ProviderId, string>;
  availableModelsByProvider: Record<ProviderId, ModelInfo[]>;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  isPanelOpen: boolean;

  addMessage: (msg: ChatMessage) => void;
  startStream: () => void;
  appendStreamChunk: (text: string) => void;
  finalizeStream: (model: string, provider: ProviderId) => void;
  resetStream: () => void;
  setProvider: (provider: ProviderId) => void;
  setModel: (model: string) => void;
  setAvailableModels: (provider: ProviderId, models: ModelInfo[]) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      selectedProvider: "openrouter",
      selectedModel: DEFAULT_MODEL_BY_PROVIDER.openrouter,
      selectedModelsByProvider: { ...DEFAULT_MODEL_BY_PROVIDER },
      availableModelsByProvider: {
        openrouter: [],
        lmstudio: [],
      },
      isStreaming: false,
      streamingContent: "",
      error: null,
      isPanelOpen: true,

      addMessage: (msg) =>
        set((s) => ({ messages: [...s.messages, msg] })),

      startStream: () =>
        set({
          isStreaming: true,
          streamingContent: "",
          error: null,
        }),

      appendStreamChunk: (text) =>
        set((s) => ({ streamingContent: s.streamingContent + text })),

      finalizeStream: (model, provider) => {
        const state = get();
        if (state.streamingContent) {
          const msg: ChatMessage = {
            id: createId(),
            role: "assistant",
            content: state.streamingContent,
            timestamp: Date.now(),
            model,
            provider,
          };
          set((s) => ({
            messages: [...s.messages, msg],
            isStreaming: false,
            streamingContent: "",
          }));
        } else {
          set({ isStreaming: false, streamingContent: "" });
        }
      },

      resetStream: () => set({ isStreaming: false, streamingContent: "" }),
      setProvider: (provider) =>
        set((state) => ({
          selectedProvider: provider,
          selectedModel:
            state.selectedModelsByProvider[provider] ?? DEFAULT_MODEL_BY_PROVIDER[provider],
        })),
      setModel: (model) =>
        set((state) => ({
          selectedModel: model,
          selectedModelsByProvider: {
            ...state.selectedModelsByProvider,
            [state.selectedProvider]: model,
          },
        })),
      setAvailableModels: (provider, models) =>
        set((state) => ({
          availableModelsByProvider: {
            ...state.availableModelsByProvider,
            [provider]: models,
          },
        })),
      setError: (error) => set({ error }),
      clearMessages: () =>
        set({
          messages: [],
          isStreaming: false,
          streamingContent: "",
          error: null,
        }),
      togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
      setPanelOpen: (open) => set({ isPanelOpen: open }),
    }),
    {
      name: "zoltraak-chat",
      partialize: (state) => ({
        messages: state.messages,
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        selectedModelsByProvider: state.selectedModelsByProvider,
        isPanelOpen: state.isPanelOpen,
      }),
    }
  )
);
