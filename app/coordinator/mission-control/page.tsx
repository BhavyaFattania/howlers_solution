"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, KpiTile, Badge, Empty } from "@/components/ui/primitives";
import { fmtRelative } from "@/lib/utils";
import type { Need } from "@/lib/types";
import { Siren, AlertTriangle, Database, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

const MissionMap = dynamic(
  () => import("@/components/map/MissionMap").then((m) => m.MissionMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full grid place-items-center text-slate-400 text-sm">
        Loading map…
      </div>
    ),
  }
);

interface ActivityRow {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
}

const NOW = Date.now();
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const DUMMY_NEEDS: Need[] = [
  { id:"d1", tenant_id:"demo", title:"Emergency food distribution — Sector 14", description:"500 families need emergency food kits after flooding", category:"food_relief", urgency:"critical", state:"published", required_skills:["logistics","driving"], languages_helpful:["gu","hi"], geo_lat:23.0225, geo_lng:72.5714, window_start:null, window_end:null, headcount_required:10, headcount_filled:3, source:"field_report", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(2), updated_at:ago(2) },
  { id:"d2", tenant_id:"demo", title:"Medical camp setup — Community Hall", description:"Need 5 first-aid trained volunteers for the camp.", category:"healthcare", urgency:"high", state:"matched", required_skills:["first_aid","hindi"], languages_helpful:["hi","en"], geo_lat:23.04, geo_lng:72.58, window_start:null, window_end:null, headcount_required:5, headcount_filled:4, source:"web", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(4), updated_at:ago(3) },
  { id:"d3", tenant_id:"demo", title:"Flood relief — Ward 7 Ramnagar", description:"Evacuation assistance needed for elderly residents.", category:"disaster_relief", urgency:"critical", state:"in_progress", required_skills:["physical_labour","driving"], languages_helpful:["gu"], geo_lat:23.055, geo_lng:72.545, window_start:null, window_end:null, headcount_required:8, headcount_filled:6, source:"voice_memo", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(1), updated_at:ago(0.5) },
  { id:"d4", tenant_id:"demo", title:"Children tutoring — Block C", description:"Help 30 kids with homework sessions after school.", category:"education", urgency:"medium", state:"published", required_skills:["tutoring","english"], languages_helpful:["en","hi"], geo_lat:23.038, geo_lng:72.562, window_start:null, window_end:null, headcount_required:3, headcount_filled:1, source:"web", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(24), updated_at:ago(24) },
  { id:"d5", tenant_id:"demo", title:"Legal aid camp interpreter", description:"Need Gujarati-English bilingual for legal aid camp.", category:"legal", urgency:"low", state:"triaged", required_skills:["translation","gujarati"], languages_helpful:["gu","en"], geo_lat:23.025, geo_lng:72.58, window_start:null, window_end:null, headcount_required:1, headcount_filled:0, source:"web", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(48), updated_at:ago(48) },
  { id:"d6", tenant_id:"demo", title:"Clean water distribution — Zone 3", description:"200 households need clean water packets and chlorine tablets.", category:"water_sanitation", urgency:"high", state:"published", required_skills:["logistics"], languages_helpful:["gu"], geo_lat:23.01, geo_lng:72.56, window_start:null, window_end:null, headcount_required:4, headcount_filled:0, source:"sms", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(3), updated_at:ago(3) },
  { id:"d7", tenant_id:"demo", title:"School supply distribution", description:"Stationery kits for 200 flood-affected students.", category:"education", urgency:"low", state:"verified", required_skills:["logistics"], languages_helpful:["gu","hi"], geo_lat:23.043, geo_lng:72.55, window_start:null, window_end:null, headcount_required:4, headcount_filled:4, source:"web", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(72), updated_at:ago(12) },
  { id:"d8", tenant_id:"demo", title:"Elderly care home visits", description:"Companion visits for isolated seniors in Block A.", category:"elderly_care", urgency:"medium", state:"published", required_skills:["caregiving","empathy"], languages_helpful:["gu"], geo_lat:23.035, geo_lng:72.535, window_start:null, window_end:null, headcount_required:3, headcount_filled:1, source:"web", raw_doc_url:null, created_by:null, program_id:null, created_at:ago(12), updated_at:ago(12) },
] as Need[];

const DUMMY_ACTIVITY: ActivityRow[] = [
  { id:1, kind:"assignment.accepted",  payload:{ title:"Priya accepted food distribution task" },    created_at: ago(0.1) },
  { id:2, kind:"need.published",        payload:{ title:"Medical camp setup published" },              created_at: ago(0.3) },
  { id:3, kind:"assignment.checked_in", payload:{ title:"Rahul checked in at Sector 14" },            created_at: ago(0.5) },
  { id:4, kind:"need.created",          payload:{ title:"Flood relief submitted by field worker" },    created_at: ago(1)   },
  { id:5, kind:"need.matched",          payload:{ title:"Medical camp matched 4 volunteers" },         created_at: ago(2)   },
  { id:6, kind:"assignment.verified",   payload:{ title:"School supply task verified ✓" },             created_at: ago(12)  },
];

const ACTIVITY_TONE: Record<string, "green" | "red" | "blue" | "amber"> = {
  "assignment.accepted":  "green",
  "assignment.checked_in":"blue",
  "assignment.verified":  "green",
  "need.published":       "blue",
  "need.matched":         "purple" as "blue",
  "need.created":         "amber",
  "crisis.declared":      "red",
  "crisis.cleared":       "green",
};

