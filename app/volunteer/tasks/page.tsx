"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Badge, Empty } from "@/components/ui/primitives";
import { fmtRelative } from "@/lib/utils";

interface Row {
  id: string;
  state: string;
  match_reason: string | null;
  created_at: string;
  need: {
    id: string;
    title: string;
    description: string;
    urgency: string;
    geo_lat: number | null;
    geo_lng: number | null;
  };
}

const NEXT: Record<string, string | null> = {
  offered: "accepted",
  accepted: "checked_in",
  checked_in: "proof_submitted",
  proof_submitted: null,
  verified: null,
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Row[]>([]);

  async function load() {
    const supa = createClient();
    const { data: u } = await supa.auth.getUser();
    if (!u.user) return;
    const { data } = await supa
      .from("assignments")
      .select("*, need:needs(*)")
      .eq("volunteer_id", u.user.id)
      .order("created_at", { ascending: false });
    setTasks(data as Row[] ?? []);
  }

  useEffect(() => {
    load();
    const supa = createClient();
    const ch = supa
      .channel("mytasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, load)
      .subscribe();
    return () => { supa.removeChannel(ch); };
  }, []);

  async function advance(id: string, current: string) {
    const next = NEXT[current];
    if (!next) return;
    const r = await fetch("/api/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        state: next,
        proof_note: next === "proof_submitted" ? "Completed via volunteer app" : undefined,
      }),
    });
    if (r.ok) toast.success(`State → ${next.replace("_", " ")}`);
    else toast.error("Update failed");
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">My Tasks</h1>
      {tasks.length === 0 ? (
        <Empty title="No tasks yet" hint="Accept a need from the Home tab." />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t.need.title}</CardTitle>
                  <Badge tone={t.state === "verified" ? "green" : t.state.startsWith("proof") ? "blue" : "amber"}>
                    {t.state.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <p className="text-slate-700">{t.need.description}</p>
                {t.match_reason && (
                  <p className="text-xs text-slate-500 italic">Matched because: {t.match_reason}</p>
                )}
                <div className="text-xs text-slate-400">{fmtRelative(t.created_at)}</div>
                {NEXT[t.state] && (
                  <Button size="sm" onClick={() => advance(t.id, t.state)}>
                    {t.state === "offered" ? "Accept" :
                      t.state === "accepted" ? "Check in" :
                      t.state === "checked_in" ? "Submit proof" : "Next"}
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
