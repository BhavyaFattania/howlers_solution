import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/server";
import {
  upsertNeed,
  upsertVolunteer,
  needDocText,
  volunteerDocText,
  ensureCollections,
} from "@/lib/qdrant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT = "00000000-0000-0000-0000-000000000001";

const PROGRAMS = [
  { name: "Flood Relief 2026", description: "Active relief in flood-affected districts" },
  { name: "Tutoring Q3", description: "After-school tutoring for primary kids" },
  { name: "Senior Care", description: "Home visits and medical companionship" },
];

const SAMPLE_NEEDS = [
  {
    title: "Distribute relief kits — Sector 7",
    description: "30 families affected by flooding need food and hygiene kits.",
    category: "disaster_relief",
    urgency: "high",
    required_skills: ["lifting", "logistics"],
    languages_helpful: ["gu", "hi"],
    geo_lat: 23.045, geo_lng: 72.62,
    headcount_required: 6,
  },
  {
    title: "Math tutoring — Saraswati School",
    description: "Volunteers needed to help Class 6-8 students with basic math.",
    category: "tutoring", urgency: "medium",
    required_skills: ["tutoring_math"], languages_helpful: ["hi", "en"],
    geo_lat: 23.022, geo_lng: 72.571,
    headcount_required: 3,
  },
  {
    title: "Medical camp first-aid support",
    description: "Assist health workers at the weekend free clinic.",
    category: "health", urgency: "high",
    required_skills: ["first_aid"], languages_helpful: ["gu"],
    geo_lat: 23.03, geo_lng: 72.6,
    headcount_required: 4,
  },
  {
    title: "Senior companionship visits",
    description: "Friendly check-ins with seniors living alone.",
    category: "elder_care", urgency: "low",
    required_skills: ["empathy"], languages_helpful: ["gu"],
    geo_lat: 23.06, geo_lng: 72.55,
    headcount_required: 2,
  },
  {
    title: "Beach cleanup drive",
    description: "Coastal cleanup with the local environment club.",
    category: "environment", urgency: "medium",
    required_skills: ["lifting"], languages_helpful: ["en"],
    geo_lat: 21.7, geo_lng: 72.15,
    headcount_required: 12,
  },
  {
    title: "Translate consent forms — Marathi",
    description: "Need a Marathi speaker to translate beneficiary consent forms.",
    category: "admin", urgency: "low",
    required_skills: ["translation"], languages_helpful: ["mr"],
    geo_lat: 23.03, geo_lng: 72.58,
    headcount_required: 1,
  },
  {
    title: "Food distribution at railway station",
    description: "Evening meal distribution for unhoused community.",
    category: "food_distribution", urgency: "high",
    required_skills: ["logistics"], languages_helpful: ["hi"],
    geo_lat: 23.025, geo_lng: 72.6,
    headcount_required: 5,
  },
  {
    title: "Tech help — set up donation portal",
    description: "Help our staff configure the donation widget on the website.",
    category: "tech", urgency: "low",
    required_skills: ["web_dev"], languages_helpful: ["en"],
    geo_lat: 23.03, geo_lng: 72.59,
    headcount_required: 1,
  },
  {
    title: "Rebuild community library roof",
    description: "The recent storm damaged the local library. Need physical labor and carpentry skills.",
    category: "construction", urgency: "medium",
    required_skills: ["carpentry", "lifting"], languages_helpful: ["hi", "gu"],
    geo_lat: 23.015, geo_lng: 72.585,
    headcount_required: 4,
  },
  {
    title: "Emergency blood donation camp",
    description: "Urgent O-negative and B-positive blood needed for hospital reserves.",
    category: "health", urgency: "critical",
    required_skills: ["first_aid", "medical"], languages_helpful: ["en", "hi"],
    geo_lat: 23.042, geo_lng: 72.61,
    headcount_required: 15,
  },
  {
    title: "Legal rights awareness workshop",
    description: "Lawyers or law students needed to educate local workers on their labor rights.",
    category: "legal", urgency: "medium",
    required_skills: ["legal", "public_speaking"], languages_helpful: ["gu"],
    geo_lat: 23.05, geo_lng: 72.54,
    headcount_required: 2,
  },
  {
    title: "Animal rescue after flooding",
    description: "Need volunteers with vehicles to transport stranded street dogs to the shelter.",
    category: "animal_welfare", urgency: "high",
    required_skills: ["driving", "animal_handling"], languages_helpful: ["gu"],
    geo_lat: 23.02, geo_lng: 72.56,
    headcount_required: 3,
  },
];

