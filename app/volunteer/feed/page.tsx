"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, MapPin, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Badge, Chip, Empty } from "@/components/ui/primitives";
import type { RankedNeed } from "@/lib/types";

const DUMMY_RANKED: RankedNeed[] = [
  {
    id: "f1",
    title: "Emergency food distribution — Sector 14",
    urgency: "critical",
    distance_km: 2.4,
    score: 0.94,
    reason: "Your Gujarati fluency and logistics skills are a perfect match. You're only 2.4 km away.",
    required_skills: ["logistics", "driving"],
  },
  {
    id: "f2",
    title: "Medical camp setup — Community Hall",
    urgency: "high",
    distance_km: 4.1,
    score: 0.81,
    reason: "Your first-aid certification and Hindi score make you a strong candidate for this camp.",
    required_skills: ["first_aid", "hindi"],
  },
  {
    id: "f3",
    title: "Children tutoring — Block C after-school sessions",
    urgency: "medium",
    distance_km: 1.8,
    score: 0.73,
    reason: "Nearest available need matching your teaching background. 1.8 km from your home location.",
    required_skills: ["tutoring", "english"],
  },
];

const URGENCY_TONE: Record<string, "red" | "orange" | "amber" | "slate"> = {
  critical: "red",
  high:     "orange",
  medium:   "amber",
  low:      "slate",
};

const URGENCY_COLOR: Record<string, string> = {
  low:      "#10b981",
  medium:   "#f59e0b",
  high:     "#ef4444",
  critical: "#7f1d1d",
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 tabular-nums">{pct}%</span>
    </div>
  );
}

export default function VolunteerFeedPage() {
  const [user, setUser]     = useState<{ id: string } | null>(null);
  const [ranked, setRanked] = useState<RankedNeed[]>(DUMMY_RANKED);
  const [busy, setBusy]     = useState(false);
  const [crisis, setCrisis] = useState<{ active: boolean; district?: string } | null>(null);

  useEffect(() => {
    const supa = createClient();
    supa.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id });
    });
    fetch("/api/crisis").then((r) => r.json()).then(setCrisis).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  async function refresh() {
    if (!user) return;
    setBusy(true);
    try {
      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId: user.id, k: 3 }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j.ranked && j.ranked.length > 0) setRanked(j.ranked);
      }
    } finally {
      setBusy(false);
    }
  }

  async function accept(needId: string, reason: string) {
    const r = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needId, asVolunteer: true, reason }),
    });
    if (r.ok) {
      toast.success("Thanks for stepping up! Check My Tasks to proceed.");
      refresh();
    } else {
      toast.error("Could not accept — try again");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Your matches today</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ranked by Gemini for your skills, language, and location.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
          <Sparkles className="h-3.5 w-3.5" />
          {busy ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Crisis banner */}
      {crisis?.active && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 text-sm flex items-center gap-2">
          <span className="text-base">🚨</span>
          <span>
            <strong>Crisis active</strong> — {crisis.district ?? "see coordinator"}. Every hand helps.
          </span>
        </div>
      )}

      {ranked.length === 0 && !busy ? (
        <Empty
          title="No matches yet"
          hint="Update your profile with skills and location, or ask a coordinator to seed demo data."
          icon={<Sparkles className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-4">
          {ranked.map((n, i) => (
            <Card key={n.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Urgency accent strip */}
              <div className="h-1 w-full" style={{ background: URGENCY_COLOR[n.urgency] }} />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <CardTitle className="text-base leading-snug">{n.title}</CardTitle>
                  </div>
                  <Badge tone={URGENCY_TONE[n.urgency]}>{n.urgency}</Badge>
                </div>
              </CardHeader>

              <CardBody className="pt-0 space-y-3">
                {/* AI reason */}
                <div className="flex items-start gap-2 rounded-lg bg-brand-50 border border-brand/10 p-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                  <span className="text-xs text-brand-700 leading-relaxed">{n.reason}</span>
                </div>

                {/* Match score */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 font-medium">Match score</span>
                  </div>
                  <ScoreBar score={n.score} />
                </div>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-1.5">
                  {n.distance_km > 0 && (
                    <Chip>
                      <MapPin className="h-3 w-3 mr-0.5 inline" />
                      {n.distance_km.toFixed(1)} km
                    </Chip>
                  )}
                  {n.required_skills.slice(0, 4).map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </div>

                <Button className="w-full" size="sm" onClick={() => accept(n.id, n.reason)}>
                  <Clock className="h-3.5 w-3.5" /> I'll help with this
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
