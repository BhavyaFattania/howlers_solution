import { NextResponse } from "next/server";
import { parseDocument } from "@/lib/llamaparse";
import { redactPII } from "@/lib/pii";
import { chatJSON } from "@/lib/llm";
import type { ExtractedNeedDraft } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You convert messy OCR'd community-need surveys into a structured JSON Need draft.
Return ONLY JSON matching this TypeScript shape:
{
  "title": string,                // 6-12 words
  "description": string,          // 1-2 sentences
  "category": string,             // e.g. "disaster_relief","tutoring","health","food_distribution","other"
  "urgency": "low"|"medium"|"high"|"critical",
  "required_skills": string[],    // 1-5 short snake_case tags
  "languages_helpful": string[],  // ISO-639-1 codes (gu, hi, en, etc.)
  "geo_hint": string|null,        // freeform location string if extractable, else null
  "headcount_required": number    // integer >= 1
}`;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob))
    return NextResponse.json({ error: "file required" }, { status: 400 });

  let markdown: string;
  try {
    markdown = await parseDocument(file, (file as File).name ?? "upload");
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `parse failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }

  const safe = redactPII(markdown);

  let draft: ExtractedNeedDraft;
  try {
    draft = await chatJSON<ExtractedNeedDraft>(
      `Convert this surveyed need into the JSON shape described.\n\nSURVEY:\n${safe}`,
      SYSTEM,
      { temperature: 0.1, maxTokens: 600 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `extraction failed: ${e instanceof Error ? e.message : String(e)}`, markdown: safe },
      { status: 502 }
    );
  }

  return NextResponse.json({ markdown: safe, draft });
}
