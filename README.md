# SamaajSetu — MVP

Community-need aggregation + smart volunteer matching.
Production architecture targets Google Cloud (see `/docs`); this MVP runs on **Supabase + Qdrant Cloud** with **Gemini chat + OpenAI embeddings via OpenRouter**.

## Stack

| Layer | MVP | Production (Phase 2) |
|---|---|---|
| Frontend | Next.js 14 + Tailwind | Same — deploy on Cloud Run |
| Auth + DB + Realtime + Storage | Supabase (free) | Identity Platform + Cloud SQL/AlloyDB + Pub/Sub + Cloud Storage |
| LLM (extraction, re-rank, voice) | **Gemini via OpenRouter** | Vertex AI Gemini |
| Embeddings | **OpenAI `text-embedding-3-small` via OpenRouter** (1536-dim) | Vertex AI Embeddings |
| Vector store | **Qdrant Cloud** (free tier) | Vertex AI Vector Search |
| OCR | LlamaParse free tier | Document AI |
| Maps | Leaflet + OSM | Maps Platform + Routes API |
| Push | in-app toasts / Web Push | Firebase Cloud Messaging |

Migration is configuration + data movement — no business-logic rewrite. See `/docs/mvp_plan.md`.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
# Fill: SUPABASE_*, OPENROUTER_API_KEY, QDRANT_URL, QDRANT_API_KEY,
#       LLAMAPARSE_API_KEY (optional)

# 3. Apply Supabase migration
# In Supabase SQL Editor, run: supabase/migrations/001_init.sql

# 4. Create the Qdrant collections
npm run init-qdrant      # idempotent — creates samaajsetu_needs + _volunteers

# 5. Run the app
npm run dev              # http://localhost:3000

# 6. Sign up as a coordinator at /signup?role=coordinator
#    Click "Seed demo data" on Mission Control to populate
#    needs + volunteers and index them in Qdrant.
```

## Demo flow (3 minutes)

1. **/coordinator/mission-control** — heatmap, KPIs, live activity, "Declare Crisis" toggle.
2. **/coordinator/needs/new** — drop a paper-survey image → LlamaParse → Gemini fills the form.
3. **/coordinator/triage** — Kanban move through Submitted → Triaged → Published.
4. **/coordinator/matcher** — pick a need → "Find Volunteers" → ranked list with **why-matched** chips → multi-select → Dispatch.
5. **/volunteer/feed** (separate browser/account) — top 3 personalized cards → "I'll help" → realtime update on coordinator's screen.
6. **/volunteer/voice** — raise a concern → Gemini classifies → appears in **/coordinator/voice-channel**.
7. **/donor** — public live counters.

## API surface

| Route | Purpose |
|---|---|
| `POST /api/needs` | Create need (also embeds into Qdrant `needs`) |
| `PATCH /api/needs/[id]` | Update state / fields |
| `POST /api/match` | `{ needId }` → ranked volunteers · `{ volunteerId }` → ranked needs |
| `POST /api/ocr` | LlamaParse + Gemini → `ExtractedNeedDraft` |
| `POST /api/chat` | Voice-channel message → reply + classification |
| `POST /api/assignments` | Dispatch volunteers to a need or self-accept |
| `PATCH /api/assignments` | Move through state machine |
| `GET/PATCH /api/profile` | Volunteer profile + Qdrant upsert |
| `GET/POST /api/crisis` | Crisis Mode toggle (per tenant) |
| `POST /api/seed` | Generate demo programs, volunteers, needs |

## Project layout

```
app/                  Next.js routes (UI + API)
  coordinator/        NGO console
  volunteer/          Volunteer surfaces
  donor/              Public transparency portal
  api/                Server routes
components/           UI primitives + map + AppShell
lib/
  llm.ts              OpenRouter client (Gemini chat + OpenAI embeddings)
  qdrant.ts           Qdrant Cloud wrapper (needs + volunteers collections)
  matcher.ts          ANN search + Gemini re-rank with explanations
  llamaparse.ts       OCR with offline demo fallback
  supabase/           Browser, server and middleware clients
  pii.ts              Demo-grade PII redactor
supabase/migrations   SQL schema + RLS + auto-profile trigger
docs/                 Solution report, architecture, diagrams, MVP plan, working status
scripts/              init-qdrant, update_ppt.py
```

## Env vars

See `.env.local.example`. The keys you need:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project
- `OPENROUTER_API_KEY` — https://openrouter.ai/keys (covers both Gemini chat and OpenAI embeddings)
- `QDRANT_URL`, `QDRANT_API_KEY` — https://cloud.qdrant.io
- `LLAMAPARSE_API_KEY` — optional. Without it, `/api/ocr` returns a built-in demo extract.

Default models:
- Chat: `google/gemini-2.5-flash` (override via `LLM_MODEL`)
- Embeddings: `openai/text-embedding-3-small` (override via `EMBEDDING_MODEL`; remember to update `EMBEDDING_DIM` if you switch)

## Notes

- Real-time UI uses Supabase Realtime (Postgres replication).
- Embeddings, chat, classification — every AI call routes through OpenRouter.
- The seed route inserts pseudo-volunteer profiles directly via service role; in production these would be real Identity Platform users.
- Phone OTP / FCM / Maps Platform are out of scope for the MVP — see `/docs/product_architecture.md` for the production surfaces.
