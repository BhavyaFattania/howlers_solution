import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/primitives";

export default function Landing() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-brand text-white grid place-items-center font-bold">
            S
          </div>
          <span className="font-semibold text-lg">SamaajSetu</span>
        </div>
        <nav className="flex gap-2">
          <Link href="/donor"><Button variant="ghost">Donor portal</Button></Link>
          <Link href="/login"><Button variant="outline">Sign in</Button></Link>
          <Link href="/signup"><Button>Get started</Button></Link>
        </nav>
      </header>

      <section className="mt-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-900">
          Turn scattered community-need data into intelligent volunteer action.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          SamaajSetu aggregates needs from paper surveys, mobile field reports, voice memos
          and SMS into one live picture — and uses Gemini-powered matching to send the right
          volunteer to the right place at the right time.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup?role=coordinator">
            <Button size="lg">I run an NGO</Button>
          </Link>
          <Link href="/signup?role=volunteer">
            <Button size="lg" variant="outline">I want to volunteer</Button>
          </Link>
        </div>
      </section>

      <section className="mt-16 grid md:grid-cols-3 gap-4">
        {[
          { t: "Paper → Data", d: "LlamaParse + Gemini turn scanned surveys into structured needs." },
          { t: "Smart matching", d: "Local Chroma vectors + Gemini re-rank picks the best volunteer in milliseconds." },
          { t: "Mission control", d: "Live heatmap, triage Kanban, voice channel for retention." },
        ].map((f) => (
          <Card key={f.t}>
            <CardBody>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="text-sm text-slate-600 mt-1">{f.d}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <footer className="mt-24 text-xs text-slate-400">
        Built with Next.js · Supabase · ChromaDB · Gemini via OpenRouter · Leaflet/OSM ·
        LlamaParse — every component has a labelled GCP migration path.
      </footer>
    </main>
  );
}