export default function MissionControl() {
  const { t } = useTranslation();
  const [needs, setNeeds]       = useState<Need[]>(DUMMY_NEEDS);
  const [activity, setActivity] = useState<ActivityRow[]>(DUMMY_ACTIVITY);
  const [crisis, setCrisis]     = useState<{ active: boolean; geojson?: GeoJSON.GeoJsonObject; district?: string } | null>(null);
  const [seeding, setSeeding]   = useState(false);

  useEffect(() => {
    const supa = createClient();
    let cancel = false;

    async function load() {
      const [{ data: ns }, { data: act }, crisisRes] = await Promise.all([
        supa.from("needs").select("*").order("created_at", { ascending: false }).limit(200),
        supa.from("activity_events").select("*").order("created_at", { ascending: false }).limit(20),
        fetch("/api/crisis").then((r) => r.json()).catch(() => ({ active: false })),
      ]);
      if (!cancel) {
        if (ns && ns.length > 0) setNeeds(ns);
        if (act && act.length > 0) setActivity(act);
        setCrisis(crisisRes ?? { active: false });
      }
    }
    load();

    const ch = supa
      .channel("mc")
      .on("postgres_changes", { event: "*", schema: "public", table: "needs" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" },
        (p) => setActivity((a) => [p.new as ActivityRow, ...a].slice(0, 20))
      )
      .subscribe();

    return () => { cancel = true; supa.removeChannel(ch); };
  }, []);

  const kpis = useMemo(() => {
    const open      = needs.filter((n) => ["published", "matched", "in_progress"].includes(n.state)).length;
    const critical  = needs.filter((n) => n.urgency === "critical" || n.urgency === "high").length;
    const today     = needs.filter((n) => new Date(n.created_at).toDateString() === new Date().toDateString()).length;
    const completed = needs.filter((n) => ["completed", "verified", "closed"].includes(n.state)).length;
    return { open, critical, today, completed };
  }, [needs]);

  async function toggleCrisis() {
    const r = await fetch("/api/crisis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !crisis?.active }),
    });
    if (r.ok) {
      const data = await r.json();
      setCrisis(data);
      toast[crisis?.active ? "success" : "warning"](
        crisis?.active ? "Crisis cleared" : "Crisis declared — broadcasting alert"
      );
    }
  }

  async function seed() {
    setSeeding(true);
    const r = await fetch("/api/seed", { method: "POST" });
    setSeeding(false);
    if (r.ok) {
      const j = await r.json();
      toast.success(`Seeded ${j.needs} needs · ${j.volunteers} volunteers`);
    } else {
      toast.error("Seed failed — check server logs");
    }
  }

  return (
    <div className={`p-6 min-h-screen ${crisis?.active ? "bg-red-50/30" : "bg-slate-50"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">{t("Mission Control")}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
              {t("Live")}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {t("Live picture of community needs across your programs.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={seed} disabled={seeding} className="w-full sm:w-auto flex-1 sm:flex-initial justify-center">
            <Database className="h-3.5 w-3.5 mr-1" />
            {seeding ? t("Seeding…") : t("Seed demo data")}
          </Button>
          <Button
            variant={crisis?.active ? "danger" : "outline"}
            size="sm"
            onClick={toggleCrisis}
            className="w-full sm:w-auto flex-1 sm:flex-initial justify-center"
          >
            <Siren className="h-3.5 w-3.5 mr-1" />
            {crisis?.active ? t("Clear Crisis") : t("Declare Crisis")}
          </Button>
        </div>
      </div>

      {/* Crisis banner */}
      {crisis?.active && (
        <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <strong>{t("Crisis Mode active")}</strong>
            {crisis.district ? ` — ${crisis.district}` : ""}. Match radius relaxed; all volunteers receiving banner alert.
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile label={t("Open Needs")}     value={kpis.open}      hint="Across all programs"  accentColor="blue"   trend="up" />
        <KpiTile label={t("High / Critical")} value={kpis.critical}  hint="Needs urgent action"  accentColor="red"    trend="down" />
        <KpiTile label={t("Logged Today")}   value={kpis.today}     hint="New submissions"       accentColor="amber" />
        <KpiTile label={t("Completed")}       value={kpis.completed} hint="Verified & closed"     accentColor="green"  trend="up" />
      </div>

      {/* Map + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t("Urgent Needs Heatmap")}</CardTitle>
              <span className="text-xs text-slate-400">{needs.length} {t("total needs")}</span>
            </CardHeader>
            <div className="h-[440px]">
              <MissionMap
                needs={needs}
                crisisGeo={crisis?.active ? crisis?.geojson : null}
              />
            </div>
          </Card>
        </div>

        <Card className="flex flex-col">
          <CardHeader className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <CardTitle>{t("Live Activity")}</CardTitle>
          </CardHeader>
          <CardBody className="flex-1 space-y-2.5 overflow-y-auto max-h-[440px]">
            {activity.length === 0 ? (
              <Empty title={t("No activity yet")} hint={t("Seed demo data to populate the feed.")} />
            ) : (
              activity.map((a) => {
                const tone = ACTIVITY_TONE[a.kind] ?? "slate";
                const label = a.kind.split(".")[1] ?? a.kind;
                return (
                  <div key={a.id} className="flex items-start gap-2.5 text-sm">
                    <Badge tone={tone as "green" | "red" | "blue" | "amber"} className="mt-0.5 shrink-0">
                      {label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-slate-700 text-xs">
                        {(a.payload as { title?: string }).title ?? a.kind}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{fmtRelative(a.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
