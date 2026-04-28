"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, User, Languages, Crosshair, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Input, Label, Chip } from "@/components/ui/primitives";

interface ProfileForm {
  display_name: string;
  languages: string[];
  skills: string[];
  home_lat: string;
  home_lng: string;
  max_radius_km: number;
}

const LANGUAGE_OPTIONS = [
  { code: "gu", label: "Gujarati" },
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
  { code: "mr", label: "Marathi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  return (
    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand to-violet-600 text-white grid place-items-center text-xl font-bold shadow-md">
      {initials}
    </div>
  );
}

export default function VolunteerProfilePage() {
  const [busy, setBusy] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    languages: [],
    skills: [],
    home_lat: "",
    home_lng: "",
    max_radius_km: 8,
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((j) => {
        if (j.profile) {
          const p = j.profile;
          setForm({
            display_name: p.display_name ?? "",
            languages: Array.isArray(p.languages) ? p.languages : [],
            skills: (Array.isArray(p.skills) ? p.skills : [])
              .map((s: { tag?: string } | string) => (typeof s === "string" ? s : s.tag ?? ""))
              .filter(Boolean),
            home_lat: p.home_lat?.toString() ?? "",
            home_lng: p.home_lng?.toString() ?? "",
            max_radius_km: p.max_radius_km ?? 8,
          });
        }
      })
      .catch(() => {});
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          home_lat: pos.coords.latitude.toFixed(5),
          home_lng: pos.coords.longitude.toFixed(5),
        })),
      () => toast.error("Permission denied")
    );
  }

  function addSkill() {
    const tag = skillInput.trim();
    if (!tag || form.skills.includes(tag)) { setSkillInput(""); return; }
    setForm((f) => ({ ...f, skills: [...f.skills, tag] }));
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }));
  }

  function toggleLanguage(code: string) {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(code)
        ? f.languages.filter((l) => l !== code)
        : [...f.languages, code],
    }));
  }

  async function save() {
    setBusy(true);
    const body = {
      display_name: form.display_name,
      languages: form.languages,
      skills: form.skills.map((tag) => ({ tag })),
      home_lat: form.home_lat ? parseFloat(form.home_lat) : null,
      home_lng: form.home_lng ? parseFloat(form.home_lng) : null,
      max_radius_km: form.max_radius_km,
    };
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (r.ok) toast.success("Profile saved — matcher will use this");
    else toast.error("Save failed");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Profile header card */}
      <Card>
        <CardBody className="flex items-center gap-4">
          <Avatar name={form.display_name} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 text-lg truncate">
              {form.display_name || "Your name"}
            </div>
            <div className="text-sm text-slate-500">Volunteer</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.skills.slice(0, 4).map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
              {form.skills.length > 4 && (
                <Chip>+{form.skills.length - 4} more</Chip>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Identity */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <CardTitle className="text-sm">Identity</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <Label>Display name</Label>
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Priya Mehta"
            />
          </div>
        </CardBody>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <span className="text-base">🛠</span>
          <CardTitle className="text-sm">Skills</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
            {form.skills.map((s) => (
              <Chip key={s} onRemove={() => removeSkill(s)}>{s}</Chip>
            ))}
            {form.skills.length === 0 && (
              <span className="text-xs text-slate-400">No skills added yet</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="e.g. first_aid, tutoring, driving…"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addSkill} type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400">Press Enter or click + to add a skill tag</p>
        </CardBody>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-slate-400" />
          <CardTitle className="text-sm">Languages</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => toggleLanguage(l.code)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
                  form.languages.includes(l.code)
                    ? "border-brand bg-brand-50 text-brand-700 font-medium"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          <CardTitle className="text-sm">Location & Radius</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Latitude</Label>
              <Input
                value={form.home_lat}
                onChange={(e) => setForm({ ...form, home_lat: e.target.value })}
                placeholder="23.0225"
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                value={form.home_lng}
                onChange={(e) => setForm({ ...form, home_lng: e.target.value })}
                placeholder="72.5714"
              />
            </div>
            <div>
              <Label>Radius (km)</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={form.max_radius_km}
                onChange={(e) => setForm({ ...form, max_radius_km: parseInt(e.target.value) || 8 })}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={useMyLocation}>
            <Crosshair className="h-4 w-4" />
            Use my current location
          </Button>
        </CardBody>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy} className="shadow-sm shadow-brand/20">
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
