"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, KpiTile, Badge, Empty } from "@/components/ui/primitives";
import { fmtRelative } from "@/lib/utils";
import type { Need } from "@/lib/types";
import { Siren, AlertTriangle } from "lucide-react";

const MissionMap = dynamic(() => import("@/components/map/MissionMap").then((m) => m.MissionMap), {
  ssr: false,
  loading: () => <div className="h-full w-full grid place-items-center text-slate-400">Loading map…</div>,
});

interface ActivityRow {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export default function MissionControl() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [crisis, setCrisis] = useState<{ active: boolean; geojson?: GeoJSON.GeoJsonObject; district?: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const supa = createClient();
    let cancel = false;

    async function load() {
      const [{ data: ns }, { data: act }, crisisRes] = await Promise.all([
        supa.from("needs").select("*").order("created_at", { ascending: false }).limit(200),
        supa.from("activity_events").select("*").order("created_at", { ascending: false }).limit(20),
        fetch("/api/crisis").then((r) => r.json()),
      ]);
      if (!cancel) {
        setNeeds(ns ?? []);
        setActivity(act ?? []);
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
    const open = needs.filter((n) => ["published", "matched", "in_progress"].includes(n.state)).length;
    const critical = needs.filter((n) => n.urgency === "critical" || n.urgency === "high").length;
    const today = needs.filter((n) =>
      new Date(n.created_at).toDateString() === new Date().toDateString()
    ).length;
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
    <div className={`p-6 ${crisis?.active ? "bg-red-50/40" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Mission Control</h1>
          <p className="text-sm text-slate-500">
            Live picture of community needs across your programs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seed} disabled={seeding}>
            {seeding ? "Seeding…" : "Seed demo data"}
          </Button>
          <Button
            variant={crisis?.active ? "danger" : "outline"}
            onClick={toggleCrisis}
          >
            <Siren className="h-4 w-4" />
            {crisis?.active ? "Clear Crisis" : "Declare Crisis"}
          </Button>
        </div>
      </div>

      {crisis?.active && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3 text-red-800">
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm">
            <strong>Crisis Mode active</strong> — {crisis.district}. Match radius relaxed; volunteers receiving banner alert.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiTile label="Open Needs" value={kpis.open} hint="Across all programs" />
        <KpiTile label="High / Critical" value={kpis.critical} />
        <KpiTile label="Logged Today" value={kpis.today} />
        <KpiTile label="Completed" value={kpis.completed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Urgent Needs Heatmap</CardTitle></CardHeader>
            <div className="h-[460px]">
              <MissionMap
                needs={needs}
                crisisGeo={crisis?.active ? crisis?.geojson : null}
              />
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Live Activity</CardTitle></CardHeader>
          <CardBody className="space-y-2 max-h-[460px] overflow-y-auto">
            {activity.length === 0 ? (
              <Empty title="No activity yet" hint="Try seeding demo data above." />
            ) : (
              activity.map((a) => (
                <div key={a.id} className="text-sm flex items-start gap-2">
                  <Badge tone={a.kind.startsWith("crisis") ? "red" : a.kind.includes("accepted") ? "green" : "blue"}>
                    {a.kind.split(".")[1] ?? a.kind}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-slate-700">
                      {(a.payload as { title?: string }).title ?? a.kind}
                    </div>
                    <div className="text-xs text-slate-400">{fmtRelative(a.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
