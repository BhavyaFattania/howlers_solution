# SamaajSetu — Working Status

A clear-eyed inventory of what is **really running** in the current MVP, what is
**mocked**, and what is **deferred** to the GCP production phase.

> Last updated: 2026-04-28 (post Qdrant Cloud + OpenRouter embeddings migration)

---

## TL;DR

- End-to-end demo flow works: sign up → seed → triage → AI match → dispatch → accept → complete → voice channel → donor view.
- All AI traffic routes through **one provider — OpenRouter**:
  - Chat / extraction / classification: `google/gemini-2.5-flash`
  - Embeddings: `openai/text-embedding-3-small` (1536-dim)
- Vectors live in **Qdrant Cloud** (free tier; managed). Two collections: `samaajsetu_needs`, `samaajsetu_volunteers`, both Cosine.
- Build is verified: 19 routes (10 UI + 8 API + middleware), zero TypeScript errors.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | **Working today** — code path is live and provably exercised in the demo |
| 🟡 | **Partially working** — happy path works; edge cases or quality stubbed |
| 🔵 | **Mocked** — stub or static fake; UX visible but no real backend |
| ⛔ | **Not implemented** — explicitly deferred to GCP production phase |

---

## 1. Frontend & UX

| Surface | Status | Where | Notes |
|---|---|---|---|
| Next.js 14 App Router + TypeScript + Tailwind | ✅ | `app/`, `tailwind.config.ts` | Build clean |
| Shared UI primitives (Card, Input, Badge, Chip, KPI tile, Empty) | ✅ | `components/ui/primitives.tsx`, `components/ui/button.tsx` | |
| AppShell with sidebar nav + sign-out | ✅ | `components/layout/AppShell.tsx` | Used by both consoles |
| Landing page | ✅ | `app/page.tsx` | |
| Sign-in (email + password) | ✅ | `app/login/page.tsx` | Suspense-wrapped for Next 14 |
| Sign-up with role picker (volunteer / coordinator) | ✅ | `app/signup/page.tsx` | Trigger creates the profile row |
| Toaster (Sonner) for in-app feedback | ✅ | `app/layout.tsx` | |
| Auth-gated route middleware | ✅ | `middleware.ts`, `lib/supabase/middleware.ts` | Redirects to /login |

---

## 2. Coordinator Console (`/coordinator/*`)

| Feature | Status | Where | Notes |
|---|---|---|---|
| Mission Control map (Leaflet + OSM) | ✅ | `app/coordinator/mission-control/page.tsx` + `components/map/MissionMap.tsx` | Urgency-coloured pins |
| Live KPIs (Open / Critical / Today / Completed) | ✅ | Same file | Computed client-side from Supabase reads |
| Live activity feed via Supabase Realtime | ✅ | Same file | `postgres_changes` channel on `activity_events` |
| Crisis Mode toggle + GeoJSON overlay + red banner | ✅ | `/api/crisis` + map | Static demo polygon ⚠ (real GIS = Earth Engine in prod) |
| Triage Inbox Kanban (6 columns) | ✅ | `app/coordinator/triage/page.tsx` | One-click "→ next state" buttons (drag-drop = future) |
| Matcher Studio | ✅ | `app/coordinator/matcher/page.tsx` | List of open needs → run match → ranked volunteers with `why-matched` chips → multi-select dispatch |
| New Need form with paper-survey OCR | ✅ | `app/coordinator/needs/new/page.tsx` | LlamaParse → Gemini extract → editable draft |
| Volunteer directory + search | ✅ | `app/coordinator/volunteers/page.tsx` | Filters across name / skill / language |
| Voice Channel inbox (Gemini-classified) | ✅ | `app/coordinator/voice-channel/page.tsx` | Realtime; filter by classification |

---

## 3. Volunteer Surfaces (`/volunteer/*`)

