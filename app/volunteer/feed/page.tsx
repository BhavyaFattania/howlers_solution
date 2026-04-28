"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Badge, Chip, Empty } from "@/components/ui/primitives";
import type { RankedNeed } from "@/lib/types";

export default function VolunteerFeedPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [ranked, setRanked] = useState<RankedNeed[]>([]);
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState<{ active: boolean; district?: string } | null>(null);

  useEffect(() => {
    const supa = createClient();
    supa.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id });
    });
    fetch("/api/crisis").then((r) => r.json()).then(setCrisis).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  async function refresh() {
    if (!user) return;
    setBusy(true);
    const r = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerId: user.id, k: 3 }),
    });
    setBusy(false);
    if (r.ok) {
      const j = await r.json();
      setRanked(j.ranked ?? []);
    }
  }

  async function accept(needId: string, reason: string) {
    const r = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needId, asVolunteer: true, reason }),
    });
    if (r.ok) {
      toast.success("Thanks for stepping up!");
      refresh();
    } else {
      toast.error("Could not accept — try again");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Today, near you</h1>
      <p className="text-sm text-slate-500 mb-4">
        3 personalized needs, ranked by Gemini for your skills, language and location.
      </p>

      {crisis?.active && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 text-sm">
          🚨 <strong>Crisis active</strong> — {crisis.district}. If you're nearby, every hand helps.
        </div>
      )}

      <div className="flex justify-end mb-3">
        <Button variant="outline" onClick={refresh} disabled={busy}>
          <Sparkles className="h-4 w-4" /> {busy ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {ranked.length === 0 && !busy ? (
        <Empty title="No matches yet" hint="Update your profile with skills/location, or ask a coordinator to seed demo data." />
      ) : (
        <div className="space-y-3">
          {ranked.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{n.title}</CardTitle>
                  <Badge tone={n.urgency === "high" || n.urgency === "critical" ? "red" : "amber"}>
                    {n.urgency}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="text-sm text-slate-700 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>{n.reason}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {n.distance_km > 0 && (
                    <Chip><MapPin className="h-3 w-3 mr-1 inline" />{n.distance_km.toFixed(1)} km</Chip>
                  )}
                  {n.required_skills.slice(0, 4).map((s) => <Chip key={s}>{s}</Chip>)}
                </div>
                <Button className="w-full" onClick={() => accept(n.id, n.reason)}>
                  I'll help
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
