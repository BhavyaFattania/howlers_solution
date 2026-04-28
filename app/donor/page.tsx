"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader, CardTitle, KpiTile } from "@/components/ui/primitives";

export default function DonorPortal() {
  const [stats, setStats] = useState({
    needs: 0,
    completed: 0,
    volunteers: 0,
    livesTouched: 0,
  });
  const [recent, setRecent] = useState<{ title: string; created_at: string }[]>([]);

  useEffect(() => {
    const supa = createClient();
    Promise.all([
      supa.from("needs").select("id,headcount_filled,state").limit(500),
      supa.from("profiles").select("id").eq("role", "volunteer"),
      supa.from("needs").select("title,created_at").in("state", ["completed", "verified"]).order("created_at", { ascending: false }).limit(6),
    ]).then(([{ data: needs }, { data: vols }, { data: rec }]) => {
      const completed = (needs ?? []).filter((n) => ["completed", "verified", "closed"].includes(n.state)).length;
      const lives = (needs ?? []).reduce((s, n) => s + (n.headcount_filled || 0) * 5, 0);
      setStats({
        needs: needs?.length ?? 0,
        completed,
        volunteers: vols?.length ?? 0,
        livesTouched: lives,
      });
      setRecent(rec ?? []);
    });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto max-w-5xl px-4 py-8 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-brand text-white grid place-items-center font-bold">S</div>
          <span className="font-semibold">SamaajSetu — Impact</span>
        </Link>
        <Link href="/login" className="text-sm text-brand hover:underline">NGO sign in</Link>
      </header>
      <section className="mx-auto max-w-5xl px-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Where your support goes — in real time.
        </h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Live, anonymized aggregates from across the network. Every counter ties to a real
          coordinator action and a real volunteer hour.
        </p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="Needs in system" value={stats.needs} hint="All-time" />
          <KpiTile label="Needs completed" value={stats.completed} />
          <KpiTile label="Active volunteers" value={stats.volunteers} />
          <KpiTile label="Lives touched (est.)" value={stats.livesTouched} hint="≈ headcount × 5" />
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>Recent stories</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">As completions roll in, they'll appear here.</p>
            ) : recent.map((r, i) => (
              <div key={i} className="text-sm flex justify-between border-b border-slate-100 pb-2 last:border-b-0">
                <span>{r.title}</span>
                <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="mt-8 mb-16 rounded-xl bg-white border border-slate-200 p-6 text-center">
          <h3 className="text-xl font-semibold">Support a program</h3>
          <p className="text-sm text-slate-500 mt-1">
            Donations route directly to the NGO running the program. (Demo placeholder.)
          </p>
          <button className="mt-4 h-11 px-6 rounded-md bg-accent-saffron text-white font-medium">
            Donate (demo)
          </button>
        </div>
      </section>
    </main>
  );
}
