# Product Architecture
## Community Need Aggregation & Volunteer Matching Platform — "SamaajSetu" (working name)

**Companion to:** `solution_report.md` (GCP-only solution mapping).
**Scope:** End-to-end product architecture — personas, system decomposition, data model, API contracts, UX flows, UI components, and dashboards for every user type.

---

## 1. Product Vision & Principles

**Vision:** A single source of truth for community needs that intelligently routes the right volunteer to the right place at the right time — works on a 2010 Android phone in a village with patchy signal.

**Design principles:**
1. **Offline-first** — every volunteer/field action must work without connectivity.
2. **Mobile-first** — primary surface is a phone, not a laptop.
3. **Low-literacy-friendly** — icon-driven, voice-input where possible, regional languages.
4. **Trust by transparency** — beneficiaries and donors can see (privacy-preserving) impact.
5. **Privacy by default** — DLP + tokenization happen before data ever lands in analytics.
6. **One-tap onboarding** for volunteers; no-code intake design for NGO staff.

---

## 2. Personas & Their Jobs-To-Be-Done

| # | Persona | Primary Surface | Key JTBD |
|---|---------|-----------------|----------|
| P1 | **Volunteer** | Mobile app (Android-first, PWA fallback) | "Show me where I'm needed *today, near me, for my skills* — let me say yes in one tap" |
| P2 | **NGO Coordinator** | Web console + mobile companion | "Help me see urgent needs, dispatch volunteers, track outcomes, run my program" |
| P3 | **NGO Admin** (org owner) | Web console | "Configure my org, manage staff, set policies, view financial/impact reports" |
| P4 | **Field Worker / Surveyor** | Mobile app (offline) | "Log a need from a household visit in 90 seconds — even with no signal" |
| P5 | **Beneficiary** | SMS, IVR, or simple web | "Tell someone what I/my community needs, in my language" |
| P6 | **Platform Super Admin** | Internal admin console | "Operate the platform: tenancy, billing, abuse, model performance" |
| P7 | **Donor / Funder** | Public portal + auth-gated reports | "See where my money is going and what changed" |
| P8 | **Auditor / Compliance** | Read-only console | "Verify data handling, retention, access logs against policy" |
| P9 | **Government / Disaster Cell** | Web console (federated SSO) | "Get a real-time picture of needs and volunteers during a crisis" |

---

## 3. High-Level System Architecture

### 3.1 Bounded Contexts (Domain-Driven Design)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      SamaajSetu Platform                                  │
├──────────────────┬──────────────────┬──────────────────┬─────────────────┤
│ Identity &       │ Intake &         │ Need             │ Volunteer       │
│ Tenancy          │ Digitization     │ Management       │ Management      │
├──────────────────┼──────────────────┼──────────────────┼─────────────────┤
│ Matching &       │ Dispatch &       │ Impact &         │ Trust, Safety   │
│ Recommendation   │ Engagement       │ Analytics        │ & Privacy       │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┘
```

Each bounded context is a deployable **Cloud Run** service (or set of services) with its own Firestore collection / BigQuery dataset slice and Pub/Sub topics.

### 3.2 Service Decomposition

| Service | Responsibility | Persistence | GCP Runtime |
|---------|----------------|-------------|-------------|
| **identity-svc** | Auth, RBAC, tenant isolation | Firestore + Identity Platform | Cloud Run |
| **intake-svc** | Form schema, mobile sync, SMS gateway | Firestore (offline cache), Cloud Storage (raw) | Cloud Run |
| **digitization-svc** | Paper → structured data | Cloud Storage → Document AI → BigQuery | Cloud Run + Eventarc |
| **need-svc** | Need lifecycle (open, triaged, assigned, fulfilled, verified, closed) | Firestore (hot) + BigQuery (cold) | Cloud Run |
| **volunteer-svc** | Profiles, skills, availability, badges | Firestore + BigQuery | Cloud Run |
| **matching-svc** | Embedding generation, ANN query, ranking, explanations | Vertex AI Vector Search + Gemini | Cloud Run |
| **dispatch-svc** | Notifications, acceptance, ETA, routing | Firestore + FCM + Routes API | Cloud Run |
| **engagement-svc** | Voice channel (Dialogflow), recognition, recurring nudges | Dialogflow CX + FCM | Cloud Run |
| **analytics-svc** | Aggregations, dashboards data API | BigQuery + BigQuery ML + Looker | Cloud Run + Scheduled Queries |
| **trust-svc** | DLP gateway, audit logging, retention orchestration | DLP, Audit Logs, KMS | Cloud Run + Cloud Workflows |
| **billing-svc** | Tenant plan, usage metering | Cloud Billing API + Firestore | Cloud Run |

### 3.3 Cross-Cutting Infrastructure

- **API Gateway**: **Apigee** (or **Cloud API Gateway** for cost-sensitive deploys) — single egress, key/quota mgmt, WAF.
- **Eventing**: **Pub/Sub** as the system bus. Every state change emits a domain event (`need.created`, `volunteer.accepted`, `match.computed`, `feedback.submitted`).
- **Workflows**: **Cloud Workflows** orchestrates multi-step business processes (e.g., "verify need → triage → match → dispatch → confirm fulfillment").
- **Observability**: **Cloud Logging**, **Cloud Trace**, **Cloud Monitoring**, **Error Reporting**; SLO dashboards in Cloud Monitoring.
- **CI/CD**: **Cloud Build** → **Artifact Registry** → **Cloud Deploy** to staged environments.
- **Secrets**: **Secret Manager** with rotation; never in env vars.

---

## 4. Data Model (canonical entities)

### 4.1 Core Entities

```
Tenant (org_id)
  ├─ Users (volunteers, staff, admins) — multi-tenant via org_id partition
  ├─ Programs (a body of work: "Flood Relief 2026", "Tutoring Q3")
  │    └─ Needs (atomic unit of help required)
  │         └─ Tasks (a Need decomposed into assignable units)
  │              └─ Assignments (volunteer ↔ task, with state machine)
  │                   └─ Outcomes (proof, beneficiary feedback)
  ├─ Surveys (intake form templates)
  ├─ Beneficiaries (PII tokenized; canonical record in restricted bucket)
  └─ AuditEvents
