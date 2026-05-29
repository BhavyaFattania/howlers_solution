"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader, CardTitle, Chip, Empty } from "@/components/ui/primitives";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

interface Vol {
  id: string;
  display_name: string | null;
  languages: string[];
  skills: { tag: string }[] | string[];
  home_lat: number | null;
  home_lng: number | null;
  trust_score: number | null;
}

const DUMMY_VOLS: Vol[] = [
  { id: "u1", display_name: "Rahul Sharma", languages: ["en", "hi"], skills: [{ tag: "first_aid" }, { tag: "logistics" }], home_lat: 23.04, home_lng: 72.58, trust_score: 95 },
  { id: "u2", display_name: "Priya Patel", languages: ["gu", "en"], skills: [{ tag: "tutoring" }, { tag: "translation" }], home_lat: 23.03, home_lng: 72.56, trust_score: 88 },
  { id: "u3", display_name: "Amit Kumar", languages: ["hi"], skills: [{ tag: "driving" }, { tag: "heavy_lifting" }], home_lat: 23.05, home_lng: 72.55, trust_score: 76 },
  { id: "u4", display_name: "Sneha Desai", languages: ["gu", "en", "hi"], skills: [{ tag: "caregiving" }, { tag: "medical" }], home_lat: 23.02, home_lng: 72.57, trust_score: 99 },
];

export default function VolunteersPage() {
  const { t } = useTranslation();
  const [vols, setVols] = useState<Vol[]>(DUMMY_VOLS);
  const [q, setQ] = useState("");

  useEffect(() => {
    const supa = createClient();
    supa.from("profiles").select("*").eq("role", "volunteer").then(({ data }) => {
      if (data && data.length > 0) setVols(data);
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("Volunteers")}</h1>
          <p className="text-sm text-slate-500">{filtered.length} {t("total · search by name, skill, or language")}</p>
        </div>
        <input
          placeholder={t("Search…")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-full sm:w-72 rounded-md border border-slate-300 px-3 text-sm shrink-0"
        />
      </div>
      {filtered.length === 0 ? (
        <Empty title={t("No volunteers yet")} hint={t("Run 'Seed demo data' from Mission Control.")} />
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
                    {t("Languages")}: {v.languages.join(", ") || "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t("Geo")}: {v.home_lat?.toFixed(3) ?? "—"}, {v.home_lng?.toFixed(3) ?? "—"}
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
