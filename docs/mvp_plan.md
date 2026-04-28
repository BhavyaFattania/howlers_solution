# SamaajSetu — MVP Implementation Plan
## Zero-Cost, Demo-Ready Build (with a clear path to the GCP production architecture)

**Goal:** Ship a credible, demo-able prototype in ~7–10 days using only free-tier tools and one or two open-source libraries — without a GCP billing account — while keeping the "Google AI" story intact and the migration path to the production architecture (`solution_report.md`) clean.

**Non-goals for MVP:** real SMS gateway, real FCM at scale, real disaster geospatial overlays, paid Maps API, native iOS/Android signed builds, multi-tenant rigor.

---

## 1. Guiding Principles for the MVP

1. **Demo-first.** Every component you build must visibly support a 3-minute demo narrative.
2. **Mock the boring, build the impressive.** Mock SMS/FCM/payments. Build the Document-AI-like ingestion, the AI matcher, and the mission-control map.
3. **Keep "Google" in the demo.** Use **Google AI Studio Gemini API** (free tier, no billing required) for embeddings + LLM — this satisfies the "must use a Google AI service" rule.
4. **Stay portable.** Use a stack that maps 1-to-1 to GCP services for Phase 2.
5. **One deployable surface** is enough for MVP — a single Next.js web app that hosts both the volunteer view and the coordinator view (PWA = mobile-capable).

---

## 2. Free-Tier Tech Stack (Zero Monthly Cost)

| Production GCP service | MVP free-tier substitute | Cost | Why it works |
|-------------------------|--------------------------|------|--------------|
| **Vertex AI Gemini** | **Google AI Studio Gemini API** (`gemini-2.0-flash`, `gemini-2.5-flash`) | $0 — generous free quota, **no billing card required** | Same model family, same SDK shape; trivial swap to Vertex later. *Keeps the "Google AI" story.* |
| **Vertex AI Embeddings** | **Google AI Studio `text-embedding-004`** | $0 free quota | 768-dim embeddings; works with pgvector |
| **Vertex AI Vector Search** | **pgvector on Supabase Postgres** (free tier 500 MB) | $0 | ANN via HNSW/IVFFlat index; perfectly enough for a few thousand vectors |
| **Document AI** | **LlamaParse free tier** (1,000 pages/day) + **Tesseract.js** fallback | $0 | LlamaParse handles PDFs/images well; Tesseract is fully offline backup |
| **Firestore** | **Supabase Postgres + Realtime** | $0 | Realtime subscriptions cover live updates; SQL is easier to reason about |
| **Firebase Auth (Phone OTP)** | **Supabase Auth (email + magic-link)** | $0 | Phone OTP costs money; magic-link is free and fine for a demo |
| **Cloud Storage** | **Supabase Storage** (1 GB free) | $0 | Same S3-style API |
| **Firebase Cloud Messaging** | **Web Push API + browser notifications + in-app toasts** | $0 | A demo only needs to *show* the alert; a real device push isn't required |
| **Maps Platform / Routes** | **Leaflet + OpenStreetMap tiles + OSRM public demo server** | $0 | No API key, no quotas, looks great |
| **Cloud Translation API** | **Gemini itself (prompt-driven translation)** OR **LibreTranslate** | $0 | Two-way; reuses the Gemini quota |
| **Speech-to-Text** | **Browser Web Speech API** (Chrome/Edge) | $0 | Real-time, on-device |
| **Cloud DLP** | A small **regex + Gemini-prompt classifier** that masks names/phones | $0 | Demo-grade PII detection |
| **Dialogflow CX** | A simple chat UI calling **Gemini** with a system prompt | $0 | Same UX, simpler stack |
| **Earth Engine** | A pre-canned **GeoJSON overlay** (one flooded district demo) | $0 | Sufficient for "Crisis Mode" demo |
| **BigQuery + Looker Studio** | **Supabase SQL views + Recharts/visx charts in-app** | $0 | KPI tiles + charts inside the app |
| **Cloud Run** | **Vercel serverless functions** (Next.js API routes) | $0 free tier | Same scale-to-zero behavior |
| **Apigee** | Next.js middleware (rate limit + auth check) | $0 | Don't need an API gateway for a demo |
| **Pub/Sub** | Supabase Realtime channels | $0 | Same pub-sub pattern |
| **Cloud Logging/Monitoring** | Vercel logs + Supabase logs | $0 | Enough for a demo |
| **Hosting (web)** | **Vercel** (free hobby plan) | $0 | One-click deploy from GitHub |
| **Mobile** | **PWA via the same Next.js app** (installable on Android/iOS) | $0 | Skip native builds entirely for MVP |

