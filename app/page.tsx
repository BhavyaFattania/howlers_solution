"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Map, FileText, Sparkles, CheckCircle, Quote, Users, Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

const STATS = [
  { v: "24+",    l: "NGOs onboarded" },
  { v: "1,200+", l: "Active volunteers" },
  { v: "8,400+", l: "Needs resolved" },
  { v: "92%",    l: "Match accuracy" },
];

const FEATURES = [
  {
    Icon: FileText,
    tag: "Intake",
    title: "Paper → Structured data",
    body: "LlamaParse and Gemini convert scanned surveys, voice memos, and SMS into structured, searchable community needs — automatically.",
    iconCls: "bg-blue-50 text-blue-600",
    borderCls: "border-blue-100",
  },
  {
    Icon: Sparkles,
    tag: "AI Matching",
    title: "The right volunteer, every time",
    body: "Local vector search combined with Gemini re-ranking matches on skills, language, proximity, and availability in milliseconds.",
    iconCls: "bg-violet-50 text-violet-600",
    borderCls: "border-violet-100",
  },
  {
    Icon: Map,
    tag: "Operations",
    title: "Live mission control",
    body: "Real-time heatmap, triage Kanban board, and voice retention channel keep coordinators ahead of every situation.",
    iconCls: "bg-emerald-50 text-emerald-600",
    borderCls: "border-emerald-100",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Log a need",
    desc: "Field workers submit via web form, mobile app, scanned paper, or voice memo — any channel works.",
  },
  {
    n: "02",
    title: "AI triages",
    desc: "Gemini categorises urgency, extracts required skills, and instantly notifies the best-matched volunteers.",
  },
  {
    n: "03",
    title: "Volunteer acts",
    desc: "Accept in one tap, check in on arrival, submit photo proof — coordinator verifies and closes.",
  },
];

const BENEFITS = [
  "Match volunteers to needs in under 60 seconds",
  "Real-time mission control with live heatmap",
  "AI-powered triage from any intake format",
  "Built-in retention tools for long-term volunteers",
];

