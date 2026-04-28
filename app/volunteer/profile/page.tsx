"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui/primitives";

interface ProfileForm {
  display_name: string;
  languages: string;
  skills: string;
  home_lat: string;
  home_lng: string;
  max_radius_km: number;
}

export default function VolunteerProfilePage() {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    languages: "",
    skills: "",
    home_lat: "",
    home_lng: "",
    max_radius_km: 8,
  });

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((j) => {
      if (j.profile) {
        const p = j.profile;
        setForm({
          display_name: p.display_name ?? "",
          languages: (p.languages ?? []).join(", "),
          skills: (Array.isArray(p.skills) ? p.skills : [])
            .map((s: { tag?: string } | string) => (typeof s === "string" ? s : s.tag))
            .join(", "),
          home_lat: p.home_lat?.toString() ?? "",
          home_lng: p.home_lng?.toString() ?? "",
          max_radius_km: p.max_radius_km ?? 8,
        });
      }
    });
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({
        ...f,
        home_lat: pos.coords.latitude.toFixed(5),
        home_lng: pos.coords.longitude.toFixed(5),
      })),
      () => toast.error("Permission denied")
    );
  }

  async function save() {
    setBusy(true);
    const body = {
      display_name: form.display_name,
      languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean).map((tag) => ({ tag })),
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
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Skills, languages and location power the smart matcher.
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <Label>Display name</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div>
            <Label>Skills (comma-separated)</Label>
            <Textarea
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="first_aid, tutoring_math, lifting, translation"
            />
          </div>
          <div>
            <Label>Languages (ISO codes)</Label>
            <Input
              value={form.languages}
              onChange={(e) => setForm({ ...form, languages: e.target.value })}
              placeholder="gu, hi, en"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Home Lat</Label>
              <Input value={form.home_lat} onChange={(e) => setForm({ ...form, home_lat: e.target.value })} />
            </div>
            <div>
              <Label>Home Lng</Label>
              <Input value={form.home_lng} onChange={(e) => setForm({ ...form, home_lng: e.target.value })} />
            </div>
            <div>
              <Label>Radius (km)</Label>
              <Input
                type="number" min={1} max={100}
                value={form.max_radius_km}
                onChange={(e) => setForm({ ...form, max_radius_km: parseInt(e.target.value) || 8 })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-between pt-2">
            <Button variant="outline" onClick={useMyLocation}>Use my location</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