const FAKE_VOLUNTEERS = [
  { name: "Asha P.", skills: ["first_aid","empathy","translation"], langs: ["gu","hi"], lat: 23.04, lng: 72.61 },
  { name: "Ravi M.", skills: ["lifting","logistics"], langs: ["gu","hi"], lat: 23.05, lng: 72.62 },
  { name: "Priya S.", skills: ["tutoring_math","tutoring_science"], langs: ["hi","en"], lat: 23.02, lng: 72.57 },
  { name: "Karan J.", skills: ["web_dev","tech_support"], langs: ["en"], lat: 23.03, lng: 72.58 },
  { name: "Mehul D.", skills: ["lifting","first_aid"], langs: ["gu"], lat: 23.04, lng: 72.6 },
  { name: "Nisha B.", skills: ["empathy","tutoring_math"], langs: ["gu","hi"], lat: 23.06, lng: 72.55 },
  { name: "Suresh T.", skills: ["logistics","driving"], langs: ["hi"], lat: 23.025, lng: 72.6 },
  { name: "Anita R.", skills: ["translation","empathy"], langs: ["mr","hi"], lat: 23.03, lng: 72.58 },
  { name: "Vikram K.", skills: ["lifting","logistics"], langs: ["en","hi"], lat: 21.71, lng: 72.16 },
  { name: "Devika N.", skills: ["first_aid","empathy"], langs: ["gu","en"], lat: 23.035, lng: 72.605 },
  { name: "Hardik P.", skills: ["tech_support","web_dev"], langs: ["en"], lat: 23.03, lng: 72.59 },
  { name: "Sneha L.", skills: ["empathy","translation"], langs: ["mr","gu"], lat: 23.04, lng: 72.59 },
  { name: "Arjun V.", skills: ["carpentry","lifting"], langs: ["gu","hi"], lat: 23.015, lng: 72.58 },
  { name: "Dr. Meera K.", skills: ["medical","first_aid"], langs: ["en","hi"], lat: 23.04, lng: 72.62 },
  { name: "Rajesh S.", skills: ["driving","animal_handling"], langs: ["gu"], lat: 23.02, lng: 72.55 },
  { name: "Ananya B.", skills: ["legal","public_speaking"], langs: ["gu","en"], lat: 23.045, lng: 72.53 },
  { name: "Tariq M.", skills: ["logistics","heavy_lifting"], langs: ["hi","mr"], lat: 23.025, lng: 72.57 },
];

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Method not allowed in production" }, { status: 403 });
  }

  const admin = createAdmin();
  await ensureCollections();

  // Tenant exists from migration. Create programs.
  const { data: existingPrograms } = await admin
    .from("programs").select("id,name").eq("tenant_id", TENANT);
  const existing = new Set((existingPrograms ?? []).map((p) => p.name));
  const toCreate = PROGRAMS.filter((p) => !existing.has(p.name)).map((p) => ({
    ...p, tenant_id: TENANT,
  }));
  if (toCreate.length) await admin.from("programs").insert(toCreate);

  // Volunteers — find existing test fake volunteers; otherwise we cannot
  // create real auth.users from here. Instead we create rows in profiles
  // directly with synthesized UUIDs (only allowed via service role).
  const { data: anyVols } = await admin
    .from("profiles").select("id").eq("tenant_id", TENANT).eq("role", "volunteer");

  if (!anyVols || anyVols.length < 5) {
    for (const v of FAKE_VOLUNTEERS) {
      const email = `${v.name.toLowerCase().replace(/[^a-z]/g, "")}@demo.local`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: "password123",
        email_confirm: true,
        user_metadata: {
          display_name: v.name,
          role: "volunteer",
          tenant_id: TENANT,
        },
      });
      if (data?.user) {
        await admin.from("profiles").update({
          languages: v.langs,
          skills: v.skills.map((tag) => ({ tag })),
          home_lat: v.lat, home_lng: v.lng, max_radius_km: 10, trust_score: 0.7,
        }).eq("id", data.user.id);
      }
    }
  }

  // Re-pull volunteers
  const { data: vols } = await admin
    .from("profiles").select("*").eq("tenant_id", TENANT).eq("role", "volunteer");

  // Index volunteers in Chroma
  for (const v of vols ?? []) {
    try {
      await upsertVolunteer({
        id: v.id,
        document: volunteerDocText({
          display_name: v.display_name,
          skills: v.skills,
          languages: v.languages,
        }),
        metadata: {
          tenant_id: v.tenant_id,
          ...(v.home_lat != null && { home_lat: v.home_lat }),
          ...(v.home_lng != null && { home_lng: v.home_lng }),
          radius_km: v.max_radius_km ?? 8,
        },
      });
    } catch (e) {
      console.error("chroma volunteer failed", v.display_name, e);
    }
  }

  // Needs
  const { data: existingNeeds } = await admin
    .from("needs").select("id,title").eq("tenant_id", TENANT);
  const existingTitles = new Set((existingNeeds ?? []).map((n) => n.title));
  
  const TRIAGE_STATES = ["submitted", "triaged", "published", "matched", "in_progress", "verified"];
  
  const toInsert = SAMPLE_NEEDS.filter((n) => !existingTitles.has(n.title)).map((n, i) => ({
    ...n, 
    tenant_id: TENANT, 
    state: TRIAGE_STATES[i % TRIAGE_STATES.length],
    window_start: new Date(Date.now() + 86400000).toISOString(),
    window_end: new Date(Date.now() + 86400000 * 3).toISOString(),
  }));
  if (toInsert.length) {
    const { data: inserted } = await admin.from("needs").insert(toInsert).select("*");
    for (const n of inserted ?? []) {
      try {
        await upsertNeed({
          id: n.id,
          document: needDocText(n),
          metadata: {
            tenant_id: n.tenant_id, urgency: n.urgency, state: n.state,
            ...(n.geo_lat != null && { geo_lat: n.geo_lat }),
            ...(n.geo_lng != null && { geo_lng: n.geo_lng }),
          },
        });
      } catch (e) {
        console.error("chroma need failed", e);
      }
    }
  }

  // Re-index all needs (in case of partial state)
  const { data: allNeeds } = await admin.from("needs").select("*").eq("tenant_id", TENANT);
  
  // Force existing needs to spread across all columns for a realistic Triage board
  for (let i = 0; i < (allNeeds?.length || 0); i++) {
    const newState = TRIAGE_STATES[i % TRIAGE_STATES.length];
    if (allNeeds![i].state !== newState) {
      await admin.from("needs").update({ state: newState }).eq("id", allNeeds![i].id);
      allNeeds![i].state = newState;
    }
  }

  for (const n of allNeeds ?? []) {
    try {
      await upsertNeed({
        id: n.id, document: needDocText(n),
        metadata: {
          tenant_id: n.tenant_id, urgency: n.urgency, state: n.state,
          ...(n.geo_lat != null && { geo_lat: n.geo_lat }),
          ...(n.geo_lng != null && { geo_lng: n.geo_lng }),
        },
      });
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    volunteers: vols?.length ?? 0,
    needs: allNeeds?.length ?? 0,
  });
}