```

### 4.2 Need — Lifecycle State Machine

`draft → submitted → triaged → published → matched → in_progress → completed → verified → closed`
(parallel branches: `escalated`, `withdrawn`, `expired`)

### 4.3 Volunteer Profile (Firestore document, simplified)

```jsonc
{
  "user_id": "vol_abc123",
  "org_id": "ngo_xyz",
  "display_name": "Asha P.",
  "languages": ["gu", "hi", "en"],
  "skills": [
    { "tag": "first_aid", "level": "certified", "expires_at": "2027-03-01" },
    { "tag": "tutoring_math", "level": "self-reported" }
  ],
  "availability": {
    "weekly": [{ "day": "sat", "from": "09:00", "to": "13:00" }],
    "exceptions": []
  },
  "geo": { "home": { "lat": 23.0225, "lng": 72.5714 }, "max_radius_km": 8 },
  "preferences": { "transport": "bicycle", "indoor_only": false },
  "trust_score": 0.82,
  "embedding_version": "v3-2026-04",
  "embedding_ref": "gs://embeddings/vol/abc123.json"
}
```

### 4.4 Need (Firestore document, simplified)

```jsonc
{
  "need_id": "need_55a",
  "org_id": "ngo_xyz",
  "program_id": "prog_flood2026",
  "title": "Distribute relief kits — Sector 7",
  "category": "disaster_relief",
  "urgency": "high",            // low | medium | high | critical
  "required_skills": ["lifting", "logistics"],
  "languages_helpful": ["gu"],
  "geo": { "lat": 23.045, "lng": 72.62, "radius_m": 500 },
  "window": { "start": "2026-04-29T08:00Z", "end": "2026-04-29T18:00Z" },
  "headcount_required": 6,
  "headcount_filled": 2,
  "state": "published",
  "created_by": "user_field_77",
  "embedding_ref": "gs://embeddings/need/55a.json",
  "audit_ref": "audit/need_55a"
}
```

---

## 5. API Surface (representative)

REST + JSON over HTTPS via Apigee; gRPC internal between services.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/needs` | POST | Create need (used by intake-svc) |
| `/v1/needs/{id}` | GET / PATCH | Read or update need |
| `/v1/needs/{id}/match` | POST | Trigger matching (returns ranked volunteer list with explanations) |
| `/v1/volunteers/me` | GET / PATCH | Volunteer profile self-service |
| `/v1/volunteers/me/feed` | GET | Personalized list of nearby/relevant needs |
| `/v1/assignments` | POST | Volunteer accepts a task |
| `/v1/assignments/{id}/checkin` | POST | Geo-verified arrival |
| `/v1/assignments/{id}/complete` | POST | Submit completion proof (photo, note, beneficiary signature) |
| `/v1/feedback/voice` | POST | "Considerate voice" channel (text or voice file) |
| `/v1/admin/programs` | CRUD | Program management |
| `/v1/admin/dashboards/{id}` | GET | Looker embedded URL signing |
| `/v1/intake/forms/{tenant}/{form_id}` | GET | Schema for offline mobile sync |
| `/v1/sms/inbound` | POST (webhook) | Carrier callback for SMS-based intake |

