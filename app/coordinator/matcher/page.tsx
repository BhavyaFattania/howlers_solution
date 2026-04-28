"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
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

function MatcherStudioInner() {
  const params = useSearchParams();
  const initial = params.get("need");
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initial);
  const [ranked, setRanked] = useState<RankedVolunteer[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supa = createClient();
    supa.from("needs").select("*").in("state", ["published", "triaged", "matched"]).then(({ data }) => {
      setNeeds(data ?? []);
      if (!selectedId && data?.length) setSelectedId(data[0].id);
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
    if (!r.ok) return toast.error("Matcher failed — is Chroma running?");
    const j = await r.json();
    setRanked(j.ranked ?? []);
    if (!j.ranked?.length) toast.warning("No matches found — try seeding demo data");
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
        <h1 className="text-2xl font-semibold">Matcher Studio</h1>
        <p className="text-sm text-slate-500">
          Local Chroma vector search → Gemini re-rank with explanations.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Open needs</CardTitle></CardHeader>
          <CardBody className="space-y-1 max-h-[60vh] overflow-y-auto">
            {needs.length === 0 ? (
              <Empty title="No open needs" />
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
                    {n.urgency}
                  </Badge>
                  <Badge tone="slate">{n.required_skills?.[0] ?? "—"}</Badge>
                </div>
              </button>
            ))}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{sel ? sel.title : "Pick a need"}</CardTitle>
              <div className="flex gap-2">
                <Button onClick={runMatch} disabled={!selectedId || busy} variant="outline">
                  <Sparkles className="h-4 w-4" />
                  {busy ? "Matching…" : "Find Volunteers"}
                </Button>
                <Button onClick={dispatch} disabled={chosen.size === 0 || busy}>
                  Dispatch ({chosen.size})
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
              <Empty title="No matches yet" hint="Click 'Find Volunteers' to run the matcher." />
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
