/**
 * Qdrant Cloud vector store with OpenRouter-provided OpenAI embeddings.
 *
 * Embeddings: openai/text-embedding-3-small (1536-dim, OpenAI-compatible)
 * routed through OpenRouter so we keep one API key and one provider.
 *
 * Two collections, both Cosine distance:
 *  - samaajsetu_needs       (one point per Need)
 *  - samaajsetu_volunteers  (one point per volunteer Profile)
 *
 * Migration to GCP later: swap this file for a Vertex AI Vector Search
 * implementation — call sites elsewhere stay identical.
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { embed, EMBEDDING_DIM } from "@/lib/llm";

// ---------- Types (compatible with previous chroma surface) ----------

export const COL = {
  needs: "samaajsetu_needs",
  volunteers: "samaajsetu_volunteers",
} as const;

type CollectionName = (typeof COL)[keyof typeof COL];

export interface VolumeDoc {
  id: string;
  document: string;
  metadata: Record<string, string | number | boolean>;
}

export interface QueryHit {
  id: string;
  distance: number;
  document: string;
  metadata: Record<string, unknown>;
}

/** Subset of filter we support: equality on top-level payload keys. */
export type Where = Record<string, string | number | boolean>;

// ---------- Client ----------

let _client: QdrantClient | null = null;
function client(): QdrantClient {
  if (_client) return _client;
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url) throw new Error("QDRANT_URL missing");
  _client = new QdrantClient({ url, apiKey });
  return _client;
}

// ---------- Collection bootstrap ----------

const ensured: Set<string> = new Set();

async function ensure(name: CollectionName) {
  if (ensured.has(name)) return;
  const c = client();
  let exists = false;
  try {
    const r = await c.collectionExists(name);
    exists = !!r.exists;
  } catch {
    exists = false;
  }
  if (!exists) {
    await c.createCollection(name, {
      vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
    });
    // Helpful payload index for the most common filter
    try {
      await c.createPayloadIndex(name, {
        field_name: "tenant_id",
        field_schema: "keyword",
      });
    } catch {
      // not fatal
    }
  }
  ensured.add(name);
}

export async function ensureCollections() {
  await ensure(COL.needs);
  await ensure(COL.volunteers);
}

// ---------- Upserts ----------

async function upsertInto(collection: CollectionName, d: VolumeDoc) {
  await ensure(collection);
  const vector = await embed(d.document);
  await client().upsert(collection, {
    wait: true,
    points: [
      {
        id: d.id, // must be UUID or unsigned int — Supabase IDs are UUIDs ✓
        vector,
        payload: { document: d.document, ...d.metadata },
      },
    ],
  });
}

export async function upsertVolunteer(d: VolumeDoc) {
  return upsertInto(COL.volunteers, d);
}

export async function upsertNeed(d: VolumeDoc) {
  return upsertInto(COL.needs, d);
}

export async function deleteFromCollection(name: CollectionName | string, id: string) {
  await client().delete(name as CollectionName, {
    wait: true,
    points: [id],
  });
}

// ---------- Queries ----------

function buildFilter(where?: Where) {
  if (!where) return undefined;
  return {
    must: Object.entries(where).map(([key, value]) => ({
      key,
      match: { value },
    })),
  };
}

async function search(
  collection: CollectionName,
  text: string,
  k: number,
  where?: Where
): Promise<QueryHit[]> {
  await ensure(collection);
  const vector = await embed(text);
  const res = await client().search(collection, {
    vector,
    limit: k,
    filter: buildFilter(where),
    with_payload: true,
  });
  return res.map((r) => {
    const payload = (r.payload ?? {}) as Record<string, unknown>;
    const doc = (payload.document as string) ?? "";
    return {
      id: String(r.id),
      // Qdrant returns cosine *similarity* (higher = better). Convert to a
      // distance (lower = better) to keep the matcher's contract.
      distance: 1 - (r.score ?? 0),
      document: doc,
      metadata: payload,
    };
  });
}

export async function queryVolunteersForNeed(
  needText: string,
  k = 20,
  where?: Where
): Promise<QueryHit[]> {
  return search(COL.volunteers, needText, k, where);
}

export async function queryNeedsForVolunteer(
  volunteerText: string,
  k = 10,
  where?: Where
): Promise<QueryHit[]> {
  return search(COL.needs, volunteerText, k, where);
}

// ---------- Document text builders (unchanged) ----------

export function volunteerDocText(p: {
  display_name?: string | null;
  skills?: { tag: string }[] | string[];
  languages?: string[];
  bio?: string;
}) {
  const skills = Array.isArray(p.skills)
    ? p.skills.map((s) => (typeof s === "string" ? s : s.tag)).join(", ")
    : "";
  const langs = (p.languages ?? []).join(", ");
  return [
    p.display_name ? `Volunteer ${p.display_name}.` : "Volunteer.",
    skills ? `Skills: ${skills}.` : "",
    langs ? `Languages: ${langs}.` : "",
    p.bio ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function needDocText(n: {
  title: string;
  description?: string | null;
  required_skills?: string[];
  languages_helpful?: string[];
  category?: string | null;
  urgency?: string;
}) {
  const skills = (n.required_skills ?? []).join(", ");
  const langs = (n.languages_helpful ?? []).join(", ");
  return [
    n.title,
    n.description ?? "",
    n.category ? `Category: ${n.category}.` : "",
    skills ? `Required skills: ${skills}.` : "",
    langs ? `Helpful languages: ${langs}.` : "",
    n.urgency ? `Urgency: ${n.urgency}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}
