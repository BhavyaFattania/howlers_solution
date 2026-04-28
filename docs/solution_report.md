# Curated Solution Report
## Solving Community-Need Aggregation & Volunteer Matching with Google Cloud

**Problem Statement (recap):** Local NGOs and social groups collect critical community-need data via paper surveys and scattered field reports, making it difficult to see the most urgent problems and to match available volunteers to the right tasks/locations.

**Mandate:** All solutions must be implemented using Google Cloud Platform (GCP) services exclusively.

---

## 1. Solution Architecture at a Glance

A four-layer cloud-native architecture on GCP:

| Layer | Purpose | Primary GCP Services |
|-------|---------|----------------------|
| **Ingest** | Capture data from paper, mobile, web, voice, SMS | Document AI, Speech-to-Text, Firebase, AppSheet, Cloud Storage, Pub/Sub |
| **Process** | Normalize, translate, redact PII, classify urgency | Cloud Functions, Cloud Run, Dataflow, Cloud DLP, Translation API, Natural Language API, Vertex AI Gemini |
| **Intelligence** | Match volunteers to needs, predict hotspots, rank stakeholder salience | Vertex AI Vector Search, BigQuery ML, Vertex AI Custom Training, Earth Engine, Maps Platform |
| **Engage & Govern** | Dashboards, alerts, mobile apps, governance, audit | Looker Studio, Firebase Cloud Messaging, Firestore, Identity Platform, Cloud KMS, Cloud Audit Logs |

End-to-end data flow:
`Paper / Mobile / Voice → Document AI / Speech-to-Text → Pub/Sub → Dataflow → BigQuery + Cloud Storage → Vertex AI (Vector Search + Gemini) → Firestore + Looker Studio → FCM Alerts to Volunteers`

---

## 2. Gap-to-Service Mapping (Master Table)

| Identified Gap (from `gaps.md`) | Root Cause | GCP Service(s) | How It Solves the Gap |
|----------------------------------|-----------|----------------|------------------------|
| Mountain of paper surveys / handwritten field reports | Manual data entry | **Document AI** (Form Parser, Custom Extractor, OCR) + **Cloud Storage** | Extracts structured fields from scanned forms; supports handwriting; auto-routes by form type |
| Scattered, siloed data sources | No central platform | **BigQuery** + **Dataflow** + **Cloud Storage** (data lake) | Single warehouse joins survey, GPS, beneficiary, volunteer, and incident data |
| Slow disaster response / no centralized coordination | Manual dispatch | **Pub/Sub** + **Cloud Run** + **Firebase Cloud Messaging** + **Cloud Tasks** | Event-driven dispatch the moment a need is logged; sub-second fan-out to volunteers |
| Inefficient matching (no KNN-style location+skill match) | No intelligent matcher | **Vertex AI Vector Search** (ScaNN-backed nearest neighbor) + **Maps Geocoding / Routes API** | Embed each volunteer (skills+availability+geo) and each need; ANN query returns top-K nearest in <50 ms |
| Field connectivity gaps (low/no internet) | Synchronous-only tools | **Firebase Firestore** (offline persistence) + **AppSheet** + **Firebase Auth** | Forms + matching cache work offline; auto-sync on reconnect, conflict resolution by Firestore |
| Beneficiary data privacy & "Community Identifiable Info" risk | No PII pipeline | **Cloud DLP (Sensitive Data Protection)** + **Cloud KMS** + **VPC Service Controls** + **Assured Workloads** | Auto-detects and tokenizes PII; CMEK encryption; data perimeter prevents exfiltration |
| Metrics failure (only hours tracked) | No analytics layer | **Looker Studio** + **BigQuery ML** + **Looker (semantic model)** | Dashboards on retention, NPS, impact value; predictive churn models |
| Volunteer voice / "considerate voice" channels | No feedback loop | **Dialogflow CX** + **Vertex AI Gemini** + **Pub/Sub** | Chatbot intake of concerns; Gemini summarizes themes; routes to managers |
| Psychological contract / retention | No relational signals captured | **Natural Language API** (sentiment) + **BigQuery ML** (logistic regression for churn risk) | Detects relational/value-based dissatisfaction in surveys & chats |
| Multilingual community needs | English-only pipelines | **Cloud Translation Advanced** + **Speech-to-Text (multilingual)** | Field reports in any language are normalized to a working language while preserving original |
| Lack of comparative governance evidence | No experimentation framework | **Vertex AI Experiments** + **BigQuery** | A/B test governance interventions across regions and measure retention deltas |
| Deceased / sensitive collective data | No retention policy engine | **Cloud Storage Object Lifecycle** + **DLP** + **Data Catalog tags** | Tag-based retention; auto-redaction of deceased records per policy |
| Resource constraints in small NGOs | Heavy infra cost | **AppSheet** + **Firebase Spark** + **Cloud Run** (scale-to-zero) | No-code app, generous free tier, pay only for traffic |
| Staff–volunteer friction (role ambiguity) | No structured RACI / workflow | **Cloud Workflows** + **Firestore** roles + **Identity Platform** | Codifies role boundaries; explicit task ownership in workflow steps |

