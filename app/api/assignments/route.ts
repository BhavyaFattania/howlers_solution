import { NextResponse } from "next/server";
import { createServer, createAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { needId, volunteerIds, reason, asVolunteer, action } = await req.json();
  if (!needId) return NextResponse.json({ error: "needId required" }, { status: 400 });

  const { data: profile } = await supa.from("profiles").select("role").eq("id", u.user.id).single();
  if (!profile || !["coordinator", "admin"].includes(profile.role)) {
    if (!asVolunteer || (Array.isArray(volunteerIds) && volunteerIds.length > 0)) {
      return NextResponse.json({ error: "Forbidden: Only coordinators can assign other volunteers." }, { status: 403 });
    }
  }

  const admin = createAdmin();
  const targetIds: string[] = asVolunteer
    ? [u.user.id]
    : Array.isArray(volunteerIds)
    ? volunteerIds
    : [];
  if (!targetIds.length)
    return NextResponse.json({ error: "no volunteers" }, { status: 400 });

  const { data: need } = await admin.from("needs").select("*").eq("id", needId).single();
  if (!need) return NextResponse.json({ error: "need not found" }, { status: 404 });

  const isReject = action === "reject";

  const rows = targetIds.map((vid) => ({
    need_id: needId,
    volunteer_id: vid,
    state: isReject ? "declined" : (asVolunteer ? "accepted" : "offered"),
    match_reason: reason ?? null,
    accepted_at: (asVolunteer && !isReject) ? new Date().toISOString() : null,
  }));

  const { data, error } = await admin
    .from("assignments")
    .upsert(rows, { onConflict: "need_id,volunteer_id" })
    .select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update need state + headcount only if accepted
  const newFilled = (need.headcount_filled ?? 0) + ((asVolunteer && !isReject) ? 1 : 0);
  await admin
    .from("needs")
    .update({
      state: (asVolunteer && !isReject) && newFilled >= need.headcount_required ? "in_progress" : need.state,
      headcount_filled: (asVolunteer && !isReject) ? newFilled : need.headcount_filled,
    })
    .eq("id", needId);

  await admin.from("activity_events").insert({
    tenant_id: need.tenant_id,
    actor_id: u.user.id,
    kind: isReject ? "assignment.declined" : (asVolunteer ? "assignment.accepted" : "assignment.offered"),
    payload: { need_id: needId, count: rows.length, title: need.title },
  });

  return NextResponse.json({ assignments: data });
}

export async function PATCH(req: Request) {
  const supa = await createServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, state, proof_note } = await req.json();

  const admin = createAdmin();
  
  const { data: profile } = await supa.from("profiles").select("role").eq("id", u.user.id).single();
  const { data: existingAssignment } = await admin.from("assignments").select("volunteer_id").eq("id", id).single();
  if (!profile || (!["coordinator", "admin"].includes(profile.role) && existingAssignment?.volunteer_id !== u.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const update: Record<string, unknown> = { state };
  if (state === "checked_in") update.checked_in_at = new Date().toISOString();
  if (state === "proof_submitted" || state === "verified")
    update.completed_at = new Date().toISOString();
  if (proof_note) update.proof_note = proof_note;

  const { data, error } = await admin
    .from("assignments").update(update).eq("id", id).select("*, need:needs(*)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (data?.need) {
    await admin.from("activity_events").insert({
      tenant_id: data.need.tenant_id,
      actor_id: u.user.id,
      kind: `assignment.${state}`,
      payload: { need_id: data.need_id, title: data.need.title },
    });
  }
  return NextResponse.json({ assignment: data });
}
