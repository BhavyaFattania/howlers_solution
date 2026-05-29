"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Badge, Chip, Empty } from "@/components/ui/primitives";
import type { Need, RankedVolunteer } from "@/lib/types";

export default function MatcherStudio() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <MatcherStudioInner />
    </Suspense>
  );
}

const DUMMY_NEEDS: Need[] = [
  { id: "d1", tenant_id: "demo", title: "Emergency food distribution — Sector 14", description: "500 families need emergency food kits after flooding", category: "food_relief", urgency: "critical", state: "published", required_skills: ["logistics", "driving"], languages_helpful: ["gu", "hi"], geo_lat: 23.0225, geo_lng: 72.5714, window_start: null, window_end: null, headcount_required: 10, headcount_filled: 3, source: "field_report", raw_doc_url: null, created_by: null, program_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "d2", tenant_id: "demo", title: "Medical camp setup — Community Hall", description: "Need 5 first-aid trained volunteers for the camp.", category: "healthcare", urgency: "high", state: "published", required_skills: ["first_aid", "hindi"], languages_helpful: ["hi", "en"], geo_lat: 23.04, geo_lng: 72.58, window_start: null, window_end: null, headcount_required: 5, headcount_filled: 4, source: "web", raw_doc_url: null, created_by: null, program_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const DUMMY_RANKED: RankedVolunteer[] = [
  { id: "u1", display_name: "Rahul Sharma", languages: ["en", "hi"], skills: ["first_aid", "logistics"], distance_km: 1.2, score: 0.95, reason: "Excellent match: certified in first aid and lives very close to the venue." },
  { id: "u2", display_name: "Priya Patel", languages: ["gu", "en"], skills: ["tutoring", "translation"], distance_km: 3.4, score: 0.72, reason: "Good secondary match: strong local language skills." }
];

function MatcherStudioInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const initial = params.get("need");
  const [needs, setNeeds] = useState<Need[]>(DUMMY_NEEDS);
  const [selectedId, setSelectedId] = useState<string | null>(initial || "d1");
  const [ranked, setRanked] = useState<RankedVolunteer[]>(DUMMY_RANKED);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supa = createClient();
    supa.from("needs").select("*").in("state", ["published", "triaged", "matched"]).then(({ data }) => {
      if (data && data.length > 0) {
        setNeeds(data);
        if (!selectedId || selectedId === "d1") setSelectedId(data[0].id);
      }
    });
  }, []);

  async function runMatch() {
    if (!selectedId) return;
    setBusy(true); setRanked([]); setChosen(new Set());
    const r = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needId: selectedId, k: 6 }),
    });
    setBusy(false);
    if (!r.ok) return toast.error("Matcher failed — API error");
    const j = await r.json();
    if (j.ranked && j.ranked.length > 0) {
      setRanked(j.ranked);
    } else {
      setRanked(DUMMY_RANKED);
      toast.warning("No live matches found — displaying demo matches");
    }
  }

  async function dispatch() {
    if (!selectedId || chosen.size === 0) return;
    setBusy(true);
    const r = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        needId: selectedId,
        volunteerIds: Array.from(chosen),
        reason: "Coordinator dispatch via Matcher Studio",
      }),
    });
    setBusy(false);
    if (r.ok) {
      toast.success(`Dispatched to ${chosen.size} volunteer(s)`);
      setChosen(new Set());
    } else {
      toast.error("Dispatch failed");
    }
  }

  const sel = needs.find((n) => n.id === selectedId);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("Matcher Studio")}</h1>
        <p className="text-sm text-slate-500">
          {t("Local Chroma vector search → Gemini re-rank with explanations.")}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>{t("Open needs")}</CardTitle></CardHeader>
          <CardBody className="space-y-1 max-h-[60vh] overflow-y-auto">
            {needs.length === 0 ? (
              <Empty title={t("No open needs")} />
            ) : needs.map((n) => (
              <button
                key={n.id}
                onClick={() => { setSelectedId(n.id); setRanked([]); }}
                className={`w-full text-left rounded-md px-3 py-2 text-sm border ${
                  selectedId === n.id ? "border-brand bg-brand-50" : "border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="font-medium truncate">{n.title}</div>
                <div className="flex gap-1 mt-1">
                  <Badge tone={n.urgency === "high" || n.urgency === "critical" ? "red" : "amber"}>
                    {t(n.urgency)}
                  </Badge>
                  <Badge tone="slate">{n.required_skills?.[0] ?? "—"}</Badge>
                </div>
              </button>
            ))}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <CardTitle className="truncate">{sel ? sel.title : t("Pick a need")}</CardTitle>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button onClick={runMatch} disabled={!selectedId || busy} variant="outline" className="w-full sm:w-auto flex-1 sm:flex-none justify-center">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {busy ? t("Matching…") : t("Find Volunteers")}
                </Button>
                <Button onClick={dispatch} disabled={chosen.size === 0 || busy} className="w-full sm:w-auto flex-1 sm:flex-none justify-center">
                  {t("Dispatch")} ({chosen.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {sel && (
              <div className="mb-4 text-sm">
                <p className="text-slate-700">{sel.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sel.required_skills?.map((s) => <Chip key={s}>{s}</Chip>)}
                  {sel.languages_helpful?.map((l) => <Chip key={l}>lang: {l}</Chip>)}
                  {sel.geo_lat && (
                    <Chip>geo: {sel.geo_lat.toFixed(3)}, {sel.geo_lng?.toFixed(3)}</Chip>
                  )}
                </div>
              </div>
            )}
            {ranked.length === 0 ? (
              <Empty title={t("No matches yet")} hint={t("Click 'Find Volunteers' to run the matcher.")} />
            ) : (
              <ul className="space-y-2">
                {ranked.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-lg border p-3 cursor-pointer ${
                      chosen.has(r.id) ? "border-brand bg-brand-50" : "border-slate-200 bg-white"
                    }`}
                    onClick={() => {
                      const n = new Set(chosen);
                      n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                      setChosen(n);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{r.display_name}</div>
                        <div className="text-sm text-slate-600 mt-0.5">{r.reason}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.distance_km > 0 && <Chip>{r.distance_km.toFixed(1)} km</Chip>}
                          {r.skills.slice(0, 3).map((s) => <Chip key={s}>{s}</Chip>)}
                          {r.languages.slice(0, 2).map((l) => <Chip key={l}>{l}</Chip>)}
                        </div>
                      </div>
                      <Badge tone="blue">{Math.round(r.score * 100)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