---

## 6. End-to-End User Journeys

### 6.1 Volunteer — "Find me work today"
1. Open app → home shows **3 cards** of best-fit needs (matching-svc result).
2. Tap card → see map, time, what's needed, who else accepted.
3. Tap **"I'll help"** → assignment created; Cloud Tasks schedules a reminder.
4. On the day → push: "Tap to start navigation"; Routes API draws path.
5. At venue → geo-verified check-in (Maps + Firestore region listener).
6. After → photo + 1-line note + 5-star confirm; offline-queued if needed.
7. Receive recognition push from FCM ("You helped 12 families today") + auto-add to public profile if opted in.

### 6.2 Field Worker — "Log a need from a home visit, no signal"
1. Open intake app → pre-loaded form (Firestore offline cache).
2. Capture beneficiary info, take photo, record voice note (Speech-to-Text on-device via Firebase ML).
3. GPS auto-stamped; save → queued.
4. On reconnect → Firestore syncs → Pub/Sub → Dataflow → DLP → BigQuery → triggers `need.created`.

### 6.3 NGO Coordinator — "Triage incoming needs"
1. Open web console → **Triage Inbox** sorted by urgency × salience.
2. For each need: review, edit, set urgency, attach to a Program.
3. Click **"Find Volunteers"** → matching-svc returns ranked list with **why-this-match** chips ("3.2 km away", "speaks Gujarati", "fulfilled 4 prior tasks").
4. Multi-select → **Dispatch** → FCM push + SMS fallback.
5. Watch live map: green pins for accepted, blue moving for en-route, gold for completed.

### 6.4 Beneficiary — "Ask for help via SMS"
1. SMS keyword (e.g., `HELP`) to shortcode.
2. IVR/SMS conversational tree (Dialogflow CX over Voice/Messaging gateway via Cloud Run webhook).
3. Optional consent for follow-up.
4. Need created with `source=sms`, language auto-detected, translated to coordinator's working language.

---

## 7. Per-Persona UI/UX & Dashboards

### 7.1 Volunteer Mobile App (Android + PWA)

**Tech**: Flutter (preferred for offline + low-end devices) on Firebase backend, FCM, Maps SDK.

**Information Architecture (5 tabs):**
1. **Home (Today)** — top 3 personalized cards, big CTA, weather/disaster banner.
2. **Discover** — map + list of all open needs in radius, filters (skill, time, distance).
3. **My Tasks** — upcoming, in-progress, history, certificates.
4. **Voice** — "Tell us how you feel" chat (Dialogflow), forms for raising concerns, anonymous toggle.
5. **Profile** — skills (with verification badges), availability, languages, achievements, downloadable contribution PDF.

**Key UI components:**
- **NeedCard** — title, distance, urgency chip, skills required (icons), one-tap "I'll help".
- **WhyMatchedSheet** — bullet explanations from Gemini ("You're nearby", "Your skill: First Aid").
- **OfflineBadge** — persistent indicator showing sync state; queued count.
- **CheckInButton** — large; uses geofence; haptic confirmation.
- **CompletionDialog** — photo + 1 sentence + emoji satisfaction; works offline.
- **RecognitionToast** — celebratory animation after each completion.
- **AccessibilitySwitcher** — language, font size, voice-mode (read-aloud via Text-to-Speech).

**Dashboard (Profile → Insights):**
- Hours contributed, lives touched (estimated), skills trajectory, streak, badges, personal heatmap of areas helped.

### 7.2 NGO Coordinator Web Console

**Tech**: Next.js on Cloud Run, Tailwind + shadcn/ui, Looker Studio embeds via signed URLs, Maps JS SDK, Firebase JS SDK for live data.

**Layout**: left nav, top context bar (program selector + tenant), main canvas, right activity rail.

**Primary screens:**
1. **Mission Control (default landing)**
   - **Urgent Needs Heatmap** (Maps + clustered pins by urgency).
   - KPI tiles: Open Needs, Active Volunteers, SLA Breaches, Today's Completions.
   - Live activity feed (Pub/Sub → Firestore → real-time listener).
