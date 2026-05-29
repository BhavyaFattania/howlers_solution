import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { upsertNeed, needDocText } from "@/lib/qdrant";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supa.from("profiles").select("role").eq("id", u.user.id).single();
  if (!profile || !["coordinator", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supa
    .from("needs")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let syncWarning = false;
  try {
    await upsertNeed({
      id: data.id,
      document: needDocText(data),
      metadata: {
        tenant_id: data.tenant_id,
        urgency: data.urgency,
        state: data.state,
        ...(data.geo_lat != null && { geo_lat: data.geo_lat }),
        ...(data.geo_lng != null && { geo_lng: data.geo_lng }),
      },
    });
  } catch {
    syncWarning = true;
  }
  return NextResponse.json({ need: data, syncWarning });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = await createServer();
  const { data, error } = await supa.from("needs").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ need: data });
}
