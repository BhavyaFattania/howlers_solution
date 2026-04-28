/**
 * OpenRouter-backed Gemini client.
 *
 * Why OpenRouter? — the user has credits there and prefers a single gateway.
 * OpenRouter is OpenAI-compatible, so we use the official `openai` SDK with a
 * custom baseURL and route Gemini models like `google/gemini-2.5-flash`.
 *
 * Migration note: to move to Vertex AI later, swap this file's createClient()
 * for the @google-cloud/vertexai SDK — call sites stay the same.
 */
import OpenAI from "openai";

const baseURL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const apiKey = process.env.OPENROUTER_API_KEY;

let _client: OpenAI | null = null;
function client() {
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  if (!_client) {
    _client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "SamaajSetu",
      },
    });
  }
  return _client;
}

export const MODELS = {
  default: process.env.LLM_MODEL || "google/gemini-2.5-flash",
  fast: process.env.LLM_MODEL_FAST || "google/gemini-2.0-flash-001",
  embedding: process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small",
};

export const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || "1536", 10);

/**
 * Embed text via OpenRouter's OpenAI-compatible embeddings endpoint.
 * Default model: openai/text-embedding-3-small (1536-dim, ~1¢ / 1M tokens).
 */
export async function embed(text: string): Promise<number[]> {
  const r = await client().embeddings.create({
    model: MODELS.embedding,
    input: text,
  });
  return r.data[0].embedding as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const r = await client().embeddings.create({
    model: MODELS.embedding,
    input: texts,
  });
  // OpenAI returns items in input order
  return r.data.map((d) => d.embedding as number[]);
}

export async function chat(messages: { role: "system" | "user" | "assistant"; content: string }[], opts?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const r = await client().chat.completions.create({
    model: opts?.model ?? MODELS.default,
    temperature: opts?.temperature ?? 0.4,
    max_tokens: opts?.maxTokens ?? 1024,
    messages,
  });
  return r.choices[0]?.message?.content ?? "";
}

/**
 * Ask Gemini for strict JSON. Strips ```json fences if the model adds them.
 */
export async function chatJSON<T = unknown>(
  prompt: string,
  systemHint = "Return ONLY valid minified JSON. No prose, no code fences.",
  opts?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<T> {
  const raw = await chat(
    [
      { role: "system", content: systemHint },
      { role: "user", content: prompt },
    ],
    { ...opts, temperature: opts?.temperature ?? 0.2 }
  );
  return parseJSONLoose<T>(raw);
}

export function parseJSONLoose<T>(raw: string): T {
  let s = (raw ?? "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  // Find the first {...} or [...] block if there's leading prose
  const firstBrace = s.search(/[{\[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);
  return JSON.parse(s) as T;
}
