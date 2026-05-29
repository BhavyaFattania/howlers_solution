"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Building2, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  {
    value: "coordinator" as const,
    label: "I run an NGO",
    sub: "Coordinator dashboard — triage, match, verify",
    Icon: Building2,
  },
  {
    value: "volunteer" as const,
    label: "I want to volunteer",
    sub: "Volunteer portal — browse, accept, complete",
    Icon: HeartHandshake,
  },
];

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = (params.get("role") === "coordinator" ? "coordinator" : "volunteer") as
    | "coordinator"
    | "volunteer";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [role, setRole]         = useState<"coordinator" | "volunteer">(initialRole);
  const [busy, setBusy]         = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supa = createClient();
    const { error } = await supa.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          role,
          tenant_id: process.env.NEXT_PUBLIC_DEMO_TENANT_ID,
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — signing you in");
    const { error: e2 } = await supa.auth.signInWithPassword({ email, password });
    if (e2) return toast.error(e2.message);
    router.push(role === "volunteer" ? "/volunteer/profile" : "/coordinator/mission-control");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-violet-600 via-brand to-brand-500">
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <img src="/samaajsetu.webp" alt="Logo" className="h-8 w-8 object-contain" />
          <span className="text-white font-semibold text-lg">SamaajSetu</span>
        </Link>

        <div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-3">
            Every community need.<br />Every willing volunteer.<br />Connected.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Create your free account and start making an impact in under 5 minutes.
            No credit card required.
          </p>
          <div className="mt-8 space-y-3">
            {["Free to get started", "Secure multi-tenant data isolation", "AI matching from day one"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2026 SamaajSetu</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden select-none">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-brand to-violet-600 text-white grid place-items-center text-xs font-bold">S</div>
            <span className="font-semibold text-slate-900">SamaajSetu</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="text-sm text-slate-500 mt-1">Join SamaajSetu — free forever for small NGOs</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Role picker */}
            <div>
              <Label>I am a</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                      role === r.value
                        ? "border-brand bg-brand-50 ring-1 ring-brand"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <r.Icon className={cn("h-4 w-4", role === r.value ? "text-brand" : "text-slate-500")} />
                    <span className={cn("text-sm font-medium", role === r.value ? "text-brand-700" : "text-slate-900")}>
                      {r.label}
                    </span>
                    <span className="text-[11px] text-slate-400 leading-tight">{r.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Full name</Label>
              <Input required placeholder="Priya Mehta" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email address</Label>
              <Input type="email" required placeholder="you@ngo.org" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required minLength={6} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <Button className="w-full shadow-sm shadow-brand/20" disabled={busy}>
              {busy ? "Creating account…" : (
                <><span>Create account</span><ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="text-sm text-slate-500 mt-5 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-brand font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
