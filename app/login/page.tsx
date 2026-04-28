"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, Input, Label } from "@/components/ui/primitives";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/coordinator/mission-control";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supa = createClient();
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    const role = (data.user?.user_metadata as { role?: string })?.role;
    const redirect =
      role === "volunteer" ? "/volunteer/feed" : next;
    toast.success("Signed in");
    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to SamaajSetu</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="text-sm text-slate-500 mt-4">
            New here? <Link href="/signup" className="text-brand">Create an account</Link>
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