---

## 3. Detailed Component Design

### 3.1 Ingestion Layer — Eliminate the "Mountain of Paper"

**Primary Service: Document AI**
- Use the **Form Parser** for structured paper surveys; use a **Custom Document Extractor** trained on your NGO's specific intake forms (10–50 labelled samples is typically enough).
- For free-text field journals and handwritten notes, use the **OCR processor** with handwriting support.
- Trigger pipeline: a phone-camera photo or scanner output uploaded to **Cloud Storage** → an **Eventarc** trigger fires a **Cloud Function** → invokes Document AI → writes structured JSON to **BigQuery** and the original to a versioned, immutable Cloud Storage bucket.

**Mobile / Field Capture**
- **AppSheet** for non-technical NGO staff to build intake apps in hours (no-code; data lives in Sheets/BigQuery).
- **Firebase + Firestore** for full-control native apps with offline persistence — the direct GCP-native replacement for ODK/KoboToolbox.
- **Speech-to-Text** for voice memos from volunteers in the field; **Translation API** standardizes language.

**SMS / Low-bandwidth Path**
- Africa-style SMS intake via a **Cloud Run** webhook receiving carrier callbacks, normalized into the same Pub/Sub stream.

### 3.2 Processing & Privacy Layer

**Streaming Normalization**
- All ingest events publish to **Pub/Sub** topics (`needs.raw`, `volunteers.raw`, `incidents.raw`).
- A **Dataflow** (Apache Beam) streaming pipeline:
  1. Validates schema (Avro / Protobuf via Schema Registry pattern in Pub/Sub).
  2. Calls **Cloud DLP** to detect & tokenize PII (names, phones, IDs); raw PII goes to a separate restricted bucket guarded by **VPC Service Controls**.
  3. Calls **Natural Language API** for entity + sentiment extraction.
  4. Geocodes addresses via **Maps Geocoding API**.
  5. Writes curated rows to **BigQuery** partitioned by date and clustered by region.

**Encryption & Compliance**
- **Cloud KMS** Customer-Managed Encryption Keys (CMEK) on every bucket, dataset, and Pub/Sub topic touching beneficiary data.
- **Assured Workloads** for jurisdictions with strict humanitarian data sovereignty (e.g., EU regions only).
- **Cloud Audit Logs** + **BigQuery** sink → tamper-evident, queryable audit trail for every access to sensitive data.
- **Data Catalog** tags (`tier:sensitive`, `community-id-info`, `deceased`) drive automated retention and access policies.

### 3.3 Intelligence Layer — The Volunteer-to-Need Matcher

This is the GCP-native equivalent of the KNN-based VDMS described in `report.md`.

**Vector Embeddings**
- For each **volunteer**, build an embedding vector combining:
  - Skills (multi-hot or text → embedded with **Vertex AI text-embedding-005**).
  - Availability windows (encoded).
  - Home/last-known geo (lat/lon, normalized).
  - Past task tags.
- For each **need / task**, build a parallel vector (required skills, urgency tier, location, language).

**Vector Search (Vertex AI Vector Search)**
- Indexed with ScaNN; supports filtered ANN queries (e.g., `availability_window contains now AND language=='Gujarati'`).
- Query latency: tens of milliseconds for millions of volunteers — directly addresses the "slow response time" gap.
- Re-rank top-K with **Vertex AI Gemini** prompt that scores fit-to-mission and psychological-contract alignment using historical retention data.

**Hotspot & Need Prediction**
- **BigQuery ML** time-series models (ARIMA_PLUS) on historical incident counts per region → predicts next-week demand.
- **Earth Engine** overlays (rainfall, fire, flood layers) cross-referenced for disaster preempting.
- Predicted hotspots feed back into the matcher to pre-position volunteers.

**Stakeholder Salience Engine**
- Mitchell-Agle-Wood salience (Power × Legitimacy × Urgency) computed nightly in BigQuery from interaction logs and surfaced in Looker — concretely operationalizes Section 2.1 of `report.md`.