2. **Triage Inbox**
   - Kanban: `Submitted | Triaged | Published | Matched | In Progress | Verified`.
   - Bulk actions, AI-suggested tagging, duplicate detection (vector similarity).
3. **Matcher Studio**
   - Pick a need → see ranked volunteers with explanation chips, conflict warnings (e.g., already assigned today), suggested dispatch group size.
   - Slider to relax/tighten match strictness; previews are recomputed live.
4. **Programs**
   - CRUD; budget, calendar, milestones; auto-generated stakeholder salience grid.
5. **Volunteers**
   - Searchable directory; profile detail with task history, retention risk score (BigQuery ML).
   - Bulk recognition (auto-personalized via Gemini, manager approves).
6. **Surveys & Forms**
   - No-code form builder (driven by JSON schema → renders on mobile via dynamic form engine); link to AppSheet for advanced cases.
7. **Reports & Impact**
   - Embedded Looker Studio dashboards: retention, NPS, mission alignment, demand forecast, hotspot prediction, donor-ready impact PDF export.
8. **Voice Channel**
   - Inbox of feedback entries (categorized by Gemini: relational / value-based / transactional).
   - SLA timer per ticket; anonymized view default.

**Reusable components:** `KpiTile`, `Heatmap`, `RankedList`, `ExplanationChip`, `KanbanBoard`, `EntityDrawer`, `AuditTrailViewer`, `BulkActionBar`, `SignedEmbed`, `ConsentBanner`.

### 7.3 NGO Admin Console (super-set of Coordinator)

Adds:
- **Org Settings**: branding, languages, working hours, SLA policies.
- **Members & Roles**: invite staff, RBAC (Coordinator, Triager, Read-only, Auditor); SCIM if SAML.
- **Policies**: data retention, PII categories, consent text per language, deceased-data policy.
- **Integrations**: Google Workspace, Sheets, Drive, payment processors, donor CRMs.
- **Billing**: usage (DocAI pages, Vector Search QPS, FCM volume), invoices, plan.
- **Compliance Center**: DPIA artifacts, access reviews, audit log explorer.

### 7.4 Field Worker Mobile App

A focused mode of the volunteer app (or separate flavor) emphasizing:
- **Form-first home** — 1-tap "New Survey".
- **Camera + Voice + GPS** as primary inputs.
- **Sync banner** with progress bar.
- **Beneficiary consent capture** screen with thumb-print/signature pad and audio consent fallback.
- **Family/household composer** to link related individuals.

### 7.5 Beneficiary Touchpoints

- **SMS/IVR**: Dialogflow CX bot in regional language.
- **Lightweight web** (Firebase Hosting, <50 KB) — for those with smartphones; voice-input form, no login required, generates a tracking code.
- **WhatsApp Business API** (via Cloud Run webhook) for media-rich follow-up where allowed.
- **Public Portal**: program transparency page with aggregated, redacted impact stats.

### 7.6 Platform Super Admin Console

Internal-only; secured behind **Identity-Aware Proxy (IAP)**.
- **Tenancy management**, **abuse dashboards**, **model performance** (matching precision/recall, embedding drift), **cost per tenant**, **incident response runbooks** linked from PagerDuty/Cloud Monitoring.

### 7.7 Donor Portal

- Public landing per NGO (Firebase Hosting + Cloud CDN).
- Live counter widget (impact since X), story feed, donation CTA (Stripe via Cloud Run webhook).
- Auth-gated section for major donors with quarterly reports (signed Looker Studio embeds).

### 7.8 Auditor Console

- Read-only Looker dashboard + **BigQuery saved queries** over Audit Logs.
- Exportable evidence packs (PDF) for DPIAs and grant audits.

### 7.9 Government / Disaster Cell Console

- Federated SSO (Identity Platform + SAML).
- Cross-NGO read view (consented data only) showing aggregated needs and volunteer availability per district.
- Push channel to broadcast verified disaster alerts via FCM Topics.

---

## 8. Cross-Cutting UX Patterns

