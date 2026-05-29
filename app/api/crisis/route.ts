import { NextResponse } from "next/server";
import { createServer, createAdmin } from "@/lib/supabase/server";

const DEMO_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Demo flood polygon" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [72.61, 23.04], [72.63, 23.04], [72.63, 23.06], [72.61, 23.06], [72.61, 23.04],
        ]],
      },
    },
  ],
};

export async function GET() {
  const supa = await createServer();
  const { data: profile } = await supa
    .from("profiles").select("tenant_id").single();
  if (!profile?.tenant_id) return NextResponse.json({ active: false });
  const { data } = await supa
    .from("crisis_state").select("*").eq("tenant_id", profile.tenant_id).maybeSingle();
  return NextResponse.json(data ?? { active: false });
}

export async function POST(req: Request) {
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { active } = await req.json();
  const { data: profile } = await supa
    .from("profiles").select("tenant_id, role").eq("id", u.user.id).single();
  if (!profile?.tenant_id)
    return NextResponse.json({ error: "no tenant" }, { status: 400 });
  if (!["coordinator", "admin"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdmin();
  const row = {
    tenant_id: profile.tenant_id,
    active: !!active,
    district: active ? "Sector 7 — Demo District" : null,
    geojson: active ? DEMO_GEOJSON : null,
    declared_at: active ? new Date().toISOString() : null,
    declared_by: active ? u.user.id : null,
  };
  await admin.from("crisis_state").upsert(row, { onConflict: "tenant_id" });
  await admin.from("activity_events").insert({
    tenant_id: profile.tenant_id,
    actor_id: u.user.id,
    kind: active ? "crisis.declared" : "crisis.cleared",
    payload: { district: row.district },
  });
  return NextResponse.json(row);
}
