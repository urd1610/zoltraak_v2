import { ChatRequest, ModelInfo, ProviderId } from "@/types/ai";

interface ProviderConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

function getProviderConfig(provider: ProviderId): ProviderConfig {
  switch (provider) {
    case "openrouter":
      return {
        baseUrl: process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
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

  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: config.headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.data || []).map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || m.id,
      provider,
    }));
  } catch {
    return [];
  }
}
