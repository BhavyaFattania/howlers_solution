import { NextResponse } from "next/server";
import { z } from "zod";
import { createServer, createAdmin } from "@/lib/supabase/server";
import { upsertNeed, needDocText } from "@/lib/qdrant";

export const dynamic = "force-dynamic";

const NeedSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().default(""),
  category: z.string().optional(),
  urgency: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  required_skills: z.array(z.string()).default([]),
  languages_helpful: z.array(z.string()).default([]),
  geo_lat: z.number().nullable().optional(),
  geo_lng: z.number().nullable().optional(),
  window_start: z.string().nullable().optional(),
  window_end: z.string().nullable().optional(),
  headcount_required: z.number().int().min(1).default(1),
  source: z.string().default("web"),
  state: z.string().default("published"),
  raw_doc_url: z.string().nullable().optional(),
});

export async function GET() {
  const supa = await createServer();
  const { data, error } = await supa
    .from("needs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ needs: data ?? [] });
}

export async function POST(req: Request) {
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = NeedSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: profile } = await supa
    .from("profiles")
    .select("tenant_id")
    .eq("id", u.user.id)
    .single();
  if (!profile?.tenant_id)
    return NextResponse.json({ error: "no tenant" }, { status: 400 });

  const insert = { ...parsed.data, tenant_id: profile.tenant_id, created_by: u.user.id };
  const { data, error } = await supa.from("needs").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Index in Chroma
  try {
    await upsertNeed({
      id: data.id,
      document: needDocText(data),
      metadata: {
        tenant_id: data.tenant_id,
        urgency: data.urgency,
        state: data.state,
        geo_lat: data.geo_lat ?? 0,
        geo_lng: data.geo_lng ?? 0,
      },
    });
  } catch (e) {
    console.error("chroma upsert failed", e);
  }

  // Activity event
  try {
    const admin = createAdmin();
    await admin.from("activity_events").insert({
      tenant_id: data.tenant_id,
      actor_id: u.user.id,
      kind: "need.created",
      payload: { need_id: data.id, title: data.title, urgency: data.urgency },
    });
  } catch {}

  return NextResponse.json({ need: data });
}
