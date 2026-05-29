"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Badge, Chip, Empty } from "@/components/ui/primitives";
import { fmtRelative } from "@/lib/utils";
import { CheckCircle, Circle, MapPin, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

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

const STEPS = ["offered", "accepted", "checked_in", "proof_submitted", "verified"] as const;

const NEXT: Record<string, string | null> = {
  offered:       "accepted",
  accepted:      "checked_in",
  checked_in:    "proof_submitted",
  proof_submitted: null,
  verified:      null,
};

const STEP_LABEL: Record<string, string> = {
  offered:         "Offered",
  accepted:        "Accepted",
  checked_in:      "Checked in",
  proof_submitted: "Proof submitted",
  verified:        "Verified",
};

const ACTION_LABEL: Record<string, string> = {
  offered:      "Accept task",
  accepted:     "Check in on arrival",
  checked_in:   "Submit proof",
};

const DUMMY_TASKS: Row[] = [
  {
    id: "a1",
    state: "accepted",
    match_reason: "Matched because you speak Gujarati and are within 2.4 km of the site.",
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    need: {
      id: "f1",
      title: "Emergency food distribution — Sector 14",
      description: "500 families affected by flooding need emergency food kits and clean water.",
      urgency: "critical",
      geo_lat: 23.0225,
      geo_lng: 72.5714,
    },
  },
  {
    id: "a2",
    state: "offered",
    match_reason: "Your first-aid certification is an exact skill match for this medical camp.",
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    need: {
      id: "f2",
      title: "Medical camp setup — Community Hall",
      description: "First-aid trained volunteers needed for a 2-day community medical camp.",
      urgency: "high",
      geo_lat: 23.04,
      geo_lng: 72.58,
    },
  },
];

function TaskStepper({ state }: { state: string }) {
  const { t } = useTranslation();
  const current = STEPS.indexOf(state as typeof STEPS[number]);
  return (
    <div>
      <div className="flex items-center gap-0 mb-2">
        {STEPS.map((s, i) => {
          const done    = i < current;
          const active  = i === current;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center flex-1">
                {done ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : active ? (
                  <div className="h-4 w-4 rounded-full border-2 border-brand bg-brand-50" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" />
                )}
                <span className={`text-[10px] mt-0.5 whitespace-nowrap hidden sm:block ${active ? "font-semibold text-brand" : done ? "text-emerald-600" : "text-slate-400"}`}>
                  {t(STEP_LABEL[s])}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 mb-0 sm:mb-4 ${i < current ? "bg-emerald-300" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-center text-slate-600 sm:hidden mb-3">
        {t("Status")}: <span className="font-semibold text-brand">{t(STEP_LABEL[state] ?? state)}</span>
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Row[]>(DUMMY_TASKS);

  async function load() {
    const supa = createClient();
    const { data: u } = await supa.auth.getUser();
    if (!u.user) return;
    const { data } = await supa
      .from("assignments")
      .select("*, need:needs(*)")
      .eq("volunteer_id", u.user.id)
      .order("created_at", { ascending: false });
    if (data && data.length > 0) setTasks(data as Row[]);
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
    if (r.ok) {
      toast.success(`Status updated → ${STEP_LABEL[next]}`);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, state: next } : t));
    } else {
      toast.error("Update failed");
    }
  }

  const urgencyTone = (u: string) =>
    u === "critical" ? "red" : u === "high" ? "orange" : u === "medium" ? "amber" : "slate";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">{t("My Tasks")}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t("Track and advance your active assignments.")}</p>
      </div>

      {tasks.length === 0 ? (
        <Empty
          title={t("No tasks yet")}
          hint={t("Accept a need from the Home tab to get started.")}
          icon={<CheckCircle className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{task.need.title}</CardTitle>
                  <Badge tone={urgencyTone(task.need.urgency) as "red" | "orange" | "amber" | "slate"}>
                    {t(task.need.urgency)}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Progress stepper */}
                <TaskStepper state={task.state} />

                <p className="text-sm text-slate-600 leading-relaxed">{task.need.description}</p>

                {task.match_reason && (
                  <div className="rounded-lg bg-brand-50 border border-brand/10 px-3 py-2 text-xs text-brand-700">
                    {task.match_reason}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center text-xs text-slate-500">
                  {task.need.geo_lat && (
                    <Chip>
                      <MapPin className="h-3 w-3 mr-0.5 inline" />
                      {task.need.geo_lat.toFixed(3)}, {task.need.geo_lng?.toFixed(3)}
                    </Chip>
                  )}
                  <Chip>
                    <Clock className="h-3 w-3 mr-0.5 inline" />
                    {fmtRelative(task.created_at)}
                  </Chip>
                </div>

                {NEXT[task.state] && (
                  <Button size="sm" className="w-full" onClick={() => advance(task.id, task.state)}>
                    {t(ACTION_LABEL[task.state] ?? "Next step")}
                  </Button>
                )}

                {task.state === "verified" && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    {t("Task verified — thank you for your service!")}
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
