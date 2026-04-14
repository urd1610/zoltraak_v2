export type ProviderId = "openrouter" | "lmstudio";

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
  model?: string;
  provider?: ProviderId;
  isActionResult?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
}

export interface ChatRequest {
  messages: Pick<ChatMessage, "role" | "content">[];
  model: string;
  provider: ProviderId;
  stream: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: { content?: string; role?: string };
    finish_reason: string | null;
    index: number;
  }>;
  model: string;
}