**Total monthly cost: $0.**

---

## 3. What to Build vs. What to Mock

### 3.1 BUILD (high-impact for the demo)

| # | Module | Why it matters | Backed by |
|---|--------|----------------|-----------|
| 1 | **Auth + Tenant setup** (sign up as Coordinator or Volunteer) | Demonstrates RBAC story | Supabase Auth |
| 2 | **Need creation form** (web, mobile-friendly) | Core capture path | Next.js form → Supabase |
| 3 | **Document AI demo** — upload a scanned paper survey, see extracted structured data, save as a Need | Wow moment that maps directly to Document AI | LlamaParse → Gemini-clean → Supabase |
| 4 | **Triage Inbox** (Kanban) | Coordinator workflow visible | Supabase + dnd-kit |
| 5 | **Mission Control map** with urgency-coloured pins | The leadership dashboard moment | Leaflet + OSM |
| 6 | **Volunteer profile** (skills, languages, geo, availability) | Required for matching | Supabase form |
| 7 | **Smart Matcher** (Gemini-embedded volunteer + need vectors → pgvector ANN → Gemini re-rank with explanations) | The most impressive demo moment | Gemini Embeddings + pgvector + Gemini chat |
| 8 | **Volunteer Feed** (3 personalized cards with "Why matched" chips + 1-tap "I'll help") | Volunteer-side magic moment | Same matcher, flipped |
| 9 | **Voice Channel chatbot** (volunteer raises a concern, Gemini classifies + summarizes) | Differentiator vs. competitors | Gemini chat |
| 10 | **Live Activity Feed** (Supabase Realtime) | Makes the system feel alive on stage | Supabase Realtime |
| 11 | **Donor Transparency Page** (live counters: needs met, hours, lives touched) | Storytelling for impact | Public Supabase view |
| 12 | **Crisis Mode toggle** (pivots dashboard, applies pre-canned flooded-district GeoJSON, broadcasts mock alerts) | Demonstrates disaster-cell narrative | Static GeoJSON + state toggle |

### 3.2 MOCK (acknowledge in the demo, stub the implementation)

| Module | Mock approach |
|--------|--------------|
| Real SMS/IVR intake | "Simulate SMS" button on coordinator console that injects a fake inbound SMS into the queue |
| Real WhatsApp Business | Out of scope; mention as Phase 2 |
| Phone OTP login | Use email + magic link; mention production uses Phone OTP |
| Real push notifications to phone | Browser Web Push for the demo; toast + audio cue |
| Routes API turn-by-turn | Use OSRM public demo server (free, no key) for a single demo route |
| BigQuery ML churn / demand forecast | Fake the score with `1 - days_since_active / 90`; label it "ML-ranked retention risk" with a tooltip |
| Earth Engine flood overlay | One pre-built GeoJSON polygon for the demo district |
| Audit Logs / DPIA evidence pack | Show one screenshot of a Supabase audit table query |
| Multi-region / VPC-SC | Mention in the architecture slide; not needed in MVP |
| Donor payment processing | "Donate" button links to a placeholder Stripe/Razorpay test checkout |

---

## 4. Database Schema (Supabase Postgres) — minimum viable

```sql
-- Tenants & Users
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id),
  tenant_id uuid references tenants(id),
  role text check (role in ('volunteer','coordinator','admin','field_worker','donor')),
  display_name text,
  languages text[] default '{}',
  skills jsonb default '[]',
  home_lat double precision,
  home_lng double precision,
  max_radius_km int default 8,
  availability jsonb default '{}',
  embedding vector(768)            -- pgvector
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  name text,
  description text
);

create table needs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  program_id uuid references programs(id),
  title text,
  description text,
  category text,
  urgency text check (urgency in ('low','medium','high','critical')),
  required_skills text[],
  languages_helpful text[],
  geo_lat double precision,
  geo_lng double precision,
  window_start timestamptz,
  window_end timestamptz,
  headcount_required int default 1,
  headcount_filled int default 0,
  state text default 'submitted',
  source text default 'web',     -- web | paper_ocr | sms_mock | voice
  raw_doc_url text,              -- LlamaParse uploaded file
  embedding vector(768),
  created_at timestamptz default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  need_id uuid references needs(id),
  volunteer_id uuid references profiles(id),
  state text default 'offered',
  accepted_at timestamptz,
  checked_in_at timestamptz,
  completed_at timestamptz,
  proof_url text,
  feedback jsonb
);

create table voice_tickets (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid references profiles(id),
  message text,
  classification text,           -- relational | value_based | transactional
  sentiment numeric,
  resolved boolean default false,
  created_at timestamptz default now()
);

create index needs_embedding_idx on needs using hnsw (embedding vector_cosine_ops);
create index profiles_embedding_idx on profiles using hnsw (embedding vector_cosine_ops);
```