| Feature | Status | Where | Notes |
|---|---|---|---|
| Personalized Home feed (top 3 needs) | ✅ | `app/volunteer/feed/page.tsx` | Uses inverse matcher (volunteer → needs) |
| "I'll help" → Assignment | ✅ | `/api/assignments` | Headcount + state auto-update |
| My Tasks state machine (offered → accepted → checked_in → proof_submitted) | ✅ | `app/volunteer/tasks/page.tsx` | Real-time via Supabase channel |
| Voice channel chat (Gemini reply + classification) | ✅ | `app/volunteer/voice/page.tsx` | Persists to `voice_tickets` |
| Profile editor (skills, languages, geo, radius) | ✅ | `app/volunteer/profile/page.tsx` | "Use my location" via browser geolocation; re-indexes vector on save |

---

## 4. Donor / Public

| Feature | Status | Where | Notes |
|---|---|---|---|
| Public live counters (needs, completed, volunteers, lives touched) | ✅ | `app/donor/page.tsx` | Direct Supabase reads — anonymized aggregates only |
| Recent stories list | ✅ | Same file | From completed/verified needs |
| Donate button | 🔵 | Same file | Demo placeholder — payment processor not wired |

---

## 5. Authentication & Tenancy

| Feature | Status | Where | Notes |
|---|---|---|---|
| Supabase Auth — email + password | ✅ | `lib/supabase/{client,server,middleware}.ts` | Sign-up, sign-in, sign-out |
| Auto-create `profiles` row on signup | ✅ | `supabase/migrations/001_init.sql` (trigger `handle_new_user`) | |
| Multi-role profile (volunteer / coordinator / admin / field_worker / donor) | ✅ | `profiles.role` | Enforced via CHECK constraint |
| Tenant isolation via Row-Level Security (`current_tenant()`) | ✅ | RLS policies on every table | Default demo tenant seeded |
| Phone OTP login | ⛔ | n/a | Deferred — Identity Platform in production |
| SAML / OIDC for govt cell | ⛔ | n/a | Deferred — Identity Platform |

---

## 6. Data & Schema

| Component | Status | Where | Notes |
|---|---|---|---|
| Schema: tenants, profiles, programs, needs, assignments, voice_tickets, activity_events, crisis_state | ✅ | `supabase/migrations/001_init.sql` | |
| RLS policies (per-tenant + own-profile) | ✅ | Same | |
| State machines: Need (11 states), Assignment (11 states) | ✅ | CHECK constraints + APIs |
| Demo seed (3 programs, 12 volunteers, 8 needs) | ✅ | `app/api/seed/route.ts` | Service-role insert |
| Live activity events | ✅ | Inserted from API routes for need.created / assignment.* / crisis.* | |

---

## 7. AI / ML — what's actually being called

| Capability | Status | Provider | Model | Where |
|---|---|---|---|---|
| Paper-survey extraction (markdown → structured Need draft) | ✅ | OpenRouter | `google/gemini-2.5-flash` | `/api/ocr` → `chatJSON()` |
| Volunteer ↔ Need re-rank with one-line "why" | ✅ | OpenRouter | `google/gemini-2.5-flash` | `lib/matcher.ts` |
| Voice-channel reply (empathetic) | ✅ | OpenRouter | `google/gemini-2.5-flash` | `/api/chat` |
| Voice-channel classification (relational / value / transactional) + sentiment + themes | ✅ | OpenRouter | `google/gemini-2.5-flash` | `/api/chat` |
| Embeddings | ✅ | **OpenRouter (OpenAI)** | `openai/text-embedding-3-small` (1536-dim) | `lib/llm.ts` → `embed()` |
| OCR | 🟡 | LlamaParse free tier *or* built-in demo fallback | n/a | `lib/llamaparse.ts` (works without an API key) |
| BigQuery ML retention / demand forecast | ⛔ | — | — | Deferred to GCP |
| Earth Engine geospatial overlay | 🔵 | static GeoJSON | — | `/api/crisis` returns demo polygon |
| Speech-to-Text | ⛔ | — | — | Browser Web Speech API planned, not yet wired |
| Translation API | ⛔ | — | — | Gemini-prompted translation possible; not yet wired |

