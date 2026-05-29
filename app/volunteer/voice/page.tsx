"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Textarea, Badge } from "@/components/ui/primitives";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

interface Msg {
  role: "user" | "assistant";
  text: string;
  classification?: string;
  themes?: string[];
}

const DUMMY_MSGS: Msg[] = [
  { role: "user", text: "I felt like our team was very disorganized during the food distribution yesterday." },
  { role: "assistant", text: "I'm sorry to hear that the distribution felt disorganized. Thank you for raising this. I've classified your feedback and sent it to your coordinator for review.", classification: "transactional", themes: ["logistics", "disorganization"] }
];

export default function VolunteerVoicePage() {
  const { t } = useTranslation();
  const [msgs, setMsgs] = useState<Msg[]>(DUMMY_MSGS);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const me: Msg = { role: "user", text: input };
    setMsgs((m) => [...m, me]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: me.text }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "chat failed");
      setMsgs((m) => [...m, {
        role: "assistant",
        text: j.reply,
        classification: j.classification,
        themes: j.themes,
      }]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("Considerate Voice")}</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {t("Tell us how you feel — about a task, the team, the mission. Your concern goes straight to your coordinator with full context.")}
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {msgs.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center">
                {t('Try: "I felt the team didn\'t really listen at the cleanup yesterday."')}
              </div>
            ) : msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-brand text-white" : "bg-slate-100 text-slate-800"
                }`}>
                  {m.text}
                  {m.classification && (
                    <div className="mt-1 flex gap-1">
                      <Badge tone="purple">{m.classification.replace("_", " ")}</Badge>
                      {m.themes?.slice(0, 3).map((t) => (
                        <Badge key={t} tone="slate">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("What's on your mind?")}
              className="min-h-[64px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
              }}
            />
            <div className="flex justify-end w-full">
              <Button onClick={send} disabled={busy || !input.trim()} className="w-full sm:w-auto justify-center">
                <Send className="h-4 w-4 mr-1.5" />
                {busy ? t("Sending…") : t("Send")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