Add Supabase **Row-Level Security** policies so each tenant only sees its own rows — this single feature replaces a lot of multi-tenant plumbing for free.

---

## 5. Recommended Repository Structure

```
howlers_solution/
├── app/                          # Next.js 14 app router
│   ├── (public)/                 # Donor portal, landing
│   ├── (auth)/                   # Login, signup
│   ├── volunteer/                # Volunteer surfaces
│   │   ├── feed/
│   │   ├── tasks/
│   │   ├── voice/
│   │   └── profile/
│   ├── coordinator/              # NGO web console
│   │   ├── mission-control/      # Map + KPIs
│   │   ├── triage/               # Kanban inbox
│   │   ├── matcher/              # Matcher Studio
│   │   ├── volunteers/
│   │   ├── voice-channel/
│   │   └── crisis-mode/
│   └── api/                      # Vercel serverless routes
│       ├── needs/
│       ├── match/                # POST: returns ranked volunteers w/ why
│       ├── ocr/                  # POST: LlamaParse → Gemini-clean → Need draft
│       ├── embed/                # POST: Gemini embedding helper
│       └── chat/                 # POST: Gemini chat for Voice Channel
├── lib/
│   ├── supabase.ts
│   ├── gemini.ts                 # Google AI Studio SDK wrapper
│   ├── llamaparse.ts
│   ├── matcher.ts                # core ranking + explanation
│   └── pii.ts                    # regex+Gemini PII guardrail
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── needs/                    # NeedCard, NeedForm, TriageBoard
│   ├── map/                      # MissionControlMap, NeedPin
│   ├── matcher/                  # WhyMatchedChips, RankedList
│   └── voice/                    # ChatBubble, FeedbackComposer
├── public/
│   └── demo/                     # sample paper-survey scans, fake GeoJSON
├── scripts/
│   ├── seed.ts                   # seed demo tenant + 30 volunteers + 20 needs
│   └── update_ppt.py             # (already exists)
├── docs/                         # the docs we already produced
└── .env.local.example
```

---

## 6. Build Order (a 7-to-10-day plan)

### Day 0 — Setup (≈2 hrs)
- Create GitHub repo branches, Vercel project, Supabase project (free).
- Get a Google AI Studio API key (`https://aistudio.google.com/apikey`) — no card needed.
- Get a LlamaParse API key (free tier signup).
- Scaffold Next.js + Tailwind + shadcn/ui + Supabase client.

### Day 1 — Schema + Auth (≈4 hrs)
- Apply the SQL migration from §4. Enable pgvector + RLS.
- Implement signup/login (Supabase Auth, magic link).
- Seed script: 1 demo tenant, 1 coordinator, 30 volunteers (varied skills + locations across one city), 5 programs, 20 sample needs.

### Day 2 — Need creation + Triage Inbox (≈6 hrs)
- Create-need form (web, mobile-friendly).
- Triage Kanban with drag-and-drop state changes.
- Real-time updates via Supabase Realtime.

### Day 3 — Document-AI demo (≈5 hrs)
- File upload → LlamaParse → JSON.
- Gemini "extract-and-clean" prompt that returns `{title, description, urgency, geo, skills}`.
- Pre-fill the Need form so the coordinator can review and save.
- Add a `/public/demo/sample-survey.jpg` so the demo always works.

### Day 4 — Embeddings + Matcher (≈6 hrs)
- On Need-create and Volunteer-update: call Gemini `text-embedding-004`, store in `embedding`.
- `/api/match` route: pgvector cosine search, top-K, then Gemini re-rank prompt that returns ranked list with one-line "why matched" per candidate.
- Coordinator "Matcher Studio" UI: pick a need → see ranked volunteers + why-chips → multi-select → "Dispatch".

### Day 5 — Volunteer surfaces (≈5 hrs)
- Volunteer Home: 3 personalized cards (calls `/api/match` flipped: given a volunteer, find best 3 open needs).
- "I'll help" button → creates an Assignment.
- My Tasks list, simple completion form (photo upload, note).

### Day 6 — Mission Control map + Activity feed (≈5 hrs)
- Leaflet + OSM tiles, urgency-coloured pins, click-pin → drawer with need detail.
- Activity feed (Supabase Realtime) showing live state changes.
- KPI tiles: open needs, active volunteers, completions today.

