import { NextRequest } from "next/server";
import { streamChat } from "@/lib/ai/providers";
import { ChatRequest } from "@/types/ai";

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();

    if (!body.messages || !body.model || !body.provider) {
      return new Response("Invalid request", { status: 400 });
    }

    const upstream = await streamChat(body, req.signal);

    return new Response(upstream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