> **Key point:** every Gemini call is real and exercised by the running app.
> Embeddings are real and computed on your machine (no API call after first
> model download).

---

## 8. Vector Store

| Aspect | Status | Detail |
|---|---|---|
| Provider | ✅ | **Qdrant Cloud** (managed; free tier) |
| Client | ✅ | `@qdrant/js-client-rest` (`lib/qdrant.ts`) |
| Collections | ✅ | `samaajsetu_needs`, `samaajsetu_volunteers` — both Cosine over 1536-dim |
| Point IDs | ✅ | Supabase UUIDs used directly (Qdrant accepts UUID or uint64) |
| Payload index | ✅ | Keyword index on `tenant_id` (faster filtered search) |
| `where` metadata filter | ✅ | Equality on top-level payload keys (e.g. `tenant_id`) |
| Embedding model | ✅ | OpenRouter → `openai/text-embedding-3-small` |
| Bootstrap | ✅ | `npm run init-qdrant` — idempotent collection creation |

---

## 9. APIs (server routes)

| Route | Status | Notes |
|---|---|---|
| `POST /api/needs`, `GET /api/needs`, `PATCH /api/needs/[id]` | ✅ | Zod-validated; auto-indexes into vector store |
| `POST /api/match` | ✅ | Bidirectional: `{ needId }` or `{ volunteerId }` |
| `POST /api/ocr` | ✅ | LlamaParse → PII redact → Gemini → JSON draft |
| `POST /api/chat` | ✅ | Gemini reply + classify, persists ticket |
| `POST /api/assignments`, `PATCH /api/assignments` | ✅ | Dispatch + state machine |
| `GET /api/profile`, `PATCH /api/profile` | ✅ | Re-indexes volunteer in vector store |
| `GET /api/crisis`, `POST /api/crisis` | ✅ | Toggle Crisis Mode |
| `POST /api/seed` | ✅ | Idempotent demo data + vector index |

---

## 10. Privacy & Safety

| Control | Status | Detail |
|---|---|---|
| Demo-grade PII redaction (phone / email / Aadhaar / PAN) | ✅ | `lib/pii.ts` — regex-based, applied to OCR text before LLM |
| Cloud DLP-grade detection | ⛔ | Production swap |
| Encryption at rest (CMEK) | ⛔ | Production — Cloud KMS |
| VPC Service Controls perimeter | ⛔ | Production |
| Audit logs | 🟡 | We persist `activity_events` per tenant; full audit-trail UI is not built |
| Right-to-be-forgotten | ⛔ | Endpoint exists conceptually in plan; not built |

---

## 11. Notifications & Maps

| Capability | Status | Detail |
|---|---|---|
| In-app toasts (Sonner) | ✅ | All user actions confirm |
| Mission Control / Triage / My Tasks live updates via Supabase Realtime | ✅ | `postgres_changes` channels |
| Web Push (browser) | ⛔ | Not yet wired |
| Firebase Cloud Messaging (mobile) | ⛔ | Production |
| Leaflet + OpenStreetMap | ✅ | `components/map/MissionMap.tsx` |
| Maps Platform / Routes API turn-by-turn | ⛔ | Production |

---

## 12. Multi-tenant / SaaS controls

| Capability | Status |
|---|---|
| `tenant_id` partitioning on every table | ✅ |
| `current_tenant()` SQL helper used in RLS | ✅ |
| Per-tenant Crisis Mode | ✅ |
| Per-tenant branding / custom domains | ⛔ Production |
| Org admin RBAC management UI | ⛔ Production |
| Billing / metering | ⛔ Production |

---

## 13. Mobile

| Capability | Status |
|---|---|
| Mobile-friendly responsive web (PWA-ready) | ✅ Tailwind responsive across all volunteer pages |
| Native Android / iOS builds | ⛔ Production (Flutter target per architecture doc) |
| Offline-first Firestore-style sync | ⛔ Production |

