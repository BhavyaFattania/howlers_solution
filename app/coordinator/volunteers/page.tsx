"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader, CardTitle, Chip, Empty } from "@/components/ui/primitives";

interface Vol {
  id: string;
  display_name: string | null;
  languages: string[];
  skills: { tag: string }[] | string[];
  home_lat: number | null;
  home_lng: number | null;
  trust_score: number | null;
}

export default function VolunteersPage() {
  const [vols, setVols] = useState<Vol[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const supa = createClient();
    supa.from("profiles").select("*").eq("role", "volunteer").then(({ data }) => setVols(data ?? []));
  }, []);

  const filtered = vols.filter((v) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      v.display_name?.toLowerCase().includes(s) ||
      v.languages.some((l) => l.toLowerCase().includes(s)) ||
      (Array.isArray(v.skills) ? v.skills : []).some((sk) => {
        const t = typeof sk === "string" ? sk : sk.tag;
        return t.toLowerCase().includes(s);
      })
    );
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Volunteers</h1>
          <p className="text-sm text-slate-500">{filtered.length} total · search by name, skill, or language</p>
        </div>
        <input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-72 rounded-md border border-slate-300 px-3 text-sm"
        />
      </div>
      {filtered.length === 0 ? (
        <Empty title="No volunteers yet" hint="Run 'Seed demo data' from Mission Control." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => {
            const tags = (Array.isArray(v.skills) ? v.skills : [])
              .map((s) => (typeof s === "string" ? s : s.tag));
            return (
              <Card key={v.id}>
                <CardHeader><CardTitle>{v.display_name ?? "—"}</CardTitle></CardHeader>
                <CardBody className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {tags.slice(0, 6).map((t) => <Chip key={t}>{t}</Chip>)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Languages: {v.languages.join(", ") || "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Geo: {v.home_lat?.toFixed(3) ?? "—"}, {v.home_lng?.toFixed(3) ?? "—"}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
