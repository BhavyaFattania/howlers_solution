import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase/server";
import { upsertNeed, needDocText } from "@/lib/qdrant";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supa = await createServer();
  const { data, error } = await supa
    .from("needs")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
  } catch {}
  return NextResponse.json({ need: data });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = await createServer();
  const { data, error } = await supa.from("needs").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ need: data });
}