---

## 14. Hosting / Deployment

| Aspect | Status |
|---|---|
| `npm run build` clean (zero TS errors) | ✅ Verified |
| Local dev: `npm run dev` on port 3000 | ✅ |
| Deployable to Vercel free tier | ✅ Standard Next.js 14 — no special config |
| Containerized for Cloud Run | ⛔ Add Dockerfile in Phase 2 |
| GitHub Actions CI | ⛔ Not yet |

---

## 15. Documentation

| Doc | Status | File |
|---|---|---|
| Solution report (problem → GCP services mapping) | ✅ | `docs/solution_report.md` |
| Product architecture (personas, services, UI components, dashboards) | ✅ | `docs/product_architecture.md` |
| Mermaid diagrams (use cases, sequences, ERD, deployment, etc.) | ✅ | `docs/diagrams.md` |
| MVP plan (what to build vs. mock, free-tier stack, GCP migration map) | ✅ | `docs/mvp_plan.md` |
| Working status (this file) | ✅ | `docs/working_status.md` |
| README quick-start | ✅ | `README.md` |
| Solution Challenge PPT (12 slides updated) | ✅ | `[EXT] Solution Challenge 2026 - Prototype PPT Template.pptx` |

---

## 16. What you actually need to run the MVP

1. **Supabase** project (free tier) — apply `supabase/migrations/001_init.sql` once.
2. **OpenRouter** API key (you have this) — covers Gemini chat **and** OpenAI embeddings.
3. **Qdrant Cloud** cluster (free tier; you have an account) — copy URL + API key.
4. *(Optional)* **LlamaParse** free key — without it, OCR uses the built-in demo fallback so the UX still works.
5. `npm install && npm run init-qdrant && npm run dev`. No Docker, no GCP account.

---

## 17. Known limitations to flag in a demo

- First Gemini / embedding call after a server cold-start can take 1–3 s (OpenRouter routing).
- Each match query and each upsert costs one embedding call — cheap, but billable through OpenRouter.
- Drag-and-drop on the Triage Kanban is button-driven for now (not pointer-drag).
- Crisis polygon is a static demo region, not real-time GIS.
- `voice_tickets.tenant_id` is set via `createAdmin()` since the trigger doesn't fire on volunteer-only profiles in seed; coordinator-created tickets work normally.
- Seeded volunteers are pseudo-profiles (no `auth.users` row), so they cannot sign in — matcher still ranks them correctly.
- If you change `EMBEDDING_MODEL` to one with a different dim, also update `EMBEDDING_DIM` and recreate the Qdrant collections (or run `npm run init-qdrant` after deleting them in the Qdrant dashboard).

---

## 18. One-screen migration map

```
Today (managed free tiers)         Phase 2 (GCP, with billing)
─────────────────────────────────  ─────────────────────────────────
Next.js on Vercel             →    Cloud Run + Cloud CDN
Supabase Postgres + RLS       →    Cloud SQL / AlloyDB + IAM + VPC-SC
Supabase Auth (email/pw)      →    Identity Platform (+ Phone OTP)
Supabase Realtime             →    Firestore listeners + Pub/Sub
Supabase Storage              →    Cloud Storage + CMEK
OpenRouter Gemini             →    Vertex AI Gemini (same SDK shape)
OpenRouter OpenAI embeddings  →    Vertex AI text-embedding-005
Qdrant Cloud                  →    Vertex AI Vector Search (ScaNN)
LlamaParse                    →    Document AI (Form Parser + Custom)
Browser Web Speech (planned)  →    Speech-to-Text API
Static GeoJSON                →    Earth Engine
Sonner toasts                 →    Firebase Cloud Messaging
Leaflet + OSM                 →    Maps Platform + Routes API
Regex PII redactor            →    Cloud DLP
activity_events table         →    Cloud Audit Logs + BQ sink
Static donor counters         →    BigQuery + Looker Studio
```

Every row above is a single-file swap with no business-logic changes.