### Day 7 — Voice Channel + Donor portal (≈4 hrs)
- Voice tab: chat UI calling Gemini with a "considerate voice" system prompt; classifies into relational/value/transactional; persists to `voice_tickets`.
- Coordinator's Voice Channel inbox view.
- Donor portal: public route with live counters and a sample story feed.

### Day 8 — Crisis Mode + polish (≈4 hrs)
- "Declare crisis" toggle on coordinator screen → applies pre-canned flooded-district GeoJSON overlay; relaxes match radius; broadcasts a banner to volunteer feed.
- Add tooltips, empty states, loading skeletons.

### Day 9 — Demo data + script + recording (≈4 hrs)
- Re-run seed; verify all flows.
- Write a 3-minute demo script (see §10).
- Record the demo video (Loom / OBS, free).

### Day 10 — Buffer & deploy (≈3 hrs)
- Final Vercel deploy, smoke test on phone, fix any prod-only bug.

**Total realistic effort: ~40–45 hours of focused work. Doable solo in 8–10 days, or by a 2-person team in 4–5 days.**

---

## 7. Key API Snippets (so the team can start typing)

### 7.1 Gemini client (`lib/gemini.ts`)

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function embed(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const r = await model.embedContent(text);
  return r.embedding.values;
}

export async function geminiJSON<T>(prompt: string, schema: object): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema: schema as any },
  });
  const r = await model.generateContent(prompt);
  return JSON.parse(r.response.text()) as T;
}
```

### 7.2 Match endpoint (`app/api/match/route.ts`, simplified)

```ts
import { embed, geminiJSON } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { needId } = await req.json();
  const { data: need } = await supabaseAdmin.from("needs").select("*").eq("id", needId).single();
  const { data: candidates } = await supabaseAdmin
    .rpc("match_volunteers", { query_embedding: need.embedding, k: 20 });

  const rerank = await geminiJSON<{ ranked: { id: string; reason: string }[] }>(
    `You are matching volunteers to a need. Return JSON {ranked:[{id,reason}]} of top 5.
     Need: ${JSON.stringify(need)}
     Candidates: ${JSON.stringify(candidates)}`,
    { type: "object", properties: { ranked: { type: "array" } } }
  );
  return Response.json(rerank);
}
```

### 7.3 SQL function for ANN search

```sql
create or replace function match_volunteers(query_embedding vector(768), k int)
returns table(id uuid, display_name text, distance float, skills jsonb, home_lat float8, home_lng float8)
language sql stable as $$
  select id, display_name, embedding <=> query_embedding as distance, skills, home_lat, home_lng
  from profiles
  where role = 'volunteer'
  order by distance
  limit k;
$$;
```

### 7.4 LlamaParse OCR helper (`lib/llamaparse.ts`)

```ts
export async function parsePaperSurvey(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}` },
    body: fd,
  });
  const { id } = await r.json();
  // poll for completion
  // ...
  return /* parsed markdown text */;
}
```

---

## 8. Migration Path to GCP (Phase 2 — when you have an account)

| MVP component | One-line migration |
|---------------|--------------------|
| Google AI Studio Gemini | Switch SDK to **Vertex AI Gemini** (same API surface, change `genAI` init) |
| Gemini `text-embedding-004` | Switch to **Vertex AI text-embedding-005**, regenerate embeddings |
| pgvector on Supabase | Re-index into **Vertex AI Vector Search** (export, batch upload) |
| LlamaParse | Replace with **Document AI Form Parser + Custom Extractor** (train on your forms) |
| Supabase Postgres | Migrate to **Cloud SQL for Postgres** or **AlloyDB** (`pg_dump`/`pg_restore`) |
| Supabase Auth | Switch to **Identity Platform** + add **Phone OTP** |
| Supabase Storage | Move buckets to **Cloud Storage** with CMEK |
| Supabase Realtime | Replace with **Firestore listeners** + **Pub/Sub** |
| Web Push | Replace with **Firebase Cloud Messaging** + native mobile builds |
| Leaflet + OSM | Swap to **Maps Platform** + **Routes API** (one component change) |
| Vercel functions | Containerize and deploy to **Cloud Run** |
| LibreTranslate | **Cloud Translation API** |
| Browser Web Speech | **Speech-to-Text API** for server-side accuracy |
| In-app PII regex | **Cloud DLP** (move to Dataflow stream) |
| In-house chat | **Dialogflow CX** for the voice channel |
| Static GeoJSON | **Earth Engine** real overlays |
| Supabase row-level security | **VPC-SC** + **IAM** + **BigQuery row-level security** |

