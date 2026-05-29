"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader, CardTitle, Badge, Empty, Chip } from "@/components/ui/primitives";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { fmtRelative } from "@/lib/utils";

interface Ticket {
  id: string;
  message: string;
  classification: "relational" | "value_based" | "transactional" | "other" | null;
  sentiment: number | null;
  themes: string[];
  reply: string | null;
  resolved: boolean;
  created_at: string;
}

const TONE: Record<string, "blue" | "purple" | "amber" | "slate"> = {
  relational: "blue",
  value_based: "purple",
  transactional: "amber",
  other: "slate",
};

const DUMMY_TICKETS: Ticket[] = [
  { id: "v1", message: "Hi, I just arrived at Sector 14 but the trucks haven't reached here yet. Should I wait?", classification: "transactional", sentiment: -0.1, themes: ["logistics", "delay"], reply: "Please coordinate with the local supervisor. The trucks are 15 minutes away.", resolved: true, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "v2", message: "The community here is very grateful for the medical camp. It feels great to help out!", classification: "value_based", sentiment: 0.9, themes: ["gratitude", "morale"], reply: null, resolved: true, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "v3", message: "Is there any training provided before we start the tutoring sessions?", classification: "relational", sentiment: 0.2, themes: ["training", "guidance"], reply: "Yes! There will be a 1-hour orientation tomorrow morning.", resolved: true, created_at: new Date(Date.now() - 86400000).toISOString() },
];

export default function VoiceChannelPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>(DUMMY_TICKETS);
  const [filter, setFilter] = useState<"all" | "relational" | "value_based" | "transactional">("all");

  useEffect(() => {
    const supa = createClient();
    async function load() {
      const { data } = await supa
        .from("voice_tickets").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setTickets(data as Ticket[]);
      }
    }
    load();
    const ch = supa
      .channel("voice")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_tickets" }, load)
      .subscribe();
    return () => { supa.removeChannel(ch); };
  }, []);

  const list = tickets.filter((t) => filter === "all" || t.classification === filter);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("Voice Channel")}</h1>
        <p className="text-sm text-slate-500">
          {t("Volunteer concerns, classified by Gemini into relational / value / transactional themes.")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "relational", "value_based", "transactional"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 px-3 rounded-md text-sm capitalize whitespace-nowrap ${
              filter === f ? "bg-brand text-white" : "bg-white border border-slate-300"
            }`}
          >
            {t(f.replace("_", " "))}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title={t("No concerns yet")} hint={t("Volunteers can raise concerns from the Voice tab.")} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t.classification ? (
                      <Badge tone={TONE[t.classification]}>{t.classification.replace("_", " ")}</Badge>
                    ) : (
                      <Badge tone="slate">unknown</Badge>
                    )}
                  </CardTitle>
                  <span className="text-xs text-slate-400">{fmtRelative(t.created_at)}</span>
                </div>
              </CardHeader>
              <CardBody className="space-y-2">
                <p className="text-sm text-slate-700">"{t.message}"</p>
                {t.themes?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.themes.map((th) => <Chip key={th}>{th}</Chip>)}
                  </div>
                )}
                {t.sentiment != null && (
                  <div className="text-xs text-slate-500">Sentiment: {t.sentiment.toFixed(2)}</div>
                )}
                {t.reply && (
                  <div className="text-xs text-slate-600 bg-slate-50 rounded p-2">
                    <span className="font-semibold">Auto-reply:</span> {t.reply}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