| Pattern | Implementation |
|---------|----------------|
| **Offline-first** | Firestore offline persistence + write-through cache + visible queue indicator |
| **Localization** | i18n via JSON bundles per tenant; Translation API for runtime fallback |
| **Accessibility** | WCAG 2.2 AA; min 16dp tap targets; voice input/output; high-contrast theme |
| **Onboarding** | Phone-OTP login (Identity Platform) → 4-screen intro → skill self-tag wizard → instant first match preview |
| **Empty states** | Always actionable ("No needs nearby — widen radius / set availability") |
| **Feedback loops** | Every action has confirmation toast + undo where possible |
| **Notifications** | FCM with quiet hours, channel preferences, fallback to SMS for critical alerts |
| **Trust signals** | Verification badges, NGO seal, beneficiary consent indicator on every record |
| **Error recovery** | Auto-retry with exponential backoff; user-visible "still trying" state |

---

## 9. Architecture Diagram (textual, end-to-end)

```
                            ┌──────────────────────────┐
                            │      Apigee (API GW)     │
                            │  AuthN/Z, Quota, WAF     │
                            └────────────┬─────────────┘
                                         │
        ┌────────────┬─────────────┬─────┴────────┬───────────────┬───────────────┐
        ▼            ▼             ▼              ▼               ▼               ▼
   identity-svc  intake-svc   need-svc      matching-svc    dispatch-svc    analytics-svc
        │            │             │              │               │               │
        ▼            ▼             ▼              ▼               ▼               ▼
   IdentityPlat  Firestore    Firestore       Vertex AI       FCM/SMS         BigQuery
                 Cloud Stor   BigQuery       Vector Search    Routes API      BQ ML
                  Doc AI                       Gemini                          Looker
        │            │             │              │               │               │
        └────────────┴─────────────┴────►Pub/Sub Bus◄─────────────┴───────────────┘
                                          │
                                          ▼
                                    Dataflow (stream)
                                    DLP, NL, Translate,
                                    Geocode, validate
                                          │
                                          ▼
                              BigQuery (curated, partitioned)
                                          │
                          ┌───────────────┴────────────────┐
                          ▼                                ▼
                  Looker Studio (embedded)        Vertex AI Pipelines
                                                   (training, eval)

  Cross-cutting: Cloud Logging/Trace/Monitoring · KMS · VPC-SC · Secret Manager · Audit Logs
  Clients: Volunteer App (Flutter) · Coordinator Web (Next.js) · Admin Web · Donor/Public Hosting · SMS/IVR
```

---

## 10. Notification & Workflow Choreography

**Example: Disaster declared in District 7**

1. Government console publishes `disaster.declared` event to Pub/Sub topic `alerts.gov`.
2. **Cloud Workflows** kicks off `crisis-response`:
   - Pulls all open and predicted-need rows from BigQuery for District 7.
   - Calls matching-svc with elevated radius and relaxed skills.
   - Filters volunteers by consent flag for emergencies.
   - Sends FCM topic broadcast `disaster/district-7` (volunteers auto-subscribed via opt-in).
   - Spawns IVR campaign via Dialogflow for SMS-only beneficiaries.
3. Real-time dashboard auto-pivots to **Crisis Mode** layout (red theme, simplified KPIs, dispatch-focused).

---

## 11. Security & Tenancy Model

- **Tenant isolation**: every Firestore document and BigQuery row carries `org_id`; row-level security via authorized views.
- **RBAC roles** (per tenant): `org_admin`, `coordinator`, `triager`, `field_worker`, `volunteer`, `auditor`, `donor`, `viewer`.
- **Attribute-based**: program-level scoping (`role:coordinator + program:flood2026`).
- **Service-to-service**: workload identity federation; mTLS between Cloud Run services.
- **Data residency**: Assured Workloads regions selectable per tenant.
- **Right-to-be-forgotten**: API endpoint triggers Cloud Workflow that purges Firestore, deletes vector index entries, and tombstones BigQuery rows in compliance with retention policy.

---

## 12. Mobile-Specific Architecture (Flutter app)

```
┌─────────────────────────────────────┐
│            Flutter App              │
├─────────────────────────────────────┤
│ Presentation: Material3 + custom UI │
│ State: Riverpod                     │
│ Routing: go_router                  │
├─────────────────────────────────────┤
│ Domain: use-cases (clean arch)      │
├─────────────────────────────────────┤
│ Data:                               │
│  ├─ Firestore (offline persistence) │
│  ├─ Firebase Auth (phone OTP)       │
│  ├─ FCM (notifications)             │
│  ├─ Firebase ML (on-device skill    │
│  │   classifier, voice-to-text)     │
│  ├─ Maps SDK + Geofencing           │
│  └─ Crashlytics + Performance       │
└─────────────────────────────────────┘
```

**Performance budgets**: <60 MB install, <2 s cold start on a 2 GB-RAM device, <500 KB per typical session network.

