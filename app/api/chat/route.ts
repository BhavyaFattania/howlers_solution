import { NextResponse } from "next/server";
import { chat, chatJSON } from "@/lib/llm";
import { createServer, createAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VOICE_SYSTEM = `You are SamaajSetu's "Considerate Voice" assistant.
Listen to a volunteer's concern with empathy. Reply in 1–2 sentences acknowledging the
issue and what will happen next. Avoid promises about timelines.`;

const CLASSIFY_SYSTEM = `Classify a volunteer concern into one of:
- "relational" (trust, community, social fit, recognition)
- "value_based" (mission alignment, organizational ethics)
- "transactional" (logistics, expenses, scheduling, supplies)
- "other"
Also produce a sentiment score in [-1, 1] and 1-3 short theme tags.
Return ONLY JSON: {"classification":"...","sentiment":<num>,"themes":[...]}`;

export async function POST(req: Request) {
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { message } = await req.json();
  if (!message || typeof message !== "string")
    return NextResponse.json({ error: "message required" }, { status: 400 });

  // Reply
  const reply = await chat(
    [
      { role: "system", content: VOICE_SYSTEM },
      { role: "user", content: message },
    ],
    { temperature: 0.5, maxTokens: 220 }
  );

  // Classify in parallel-ish
  let classification = "other";
  let sentiment = 0;
  let themes: string[] = [];
  try {
    const c = await chatJSON<{
      classification: string;
      sentiment: number;
      themes: string[];
    }>(`Concern: ${message}`, CLASSIFY_SYSTEM, { temperature: 0.1, maxTokens: 200 });
    classification = c.classification;
    sentiment = c.sentiment;
    themes = c.themes ?? [];
  } catch {}

  // Persist
  const { data: profile } = await supa
    .from("profiles").select("tenant_id").eq("id", u.user.id).single();

  if (profile?.tenant_id) {
    const admin = createAdmin();
    await admin.from("voice_tickets").insert({
      tenant_id: profile.tenant_id,
      volunteer_id: u.user.id,
      message,
      classification,
      sentiment,
      themes,
      reply,
    });
  }

  return NextResponse.json({ reply, classification, sentiment, themes });
}