### 3.4 Engagement Layer

**Real-time Volunteer App (Firebase)**
- Firebase Auth (or **Identity Platform** for SAML/OIDC federation with NGO partners).
- Firestore for volunteer state, task acceptance, status updates.
- **Firebase Cloud Messaging** for push alerts (replaces the "Email Notification Module" in the legacy VDMS with mobile-native delivery).
- **Firebase Remote Config** for feature-flagging governance experiments per region.

**Manager / Coordinator Console**
- Built on **Cloud Run** + Next.js (or AppSheet for low-code variants).
- Embedded **Looker Studio** dashboards: urgent-needs heatmap, volunteer utilization, retention risk, stakeholder salience matrix.
- **Dialogflow CX** powering a "considerate voice" intake chatbot for volunteers to raise concerns; Gemini summarizes weekly themes for managers.

**Public Transparency Portal**
- A static **Firebase Hosting** site with a redacted, aggregated view of community needs being met — addresses the value-based contract dimension by visibly demonstrating mission alignment.

---

## 4. Mapping to the Key Findings of `report.md`

| Report Best-Practice Finding | GCP Implementation |
|------------------------------|--------------------|
| Psychological contract — relational rewards | Firebase + FCM personalized recognition; Gemini-generated thank-you summaries; community feed in app |
| Context-specific governance | Firestore "program profiles" drive workflow variants in Cloud Workflows (one engine, many configurations) |
| Stakeholder salience prioritization | Nightly BigQuery scoring job + Looker dashboard |
| KNN location-based matching (VDMS) | Vertex AI Vector Search (ScaNN) — superior to flat KNN at scale |
| OCR for digitization | Document AI Form Parser + Custom Extractor |
| Open Data Kit / offline forms | Firestore offline persistence + AppSheet |
| UN data-protection principles | DLP + CMEK (KMS) + VPC-SC + Assured Workloads + Audit Logs |
| Voice / feedback mechanisms | Dialogflow CX + Pub/Sub routing to managers |
| Mission-consistent communication | Vertex AI Gemini brand-tone-tuned content generation, governed by an approval workflow in Cloud Workflows |

---

## 5. Reference Architecture Diagram (textual)

```
[Paper Surveys]──┐
[Field Photos]───┼─►[Cloud Storage]──►[Eventarc]──►[Cloud Function]──►[Document AI]──┐
[Voice Memos]────┘                                                                    │
                                                                                      ▼
[Mobile App ◄─►Firebase/Firestore]──────────────────────────────────────────►[Pub/Sub Topics]
[AppSheet Forms]────────────────────────────────────────────────────────────►(needs.raw, vol.raw)
[SMS Webhook (Cloud Run)]───────────────────────────────────────────────────►       │
                                                                                     ▼
                                                                              [Dataflow Stream]
                                                                              ├─DLP (PII redact)
                                                                              ├─Translation
                                                                              ├─NL API (sentiment)
                                                                              ├─Geocoding
                                                                                     │
                                                  ┌──────────────────────────────────┤
                                                  ▼                                  ▼
                                          [BigQuery (curated)]              [Cloud Storage (raw, KMS)]
                                                  │
                       ┌──────────────────────────┼─────────────────────────┐
                       ▼                          ▼                         ▼
              [BigQuery ML: churn,        [Vertex AI Vector Search    [Looker Studio
               demand forecast]            (skills+geo embeddings)]    dashboards]
                       │                          │                         │
                       └──────────►[Cloud Run "Matcher API"]◄───────────────┘
                                                  │
                                                  ▼
                                          [Firestore: assignments]
                                                  │
                                                  ▼
                                       [Firebase Cloud Messaging]
                                                  │
                                                  ▼
                                          [Volunteer Phones]
```

---

## 6. Phased Delivery Roadmap