export default function Landing() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 select-none">
            <img src="/samaajsetu.webp" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-slate-900">{t("SamaajSetu")}</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/donor">
              <Button variant="ghost" size="sm">{t("Donor portal")}</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">{t("Sign in")}</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="shadow-sm shadow-brand/20">
                {t("Get started")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <div className="ml-1 pl-1 border-l border-slate-200 flex items-center">
              <LanguageSelector inline />
            </div>
          </nav>

          {/* Mobile Navigation Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSelector inline />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors animate-pulse-slow"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg absolute top-16 left-0 right-0 z-40 transition-all duration-300">
            <Link href="/donor" onClick={() => setMenuOpen(false)} className="block w-full">
              <Button variant="ghost" className="w-full justify-start text-slate-700 h-10">
                {t("Donor portal")}
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block w-full">
              <Button variant="outline" className="w-full justify-start h-10">
                {t("Sign in")}
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setMenuOpen(false)} className="block w-full">
              <Button className="w-full justify-start h-10 shadow-sm shadow-brand/20">
                {t("Get started")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_80%_0%,_#e8f0fe_0%,_transparent_70%)] pointer-events-none" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-28">
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 mb-6">
              <Zap className="h-3 w-3" />
              Powered by Gemini AI · ChromaDB · LlamaParse
            </div>
            <h1 className="animate-fade-in-up delay-100 max-w-3xl text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
              {t("Connect community needs to the right volunteers instantly.")}
            </h1>
            <p className="animate-fade-in-up delay-200 mt-5 max-w-2xl text-lg text-slate-600 leading-relaxed">
              {t("SamaajSetu aggregates needs from paper surveys, field reports, voice memos and SMS into one live picture — and uses AI matching to deploy volunteers where they matter most.")}
            </p>
            <div className="animate-fade-in-up delay-300 mt-8 flex flex-wrap gap-3">
              <Link href="/signup?role=coordinator">
                <Button size="lg" className="shadow-md shadow-brand/20">
                  {t("I run an NGO")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup?role=volunteer">
                <Button size="lg" variant="outline">
                  {t("I want to volunteer")}
                </Button>
              </Link>
            </div>

            {/* Stats row */}
            <div className="animate-fade-in-up delay-300 mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl">
              {STATS.map((s) => (
                <div key={s.l}>
                  <div className="text-3xl font-bold text-gradient">{s.v}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{t(s.l)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trusted by */}
        <div className="bg-slate-50 border-y border-slate-100 py-5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center gap-x-8 gap-y-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide shrink-0">{t("Trusted by NGOs across India")}</span>
            {["Sahyog Foundation", "AidBridge", "HelpFirst India", "CommunityServe", "ReliefNet"].map((n) => (
              <span key={n} className="text-sm font-medium text-slate-400">{n}</span>
            ))}
          </div>
        </div>

        {/* Features */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">{t("Platform")}</div>
              <h2 className="text-3xl font-bold text-slate-900">{t("Everything your NGO needs, built in")}</h2>
              <p className="mt-3 text-slate-500 text-sm">
                {t("One platform covering intake, matching, coordination, and verification — no duct tape required.")}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`rounded-2xl border ${f.borderCls} bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.iconCls} mb-4`}>
                    <f.Icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{f.tag}</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-slate-50 py-20 border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Workflow</div>
              <h2 className="text-3xl font-bold text-slate-900">From need logged to task complete</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] right-0 h-px bg-gradient-to-r from-slate-300 to-transparent" />
                  )}
                  <div className="text-5xl font-black text-gradient opacity-20 mb-3 leading-none">{s.n}</div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities strip */}
        <section className="bg-white py-16 border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Role-based portals</h4>
                  <p className="text-sm text-slate-500">Separate dashboards for coordinators, volunteers, field workers, and donors — each tailored to their workflow.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Multi-tenant, RLS secured</h4>
                  <p className="text-sm text-slate-500">Each NGO is fully isolated. Supabase Row-Level Security ensures your data never leaks to another organisation.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">GCP migration-ready</h4>
                  <p className="text-sm text-slate-500">Every component — ChromaDB, LlamaParse, OpenRouter — has a labelled GCP migration path for enterprise scale.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="bg-gradient-to-br from-brand-500 via-brand to-violet-700 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
            <Quote className="h-8 w-8 text-white/25 mx-auto mb-4" />
            <blockquote className="text-xl md:text-2xl font-medium text-white leading-relaxed">
              "SamaajSetu cut our volunteer dispatch time from 4 hours to under 15 minutes during
              the Ahmedabad floods. Every relief coordinator should have this."
            </blockquote>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 grid place-items-center text-white font-semibold text-sm">PM</div>
              <div className="text-left">
                <div className="text-white font-medium text-sm">Priya Mehta</div>
                <div className="text-white/60 text-xs">Program Director, Sahyog Foundation</div>
              </div>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="bg-white py-20 border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">Everything included</div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">One platform, end-to-end coverage</h2>
                <ul className="space-y-3">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Avg. match time", value: "< 60s" },
                  { label: "Volunteer retention", value: "+38%" },
                  { label: "Data entry saved", value: "70%" },
                  { label: "Crisis response", value: "3× faster" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="text-2xl font-bold text-gradient mb-1">{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-slate-50 py-20 border-t border-slate-100">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Ready to transform your volunteer operations?
            </h2>
            <p className="text-slate-500 mb-8 text-sm">
              Join 24 NGOs already using SamaajSetu to match volunteers with community needs faster and smarter.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/signup?role=coordinator">
                <Button size="lg" className="shadow-md shadow-brand/20">
                  Start free today <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup?role=volunteer">
                <Button size="lg" variant="outline">Volunteer with us</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 select-none">
              <img src="/samaajsetu.webp" alt="Logo" className="h-7 w-7 object-contain" />
              <span className="text-white font-medium">SamaajSetu</span>
            </Link>
            <div className="text-xs">
              Next.js · Supabase · ChromaDB · Gemini via OpenRouter · LlamaParse · Leaflet/OSM
            </div>
            <div className="text-xs">© 2026 SamaajSetu. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