---

## 13. Frontend Component Library (shared design system)

A single design system, **"Setu UI"**, packaged as:
- `setu-ui-react` — for the web consoles.
- `setu-ui-flutter` — for the mobile apps.

Atomic structure (Atoms → Molecules → Organisms → Templates → Pages):

- **Atoms**: Button, Chip, Tag, Badge, IconBtn, Avatar, Field, Toast.
- **Molecules**: NeedCard, VolunteerCard, KpiTile, MapPin, ExplanationChip, ConsentInline, OfflineBanner.
- **Organisms**: Heatmap, KanbanBoard, RankedMatchList, MatcherStudio, TriageInbox, AuditTimeline, FormRenderer.
- **Templates**: ConsoleShell (left-nav + top-bar + canvas + activity rail), MobileShell (bottom-nav).
- **Pages**: composed per persona (Section 7).

Tokens (color, spacing, type, radii, motion) live in a JSON file consumed by both packages.

---

## 14. Observability, SLOs & Quality Gates

| Surface | SLO |
|---------|-----|
| Volunteer feed (`/feed`) | p95 < 400 ms, 99.9% availability |
| Matcher (`/match`) | p95 < 700 ms (incl. embed + ANN), 99.5% |
| Mobile sync | <30 s after reconnection for typical payload |
| Push delivery | <5 s from event to FCM ack, 99% |
| Document AI pipeline | <90 s page-to-BigQuery, 99% success |

Quality gates in CI:
- Contract tests against API Gateway specs.
- DLP test fixtures must catch synthetic PII before merge.
- Load test (k6) on matching-svc with seeded vector index.
- Accessibility scan (axe) on every web PR.

---

## 15. Roadmap-Aligned Build Order (UI/UX deliverables)

| Phase (from solution_report.md) | UI/UX deliverables |
|--------------------------------|-------------------|
| 1. Ingest MVP | Field Worker app v0 (offline form + photo + sync); Admin form-builder (basic) |
| 2. Single Source of Truth | Coordinator Mission Control v1 (heatmap + KPIs); Triage Inbox |
| 3. Smart Matching | Volunteer mobile app v1 (Home/Discover/MyTasks); Matcher Studio |
| 4. Privacy Hardening | Compliance Center; Auditor console; consent UI everywhere |
| 5. Voice & Retention | Voice Channel inbox; Recognition flow; Insights tab in volunteer profile |
| 6. Predict & Optimize | Demand forecast widget; Crisis Mode layout; Government console |

---

## 16. What This Architecture Explicitly Solves (traceability)

| Gap (from `gaps.md`) | Architectural Element |
|----------------------|------------------------|
| Manual coordination | Pub/Sub bus + Cloud Workflows + dispatch-svc |
| Inefficient matching | matching-svc with Vertex Vector Search + explanations |
| Mountain of paper | digitization-svc + Document AI pipeline |
| Connectivity gaps | Firestore offline + Flutter app + sync banner UX |
| Beneficiary marginalization | SMS/IVR/WhatsApp intake; consent-first UI; transparency portal |
| Psychological contract breaches | Voice Channel + recognition flow + retention BQ ML model |
| Bullying / power dynamics | Anonymous "considerate voice"; SLA timers; manager dashboards |
| Privacy intrusion | DLP-in-stream + KMS + VPC-SC + Auditor console |
| Metrics failure | Looker Studio dashboards + impact PDFs + donor portal |
| Stakeholder salience imbalance | Auto-computed salience grid in Programs screen |
| Resource constraints (small NGOs) | AppSheet-based no-code intake; scale-to-zero Cloud Run |
| Staff–volunteer friction | RBAC roles; explicit assignment ownership; voice channel |

---

## 17. Open Questions / Decisions to Confirm

1. **Mobile framework**: Flutter (recommended) vs React Native vs Android-only Kotlin — finalize before build.
2. **Beneficiary identification**: tokenized internal ID vs Aadhaar/national ID hash — depends on jurisdiction.
3. **WhatsApp Business**: feasible budget? affects channel mix.
4. **Disaster cell SSO**: which government identity provider standards (SAML/OIDC) per region?
5. **Data residency** per tenant vs global default — drives Assured Workloads decision.
6. **Donor payments**: Stripe vs Razorpay vs Google Pay — pick one to start.

---

*Document version: 1.0 — generated 2026-04-28*
*Companion docs: `docs/solution_report.md` (GCP service mapping), `gaps.md` (problem analysis), `report.md` (market research).*
