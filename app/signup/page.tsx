"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Input, Label } from "@/components/ui/primitives";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"coordinator" | "volunteer">(initialRole);
  const [busy, setBusy] = useState(false);

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
    <main className="min-h-screen grid place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label>Display name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>I am a</Label>
              <div className="flex gap-2">
                {(["volunteer", "coordinator"] as const).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 h-10 rounded-md border text-sm capitalize ${
                      role === r
                        ? "border-brand bg-brand-50 text-brand-700"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-slate-500 mt-4">
            Already have an account? <Link href="/login" className="text-brand">Sign in</Link>
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
