import { NextRequest } from "next/server";
import { listModels } from "@/lib/ai/providers";
import { ProviderId, ModelInfo } from "@/types/ai";

export async function GET(req: NextRequest) {
  try {
    const providerParam = req.nextUrl.searchParams.get("provider");

    if (providerParam) {
      if (providerParam !== "openrouter" && providerParam !== "lmstudio") {
        return Response.json({ error: "Invalid provider" }, { status: 400 });
      }

      const models = await listModels(providerParam as ProviderId);
      return Response.json({ models });
    }

    const providers: ProviderId[] = ["openrouter", "lmstudio"];
    const results: ModelInfo[] = [];

    await Promise.allSettled(
      providers.map(async (id) => {
        const models = await listModels(id);
        results.push(...models);
      })
    );

    return Response.json({ models: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load models";
    return Response.json({ error: message }, { status: 502 });
  }
}
