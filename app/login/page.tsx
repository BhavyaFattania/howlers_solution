"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Building2, HeartHandshake, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type PortalRole = "coordinator" | "volunteer";

const PORTALS: { value: PortalRole; label: string; sub: string; Icon: React.ElementType }[] = [
  {
    value: "coordinator",
    label: "NGO / Coordinator",
    sub: "Mission control, triage & matching",
    Icon: Building2,
  },
  {
    value: "volunteer",
    label: "Volunteer",
    sub: "Browse needs, accept tasks",
    Icon: HeartHandshake,
  },
];

const PANEL_CONTENT: Record<PortalRole, { headline: string; bullets: string[] }> = {
  coordinator: {
    headline: "Your NGO's command centre,\npowered by AI.",
    bullets: [
      "Live heatmap of all open community needs",
      "AI-powered volunteer matching in seconds",
      "Kanban triage inbox with real-time updates",
      "Voice channel for volunteer retention",
    ],
  },
  volunteer: {
    headline: "Find where you're\nneeded most, today.",
    bullets: [
      "3 personalised need cards ranked for your skills",
      "One-tap acceptance and geo check-in",
      "Proof submission and completion tracking",
      "Voice channel to raise concerns safely",
    ],
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router  = useRouter();
  const params  = useSearchParams();
  const [portal, setPortal]   = useState<PortalRole>(
    params.get("role") === "volunteer" ? "volunteer" : "coordinator"
  );
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy]       = useState(false);

  const panel = PANEL_CONTENT[portal];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supa = createClient();
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);

    const storedRole = (data.user?.user_metadata as { role?: string })?.role as PortalRole | undefined;

    // If the account has a stored role and it differs from the selected portal, warn and honour stored role
    if (storedRole && storedRole !== portal) {
      toast.info(
        `Your account is registered as "${storedRole}". Redirecting to the correct portal.`,
        { duration: 4000 }
      );
      router.push(storedRole === "volunteer" ? "/volunteer/feed" : "/coordinator/mission-control");
      router.refresh();
      return;
    }

    // Use stored role, or fall back to what the user selected
    const effectiveRole = storedRole ?? portal;
    router.push(effectiveRole === "volunteer" ? "/volunteer/feed" : "/coordinator/mission-control");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left decorative panel — changes with portal selection */}
      <div className={cn(
        "hidden lg:flex flex-col justify-between p-10 transition-all duration-500",
        portal === "coordinator"
          ? "bg-gradient-to-br from-brand-500 via-brand to-violet-700"
          : "bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700"
      )}>
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <div className="h-8 w-8 rounded-lg bg-white/20 text-white grid place-items-center font-bold text-sm">S</div>
          <span className="text-white font-semibold text-lg">SamaajSetu</span>
        </Link>

        <div>
          <div className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-5",
            portal === "coordinator" ? "bg-white/15 text-white" : "bg-white/15 text-white"
          )}>
            {portal === "coordinator" ? <Building2 className="h-3.5 w-3.5" /> : <HeartHandshake className="h-3.5 w-3.5" />}
            {portal === "coordinator" ? "NGO Coordinator Portal" : "Volunteer Portal"}
          </div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-4 whitespace-pre-line">
            {panel.headline}
          </h2>
          <ul className="space-y-3">
            {panel.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-white/90">
                <CheckCircle className="h-4 w-4 text-white/60 shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/30 text-xs">© 2024 SamaajSetu</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden select-none">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-brand to-violet-600 text-white grid place-items-center text-xs font-bold">S</div>
            <span className="font-semibold text-slate-900">SamaajSetu</span>
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your SamaajSetu account</p>
          </div>

          {/* Portal selector */}
          <div className="mb-6">
            <Label>I am signing in as</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {PORTALS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPortal(p.value)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                    portal === p.value
                      ? p.value === "coordinator"
                        ? "border-brand bg-brand-50 ring-1 ring-brand"
                        : "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <p.Icon className={cn(
                    "h-4 w-4",
                    portal === p.value
                      ? p.value === "coordinator" ? "text-brand" : "text-emerald-600"
                      : "text-slate-400"
                  )} />
                  <span className={cn(
                    "text-sm font-semibold",
                    portal === p.value
                      ? p.value === "coordinator" ? "text-brand-700" : "text-emerald-700"
                      : "text-slate-700"
                  )}>
                    {p.label}
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight">{p.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Email address</Label>
              <Input
                type="email"
                required
                placeholder="you@ngo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              className={cn(
                "w-full",
                portal === "coordinator"
                  ? "shadow-sm shadow-brand/20"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-200"
              )}
              disabled={busy}
            >
              {busy ? "Signing in…" : (
                <>
                  Sign in as {portal === "coordinator" ? "NGO Coordinator" : "Volunteer"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">New to SamaajSetu?</span>
            </div>
          </div>

          <Link href={`/signup?role=${portal}`}>
            <Button variant="outline" className="w-full">
              Create a {portal === "coordinator" ? "coordinator" : "volunteer"} account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
