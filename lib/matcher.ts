import { chatJSON, MODELS } from "@/lib/llm";
import {
  needDocText,
  queryNeedsForVolunteer,
  queryVolunteersForNeed,
} from "@/lib/qdrant";
import { haversineKm } from "@/lib/utils";
import type { Need, Profile, RankedNeed, RankedVolunteer } from "@/lib/types";

interface VolunteerHit {
  id: string;
  display_name: string;
  skills: string[];
  languages: string[];
  home_lat?: number;
  home_lng?: number;
  vector_distance: number;
  geo_km?: number;
}

/** Top volunteers for a need: vector search → enrich with geo → Gemini re-rank with explanations. */
export async function rankVolunteersForNeed(
  need: Need,
  candidates: VolunteerHit[],
  topK = 5
): Promise<RankedVolunteer[]> {
  const trimmed = candidates.slice(0, 20);
  const prompt = `You are matching volunteers to a community need.
Pick the BEST ${topK} volunteers and explain WHY each is a good fit in ONE short sentence.
Use signals like proximity, skill overlap, language fit, and required headcount.

NEED:
${JSON.stringify(
  {
    title: need.title,
    description: need.description,
    category: need.category,
    urgency: need.urgency,
    required_skills: need.required_skills,
    languages_helpful: need.languages_helpful,
    geo_lat: need.geo_lat,
    geo_lng: need.geo_lng,
    headcount: need.headcount_required,
  },
  null,
  0
)}

CANDIDATES (pre-filtered by semantic similarity, score = lower is better):
${JSON.stringify(trimmed, null, 0)}

Return JSON of the form:
{"ranked":[{"id":"<id>","reason":"<one short sentence>","score":<0..1 confidence>}]}
Only include up to ${topK} entries. Order by best fit first.`;

  try {
    const out = await chatJSON<{
      ranked: { id: string; reason: string; score: number }[];
    }>(prompt, undefined, { temperature: 0.2, maxTokens: 800 });

    const byId = new Map(trimmed.map((c) => [c.id, c]));
    return out.ranked
      .filter((r) => byId.has(r.id))
      .map((r) => {
        const c = byId.get(r.id)!;
        return {
          id: c.id,
          display_name: c.display_name,
          distance_km: c.geo_km ?? 0,
          score: clamp01(r.score ?? 0.5),
          reason: r.reason,
          skills: c.skills,
          languages: c.languages,
        };
      });
  } catch (err) {
    // Fallback: pure vector ranking with templated reasons
    return trimmed.slice(0, topK).map((c) => ({
      id: c.id,
      display_name: c.display_name,
      distance_km: c.geo_km ?? 0,
      score: 1 - Math.min(1, c.vector_distance),
      reason: buildFallbackReason(need, c),
      skills: c.skills,
      languages: c.languages,
    }));
  }
}

interface NeedHit {
  id: string;
  title: string;
  description: string;
  urgency: string;
  required_skills: string[];
  languages_helpful: string[];
  geo_lat?: number;
  geo_lng?: number;
  vector_distance: number;
  geo_km?: number;
}

/** Top needs for a volunteer (Volunteer Home feed). */
export async function rankNeedsForVolunteer(
  vol: Profile,
  candidates: NeedHit[],
  topK = 3
): Promise<RankedNeed[]> {
  const trimmed = candidates.slice(0, 12);
  const prompt = `You are recommending the best ${topK} community needs for a volunteer.
For each, give ONE short sentence explaining WHY it fits this volunteer.

VOLUNTEER:
${JSON.stringify(
  {
    name: vol.display_name,
    skills: vol.skills,
    languages: vol.languages,
    home: { lat: vol.home_lat, lng: vol.home_lng },
    radius_km: vol.max_radius_km,
  },
  null,
  0
)}

OPEN NEEDS (semantic match, lower vector_distance = closer):
${JSON.stringify(trimmed, null, 0)}

Return JSON: {"ranked":[{"id":"<id>","reason":"<one short sentence>","score":<0..1>}]}.`;

  try {
    const out = await chatJSON<{
      ranked: { id: string; reason: string; score: number }[];
    }>(prompt, undefined, { temperature: 0.3, maxTokens: 600 });

    const byId = new Map(trimmed.map((c) => [c.id, c]));
    return out.ranked
      .filter((r) => byId.has(r.id))
      .map((r) => {
        const c = byId.get(r.id)!;
        return {
          id: c.id,
          title: c.title,
          urgency: c.urgency as RankedNeed["urgency"],
          distance_km: c.geo_km ?? 0,
          score: clamp01(r.score ?? 0.5),
          reason: r.reason,
          required_skills: c.required_skills,
        };
      });
  } catch {
    return trimmed.slice(0, topK).map((c) => ({
      id: c.id,
      title: c.title,
      urgency: c.urgency as RankedNeed["urgency"],
      distance_km: c.geo_km ?? 0,
      score: 1 - Math.min(1, c.vector_distance),
      reason:
        c.geo_km !== undefined && c.geo_km < 5
          ? `Only ${c.geo_km.toFixed(1)} km from you${c.required_skills?.length ? `, matches your skill in ${c.required_skills[0]}` : ""}.`
          : `Looks like a good fit based on your skills and languages.`,
      required_skills: c.required_skills,
    }));
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

function buildFallbackReason(need: Need, c: VolunteerHit) {
  const bits: string[] = [];
  if (c.geo_km !== undefined) bits.push(`${c.geo_km.toFixed(1)} km away`);
  const overlap = (need.required_skills || []).filter((s) =>
    c.skills?.includes(s)
  );
  if (overlap.length) bits.push(`skill: ${overlap[0]}`);
  const langOverlap = (need.languages_helpful || []).filter((l) =>
    c.languages?.includes(l)
  );
  if (langOverlap.length) bits.push(`speaks ${langOverlap[0]}`);
  if (!bits.length) bits.push("strong semantic match");
  return `Good fit — ${bits.join(", ")}.`;
}

export const matcherInfo = { model: MODELS.default, vectorDB: "chroma-local" };
export { queryVolunteersForNeed, queryNeedsForVolunteer, needDocText };
