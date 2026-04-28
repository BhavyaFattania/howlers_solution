"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Badge, Empty } from "@/components/ui/primitives";
import type { Need, NeedState } from "@/lib/types";
import { fmtRelative, URGENCY_COLOR } from "@/lib/utils";

const COLUMNS: { id: NeedState; title: string }[] = [
  { id: "submitted", title: "Submitted" },
  { id: "triaged", title: "Triaged" },
  { id: "published", title: "Published" },
  { id: "matched", title: "Matched" },
  { id: "in_progress", title: "In progress" },
  { id: "verified", title: "Verified" },
];

export default function TriagePage() {
  const [needs, setNeeds] = useState<Need[]>([]);

  async function load() {
    const supa = createClient();
    const { data } = await supa.from("needs").select("*").order("created_at", { ascending: false });
    setNeeds(data ?? []);
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Triage Inbox</h1>
          <p className="text-sm text-slate-500">Drag a need's status forward as you handle it.</p>
        </div>
        <Link href="/coordinator/needs/new"><Button>+ New Need</Button></Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const items = needs.filter((n) => n.state === col.id);
          return (
            <div key={col.id} className="bg-slate-100 rounded-xl p-2 min-h-[60vh]">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2 px-1">
                {col.title} <span className="text-slate-400">· {items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-xs text-slate-400 px-1 py-3">Empty</div>
                ) : (
                  items.map((n) => <NeedCardRow key={n.id} need={n} onMove={move} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NeedCardRow({ need, onMove }: { need: Need; onMove: (n: Need, to: NeedState) => void }) {
  const idx = COLUMNS.findIndex((c) => c.id === need.state);
  const next = COLUMNS[idx + 1];
  return (
    <Card>
      <CardBody className="p-3">
        <div className="flex items-start gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full mt-1"
            style={{ background: URGENCY_COLOR[need.urgency] }}
          />
          <div className="flex-1 min-w-0">
            <Link href={`/coordinator/matcher?need=${need.id}`} className="text-sm font-medium text-slate-900 hover:underline truncate block">
              {need.title}
            </Link>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge tone="slate">{need.category ?? "uncat"}</Badge>
              <Badge tone={need.urgency === "high" || need.urgency === "critical" ? "red" : "amber"}>
                {need.urgency}
              </Badge>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{fmtRelative(need.created_at)}</div>
          </div>
        </div>
        {next && (
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onMove(need, next.id)}>
            → {next.title}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