| Phase | Duration | Deliverables | GCP Services Activated |
|-------|----------|--------------|------------------------|
| **0. Foundations** | Week 1-2 | GCP org, projects (dev/stage/prod), VPC-SC perimeter, KMS keyring, IAM baseline, billing alerts | IAM, KMS, VPC-SC, Resource Manager, Billing |
| **1. Ingest MVP** | Week 3-5 | Paper-to-BigQuery pipeline; mobile intake (AppSheet) | Document AI, Cloud Storage, Cloud Functions, BigQuery, AppSheet |
| **2. Single Source of Truth** | Week 6-7 | Curated BigQuery dataset; first Looker Studio dashboard ("Urgent Needs Heatmap") | Dataflow, BigQuery, Looker Studio, Maps Geocoding |
| **3. Smart Matching** | Week 8-10 | Vector embeddings; Matcher API; volunteer mobile app with FCM | Vertex AI Vector Search, Vertex AI Embeddings, Firebase, FCM, Cloud Run |
| **4. Privacy Hardening** | Week 11-12 | DLP pipeline, retention policies, audit dashboards, Assured Workloads (if needed) | DLP, Data Catalog, Audit Logs, Assured Workloads |
| **5. Voice & Retention** | Week 13-15 | Dialogflow CX bot, sentiment + churn ML model, recognition workflows | Dialogflow CX, NL API, BigQuery ML, Workflows |
| **6. Predict & Optimize** | Week 16-18 | Demand forecasting, hotspot prediction, governance A/B testing | BigQuery ML, Earth Engine, Vertex AI Experiments |

---

## 7. Cost & Sustainability Notes for Small NGOs

- **AppSheet Starter**: free for individual creators; **Core** ~$5/user/month — directly addresses the "financial limitations" gap.
- **Firebase Spark plan**: free Firestore reads/writes within generous limits.
- **BigQuery**: 1 TiB query free per month; **BigQuery Editions** with autoscale for predictable cost.
- **Cloud Run / Functions**: scale-to-zero — no idle cost.
- **Document AI**: pay-per-page (Form Parser ~$0.065/page in 2025 pricing tiers) — far cheaper than manual data entry.
- **Google for Nonprofits / Google Cloud for Nonprofits**: provides credits, discounted pricing, and Workspace donations — should be the very first sign-up for any qualifying NGO.
- **Sustained-use & committed-use discounts** further reduce TCO at scale.

---

## 8. Security, Ethics & Compliance Checklist

- [ ] All PII flows through **Cloud DLP** before persistence.
- [ ] CMEK on every bucket, BigQuery dataset, Pub/Sub topic, Firestore database.
- [ ] **VPC Service Controls** perimeter around prod data projects; no public IPs.
- [ ] **Organization Policies**: restrict resource locations, disable service-account key creation, require shielded VMs.
- [ ] **Cloud Audit Logs** routed to a locked, append-only BigQuery sink with 7-year retention for humanitarian compliance.
- [ ] Data Catalog tag templates for `community-identifiable-info` and `deceased-individual` with linked retention policies.
- [ ] Annual access reviews via **Recommender** + IAM policy analyzer.
- [ ] **Access Transparency** enabled to log Google-side access for audit.
- [ ] Documented Data Protection Impact Assessment (DPIA) aligned to UN Personal Data Protection Principles.

---

## 9. Why GCP Is the Right Fit for This Problem

1. **Document AI** is best-in-class for noisy, multilingual, handwritten humanitarian forms — a direct win against the paper-mountain gap.
2. **Vertex AI Vector Search** turns the report's "KNN matching" idea into a managed, sub-50ms ANN service that scales from 1 NGO to a national network without re-architecture.
3. **BigQuery + Looker Studio** makes the "metrics failure" gap (only tracking hours) trivially solvable — analysts can model retention, satisfaction, and impact without DBAs.
4. **Firebase + AppSheet** lower the resource bar so small NGOs can adopt the platform without a full engineering team, addressing the "resource constraints in small organizations" gap.
5. **Cloud DLP + KMS + VPC-SC + Assured Workloads** form a data-protection stack mature enough for the UN-aligned humanitarian principles in `report.md` Section 5.
6. **Earth Engine** uniquely brings planetary-scale geospatial intelligence (flood, drought, fire) for proactive volunteer pre-positioning — no other hyperscaler offers it natively.
7. **Single vendor, single bill, single IAM model** simplifies governance for resource-constrained NGOs and aligns with the "centralized platform" recommendation.

---

## 10. Recommended Next Actions

1. Apply for **Google Cloud for Nonprofits** credits before any spend.
2. Stand up **Phase 0 foundations** (org, projects, VPC-SC, KMS) in week 1.
3. Pick **two paper-form templates** and train the first Document AI Custom Extractor — this proves end-to-end value in <2 weeks.
4. Build the **"Urgent Needs Heatmap"** Looker Studio dashboard from BigQuery — gives leadership visible value early.
5. Define **embedding schemas** for volunteer and need entities (skills taxonomy, geo, language, availability) — this is the single highest-leverage design decision and unblocks the matcher.
6. Document the **psychological-contract telemetry plan** (which signals from app + chatbot + surveys feed the churn model) — turns an abstract finding from `report.md` into a measurable system property.

---

*Document version: 1.0 — generated 2026-04-28*
