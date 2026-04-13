import { ChatRequest, ModelInfo, ProviderId } from "@/types/ai";
import { sortModelsForDisplay } from "./model-sort";

interface ProviderConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

interface OpenRouterModelSummary {
  id?: string;
  name?: string;
}

function getProviderConfig(provider: ProviderId): ProviderConfig {
  switch (provider) {
    case "openrouter":
      return {
        baseUrl: process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1",
        headers: {
          ...(process.env.OPENROUTER_API_KEY
            ? { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
            : {}),
          ...(process.env.SITE_URL ? { "HTTP-Referer": process.env.SITE_URL } : {}),
          "X-Title": "Zoltraak",
        },
      };
    case "lmstudio":
      return {
        baseUrl: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
        headers: {},
      };
  }
}

export async function streamChat(
  request: ChatRequest,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const config = getProviderConfig(request.provider);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...config.headers },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`${request.provider}: HTTP ${response.status} - ${errorText}`);
  }

  return response.body;
}

export async function listModels(provider: ProviderId): Promise<ModelInfo[]> {
  const config = getProviderConfig(provider);
  const url = new URL(`${config.baseUrl}/models`);

  if (provider === "openrouter") {
    // OpenRouter defaults to text output, but set it explicitly for stable counts.
    url.searchParams.set("output_modalities", "text");
  }

  const response = await fetch(url, {
    headers: config.headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`${provider}: HTTP ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rawModels = Array.isArray(data?.data) ? (data.data as OpenRouterModelSummary[]) : null;

  if (!rawModels) {
    throw new Error(`${provider}: Invalid models response`);
  }

  const models: ModelInfo[] = rawModels
    .filter((model): model is Required<Pick<OpenRouterModelSummary, "id">> & OpenRouterModelSummary =>
      typeof model.id === "string" && model.id.length > 0
    )
    .map((model) => ({
      id: model.id,
      name: model.name || model.id,
      provider,
    }));

  return sortModelsForDisplay(models);
}
