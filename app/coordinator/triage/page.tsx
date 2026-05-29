"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Badge } from "@/components/ui/primitives";
import type { Need, NeedState } from "@/lib/types";
import { fmtRelative, URGENCY_COLOR } from "@/lib/utils";
import { ArrowRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

const COLUMNS: { id: NeedState; title: string; color: string }[] = [
  { id: "submitted",   title: "Submitted",   color: "bg-slate-100  border-slate-200" },
  { id: "triaged",     title: "Triaged",     color: "bg-blue-50    border-blue-100"  },
  { id: "published",   title: "Published",   color: "bg-violet-50  border-violet-100"},
  { id: "matched",     title: "Matched",     color: "bg-amber-50   border-amber-100" },
  { id: "in_progress", title: "In Progress", color: "bg-orange-50  border-orange-100"},
  { id: "verified",    title: "Verified ✓",  color: "bg-emerald-50 border-emerald-100"},
];

const NOW = Date.now();
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const DUMMY_NEEDS: Need[] = [
  { id:"t1", tenant_id:"demo", title:"Emergency food kits — Sector 14",    category:"food_relief",    urgency:"critical", state:"submitted",   required_skills:["logistics"],  languages_helpful:["gu"], geo_lat:23.02, geo_lng:72.57, window_start:null, window_end:null, headcount_required:10, headcount_filled:0,  source:"field_report", raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(0.5), updated_at:ago(0.5) },
  { id:"t2", tenant_id:"demo", title:"Flood relief volunteers — Ward 7",    category:"disaster_relief",urgency:"critical", state:"submitted",   required_skills:["driving"],    languages_helpful:["gu"], geo_lat:23.05, geo_lng:72.54, window_start:null, window_end:null, headcount_required:8,  headcount_filled:0,  source:"sms",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(1),   updated_at:ago(1) },
  { id:"t3", tenant_id:"demo", title:"Legal aid interpreter needed",         category:"legal",          urgency:"low",      state:"submitted",   required_skills:["translation"],languages_helpful:["gu"], geo_lat:23.02, geo_lng:72.58, window_start:null, window_end:null, headcount_required:1,  headcount_filled:0,  source:"web",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(48),  updated_at:ago(48) },
  { id:"t4", tenant_id:"demo", title:"Medical camp setup — Community Hall", category:"healthcare",     urgency:"high",     state:"triaged",     required_skills:["first_aid"],  languages_helpful:["hi"], geo_lat:23.04, geo_lng:72.58, window_start:null, window_end:null, headcount_required:5,  headcount_filled:0,  source:"web",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(4),   updated_at:ago(3) },
  { id:"t5", tenant_id:"demo", title:"Water distribution — Zone 3",         category:"water",          urgency:"high",     state:"triaged",     required_skills:["logistics"],  languages_helpful:["gu"], geo_lat:23.01, geo_lng:72.56, window_start:null, window_end:null, headcount_required:4,  headcount_filled:0,  source:"sms",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(3),   updated_at:ago(2) },
  { id:"t6", tenant_id:"demo", title:"Children tutoring — Block C",         category:"education",      urgency:"medium",   state:"published",   required_skills:["tutoring"],   languages_helpful:["en"], geo_lat:23.03, geo_lng:72.56, window_start:null, window_end:null, headcount_required:3,  headcount_filled:1,  source:"web",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(24),  updated_at:ago(24) },
  { id:"t7", tenant_id:"demo", title:"Elderly care visits — Block A",       category:"elderly_care",   urgency:"medium",   state:"published",   required_skills:["caregiving"], languages_helpful:["gu"], geo_lat:23.03, geo_lng:72.53, window_start:null, window_end:null, headcount_required:3,  headcount_filled:1,  source:"web",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(12),  updated_at:ago(12) },
  { id:"t8", tenant_id:"demo", title:"Medical camp setup — Community Hall", category:"healthcare",     urgency:"high",     state:"matched",     required_skills:["first_aid"],  languages_helpful:["hi"], geo_lat:23.04, geo_lng:72.58, window_start:null, window_end:null, headcount_required:5,  headcount_filled:4,  source:"web",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(4),   updated_at:ago(2) },
  { id:"t9", tenant_id:"demo", title:"Emergency food distribution",         category:"food_relief",    urgency:"critical", state:"in_progress", required_skills:["logistics"],  languages_helpful:["gu"], geo_lat:23.02, geo_lng:72.57, window_start:null, window_end:null, headcount_required:10, headcount_filled:7,  source:"field_report", raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(2),   updated_at:ago(0.5) },
  { id:"t10",tenant_id:"demo", title:"School supply distribution",          category:"education",      urgency:"low",      state:"verified",    required_skills:["logistics"],  languages_helpful:["gu"], geo_lat:23.04, geo_lng:72.55, window_start:null, window_end:null, headcount_required:4,  headcount_filled:4,  source:"web",          raw_doc_url:null, created_by:null, program_id:null, description:null, created_at:ago(72),  updated_at:ago(12) },
] as Need[];

export default function TriagePage() {
  const { t } = useTranslation();
  const [needs, setNeeds] = useState<Need[]>(DUMMY_NEEDS);

  async function load() {
    const supa = createClient();
    const { data } = await supa.from("needs").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) setNeeds(data);
  }

  useEffect(() => {
    load();
    const supa = createClient();
    const ch = supa
      .channel("triage")
      .on("postgres_changes", { event: "*", schema: "public", table: "needs" }, load)
      .subscribe();
    return () => { supa.removeChannel(ch); };
  }, []);

  async function move(need: Need, to: NeedState) {
    const r = await fetch(`/api/needs/${need.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: to }),
    });
    if (r.ok) toast.success(`Moved to ${to.replace("_", " ")}`);
    else toast.error("Move failed");
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("Triage Inbox")}</h1>
          <p className="text-sm text-slate-500">{t("Advance each need's state as you handle it.")}</p>
        </div>
        <Link href="/coordinator/needs/new" className="w-full sm:w-auto">
          <Button size="sm" className="w-full sm:w-auto">
            <Plus className="h-3.5 w-3.5" /> {t("New Need")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const items = needs.filter((n) => n.state === col.id);
          return (
            <div key={col.id} className={`rounded-xl border ${col.color} p-2 min-h-[70vh]`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {t(col.title)}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-white rounded-full h-5 w-5 grid place-items-center border border-slate-200">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6 rounded-lg border border-dashed border-slate-200">
                    {t("Empty")}
                  </div>
                ) : (
                  items.map((n) => <NeedCard key={n.id} need={n} onMove={move} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NeedCard({ need, onMove }: { need: Need; onMove: (n: Need, to: NeedState) => void }) {
  const { t } = useTranslation();
  const idx  = COLUMNS.findIndex((c) => c.id === need.state);
  const next = COLUMNS[idx + 1];

  const urgencyTone = need.urgency === "critical" ? "red"
    : need.urgency === "high" ? "orange"
    : need.urgency === "medium" ? "amber"
    : "slate";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <span
            className="inline-block w-2 h-2 rounded-full mt-1 shrink-0"
            style={{ background: URGENCY_COLOR[need.urgency] }}
          />
          <div className="flex-1 min-w-0">
            <Link
              href={`/coordinator/matcher?need=${need.id}`}
              className="text-xs font-medium text-slate-900 hover:text-brand hover:underline line-clamp-2 block"
            >
              {need.title}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge tone={urgencyTone as "red" | "amber" | "slate" | "orange"}>{t(need.urgency)}</Badge>
          {need.category && <Badge tone="slate">{t(need.category.replace("_", " "))}</Badge>}
        </div>
        <div className="text-[11px] text-slate-400 mb-2">{fmtRelative(need.created_at)}</div>
        {next && (
          <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => onMove(need, next.id)}>
            {t(next.title)} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
