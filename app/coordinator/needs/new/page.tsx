"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Input, Label, Textarea, Badge, Chip } from "@/components/ui/primitives";
import type { ExtractedNeedDraft, Urgency } from "@/lib/types";

export default function NewNeedPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ExtractedNeedDraft | null>(null);
  const [markdown, setMarkdown] = useState<string>("");

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [skills, setSkills] = useState("");
  const [langs, setLangs] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [headcount, setHeadcount] = useState(1);

  function applyDraft(d: ExtractedNeedDraft) {
    setDraft(d);
    setTitle(d.title);
    setDescription(d.description);
    setCategory(d.category);
    setUrgency(d.urgency);
    setSkills((d.required_skills ?? []).join(", "));
    setLangs((d.languages_helpful ?? []).join(", "));
    setHeadcount(d.headcount_required ?? 1);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/ocr", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "OCR failed");
      setMarkdown(j.markdown ?? "");
      applyDraft(j.draft);
      toast.success("Survey extracted — review and save below");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    const r = await fetch("/api/needs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description, category, urgency,
        required_skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        languages_helpful: langs.split(",").map((s) => s.trim()).filter(Boolean),
        geo_lat: lat ? parseFloat(lat) : null,
        geo_lng: lng ? parseFloat(lng) : null,
        headcount_required: headcount,
        source: draft ? "paper_ocr" : "web",
        state: "published",
      }),
    });
    setBusy(false);
    if (r.ok) {
      toast.success("Need published");
      router.push("/coordinator/triage");
    } else {
      const j = await r.json().catch(() => ({}));
      toast.error(j.error?.formErrors?.[0] ?? "Save failed");
    }
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Paper survey → Need
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600">
              Drop a scanned survey or photo. LlamaParse extracts text; Gemini converts it to a draft Need.
            </p>
            <label className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-50">
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={busy} />
              <div className="text-center text-sm text-slate-500">
                <Upload className="h-5 w-5 mx-auto mb-1" />
                {busy ? "Processing…" : "Click to upload"}
              </div>
            </label>
            {markdown && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500">Extracted markdown</summary>
                <pre className="mt-2 p-2 bg-slate-50 rounded max-h-72 overflow-auto whitespace-pre-wrap">{markdown}</pre>
              </details>
            )}
            {draft && (
              <div className="text-xs flex items-center gap-1 text-emerald-700">
                <Sparkles className="h-3 w-3" /> Draft pre-filled — review and edit
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader><CardTitle>Need details</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div>
                <Label>Urgency</Label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as Urgency)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  {(["low", "medium", "high", "critical"] as Urgency[]).map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Required skills (comma-separated)</Label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="lifting, first_aid" />
            </div>
            <div>
              <Label>Helpful languages</Label>
              <Input value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="gu, hi, en" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Lat</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="23.045" />
              </div>
              <div>
                <Label>Lng</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="72.62" />
              </div>
              <div>
                <Label>Headcount</Label>
                <Input type="number" min={1} value={headcount} onChange={(e) => setHeadcount(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={save} disabled={busy || !title}>
                {busy ? "Saving…" : "Publish Need"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