Because the *interfaces* are nearly the same, the migration is mostly configuration and data movement — no rewrite of business logic.

---

## 9. Demo Script (3 minutes, what the judges see)

1. **0:00–0:20 — Problem.** "NGOs collect critical community-need data on paper, but it stays scattered. Volunteers are willing — they just don't know where to go."
2. **0:20–0:50 — Paper-to-data.** Coordinator drags a scanned paper survey. LlamaParse + Gemini extract `title, urgency, geo, skills`. Coordinator one-clicks "Save as Need".
3. **0:50–1:20 — Mission Control.** Map populates, urgency pin pulses red. KPIs update live. "All NGO data, in one place."
4. **1:20–1:50 — Smart match.** Coordinator opens the new need, hits "Find Volunteers". 5 ranked volunteers appear with **why-matched chips** ("3 km away, speaks Gujarati, completed 4 similar tasks"). Multi-select, dispatch.
5. **1:50–2:15 — Volunteer phone (PWA on a real phone).** Volunteer's home shows the new card; tap "I'll help"; coordinator's screen updates in real time.
6. **2:15–2:35 — Voice channel.** Volunteer types "It's hard to find parking at the venue." Gemini classifies it as transactional, surfaces in coordinator's Voice Channel inbox.
7. **2:35–2:55 — Crisis mode.** Coordinator hits "Declare Crisis"; the dashboard pivots, a flood overlay appears, all volunteers in the district receive a banner alert.
8. **2:55–3:00 — Close.** "Today everything you saw cost zero. All of it migrates one-for-one to Vertex AI, Document AI, Firestore, FCM, and Maps Platform when we go to production."

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gemini free-tier rate limits hit during demo | Pre-cache embeddings; use `gemini-2.0-flash` (highest free quota); fall back to a stored response if 429 |
| LlamaParse outage during demo | Bundle a pre-parsed sample so the demo never depends on a live call |
| Vercel cold starts on first hit | Hit each route once 30 s before demo; use Vercel's "preview" warmup |
| OSRM public server slow | Cache one demo route server-side |
| Web Push permissions blocked on judge's browser | Always also show a top-bar toast — never rely solely on push |
| Supabase free tier paused after 7 days inactivity | Run a cron-job-org free ping every 6 hrs |
| Phone-OTP missing in MVP | Slide explicitly says "Phone OTP in production via Identity Platform" |

---

## 11. Required Free-Tier Accounts to Sign Up For

1. **Google AI Studio** — `https://aistudio.google.com/apikey` (free Gemini API key, no billing)
2. **Supabase** — `https://supabase.com` (free tier: 500 MB DB + auth + storage + realtime)
3. **Vercel** — `https://vercel.com` (free hobby plan, unlimited deploys)
4. **LlamaParse** (LlamaIndex Cloud) — `https://cloud.llamaindex.ai` (free 1,000 pages/day)
5. **GitHub** — for code + actions CI (free)
6. *(Optional)* **Loom / OBS Studio** — to record the 3-minute demo video (free)

That's it. **No credit card required for any of these.**

---

## 12. Definition of Done for the MVP

- [ ] A judge can land on the deployed Vercel URL and sign up as either a Coordinator or a Volunteer using only an email.
- [ ] A Coordinator can upload a sample paper survey and end up with a new draft Need.
- [ ] A Coordinator can run the matcher and see ranked volunteers with explanations.
- [ ] A Volunteer (separate browser/profile) sees a personalized feed and can accept a task.
- [ ] Mission Control shows pins on a map, KPIs, and a live activity feed updating across browsers.
- [ ] The Voice Channel chat works end-to-end and produces a classified ticket.
- [ ] "Declare Crisis" pivots the dashboard with a visible overlay.
- [ ] The donor page shows live counters tied to real DB rows.
- [ ] A 3-minute demo video is recorded.
- [ ] The README links to the live URL, the demo video, and a one-paragraph "how this maps to GCP".

---

## 13. What This MVP Proves to Judges

1. **Feasibility:** the hard parts (paper-to-data, AI matching, real-time dashboard) actually run.
2. **Google AI usage:** Gemini is doing real work (extraction + embeddings + re-ranking + classification).
3. **Architectural clarity:** every shortcut has a labeled production replacement (the migration table).
4. **Path-to-production:** judges can see exactly what shipping at scale looks like (the four GCP architecture docs already in `/docs`).
5. **Cost discipline:** a working prototype was shipped for $0 — small NGOs really can adopt this.

---

*Document version: 1.0 — generated 2026-04-28*
*Companion docs: `solution_report.md`, `product_architecture.md`, `diagrams.md`.*
