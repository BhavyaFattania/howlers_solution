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
  const { display_name, languages, skills, home_lat, home_lng, max_radius_km, availability } = body;
  const updatePayload = { 
    ...(display_name !== undefined && { display_name }),
    ...(languages !== undefined && { languages }),
    ...(skills !== undefined && { skills }),
    ...(home_lat !== undefined && { home_lat }),
    ...(home_lng !== undefined && { home_lng }),
    ...(max_radius_km !== undefined && { max_radius_km }),
    ...(availability !== undefined && { availability })
  };

  const { data, error } = await supa
    .from("profiles")
    .update(updatePayload)
    .eq("id", u.user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let syncWarning = false;
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
          ...(data.home_lat != null && { home_lat: data.home_lat }),
          ...(data.home_lng != null && { home_lng: data.home_lng }),
          radius_km: data.max_radius_km ?? 8,
        },
      });
    } catch (e) {
      console.error("chroma upsert volunteer failed", e);
      syncWarning = true;
    }
  }

  return NextResponse.json({ profile: data, syncWarning });
}
