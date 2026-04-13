import { NextRequest } from "next/server";
import { listModels } from "@/lib/ai/providers";
import { ProviderId, ModelInfo } from "@/types/ai";

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("provider") as ProviderId | null;
  const providers: ProviderId[] = providerId ? [providerId] : ["openrouter", "lmstudio"];

  const results: ModelInfo[] = [];

  await Promise.allSettled(
    providers.map(async (id) => {
      const models = await listModels(id);
      results.push(...models);
    })
  );

  return Response.json({ models: results });
}
