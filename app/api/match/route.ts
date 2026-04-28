import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { needDocText, queryNeedsForVolunteer, queryVolunteersForNeed, volunteerDocText } from "@/lib/qdrant";
import { rankNeedsForVolunteer, rankVolunteersForNeed } from "@/lib/matcher";
import { haversineKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/match
 *  body: { needId } -> ranked volunteers
 *  body: { volunteerId } -> ranked needs (volunteer feed)
 */
export async function POST(req: Request) {
  const supa = await createServer();
  const { needId, volunteerId, k = 5 } = await req.json();

  if (needId) {
    const { data: need, error } = await supa
      .from("needs").select("*").eq("id", needId).single();
    if (error || !need)
      return NextResponse.json({ error: "need not found" }, { status: 404 });

    const hits = await queryVolunteersForNeed(needDocText(need), 25, {
      tenant_id: need.tenant_id,
    });
    if (!hits.length) return NextResponse.json({ ranked: [] });

    // Pull profiles to enrich
    const ids = hits.map((h) => h.id);
    const { data: profs } = await supa
      .from("profiles")
      .select("id,display_name,skills,languages,home_lat,home_lng,role")
      .in("id", ids);
    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    const candidates = hits.flatMap((h) => {
      const p = byId.get(h.id);
      if (!p || p.role !== "volunteer") return [];
      const skills = Array.isArray(p.skills)
        ? (p.skills as ({ tag: string } | string)[]).map((s) =>
            typeof s === "string" ? s : s.tag
          )
        : [];
      let geo_km: number | undefined;
      if (need.geo_lat != null && need.geo_lng != null && p.home_lat && p.home_lng) {
        geo_km = haversineKm(
          { lat: need.geo_lat, lng: need.geo_lng },
          { lat: p.home_lat, lng: p.home_lng }
        );
      }
      return [{
        id: p.id,
        display_name: p.display_name ?? "Volunteer",
        skills,
        languages: p.languages ?? [],
        home_lat: p.home_lat ?? undefined,
        home_lng: p.home_lng ?? undefined,
        vector_distance: h.distance,
        geo_km,
      }];
    });

    const ranked = await rankVolunteersForNeed(need, candidates, k);
    return NextResponse.json({ ranked });
  }

  if (volunteerId) {
    const { data: vol, error } = await supa
      .from("profiles").select("*").eq("id", volunteerId).single();
    if (error || !vol)
      return NextResponse.json({ error: "volunteer not found" }, { status: 404 });

    const hits = await queryNeedsForVolunteer(volunteerDocText(vol), 15, {
      tenant_id: vol.tenant_id,
    });
    if (!hits.length) return NextResponse.json({ ranked: [] });

    const ids = hits.map((h) => h.id);
    const { data: needs } = await supa
      .from("needs")
      .select("*")
      .in("id", ids)
      .in("state", ["published", "matched", "in_progress"]);
    const byId = new Map((needs ?? []).map((n) => [n.id, n]));
    const candidates = hits.flatMap((h) => {
      const n = byId.get(h.id);
      if (!n) return [];
      let geo_km: number | undefined;
      if (n.geo_lat && n.geo_lng && vol.home_lat && vol.home_lng) {
        geo_km = haversineKm(
          { lat: n.geo_lat, lng: n.geo_lng },
          { lat: vol.home_lat, lng: vol.home_lng }
        );
      }
      return [{
        id: n.id,
        title: n.title,
        description: n.description ?? "",
        urgency: n.urgency,
        required_skills: n.required_skills ?? [],
        languages_helpful: n.languages_helpful ?? [],
        geo_lat: n.geo_lat ?? undefined,
        geo_lng: n.geo_lng ?? undefined,
        vector_distance: h.distance,
        geo_km,
      }];
    });

    const ranked = await rankNeedsForVolunteer(vol, candidates, k);
    return NextResponse.json({ ranked });
  }

  return NextResponse.json({ error: "needId or volunteerId required" }, { status: 400 });
}
