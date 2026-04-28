import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { upsertVolunteer, volunteerDocText } from "@/lib/qdrant";

export async function GET() {
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supa
    .from("profiles").select("*").eq("id", u.user.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(req: Request) {
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supa
    .from("profiles")
    .update(body)
    .eq("id", u.user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data.role === "volunteer") {
    try {
      await upsertVolunteer({
        id: data.id,
        document: volunteerDocText({
          display_name: data.display_name,
          skills: data.skills,
          languages: data.languages,
        }),
        metadata: {
          tenant_id: data.tenant_id,
          home_lat: data.home_lat ?? 0,
          home_lng: data.home_lng ?? 0,
          radius_km: data.max_radius_km ?? 8,
        },
      });
    } catch (e) {
      console.error("chroma upsert volunteer failed", e);
    }
  }

  return NextResponse.json({ profile: data });
}
