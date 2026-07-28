import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithRadarAI, type ChatMessage } from "@/lib/ai/provider";

const bodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  selectedFlightId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const reply = await chatWithRadarAI(
    parsed.data.messages as ChatMessage[],
    { selectedFlightId: parsed.data.selectedFlightId }
  );

  return NextResponse.json({
    message: { role: "assistant", content: reply },
  });
}
