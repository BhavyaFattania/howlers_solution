# SamaajSetu — Mermaid Diagrams Pack

Companion to `solution_report.md` and `product_architecture.md`. All diagrams render in any Mermaid-compatible viewer (GitHub, VS Code, Obsidian, Mermaid Live).

**Contents**
1. [System Context (C4-Lite)](#1-system-context-c4-lite)
2. [Use Case Diagram (All Personas)](#2-use-case-diagram-all-personas)
3. [End-to-End Process Flow](#3-end-to-end-process-flow)
4. [Microservices & GCP Component Architecture](#4-microservices--gcp-component-architecture)
5. [Data Pipeline (Ingestion → Analytics)](#5-data-pipeline-ingestion--analytics)
6. [Need Lifecycle State Machine](#6-need-lifecycle-state-machine)
7. [Assignment Lifecycle State Machine](#7-assignment-lifecycle-state-machine)
8. [Sequence — Paper Survey to Published Need](#8-sequence--paper-survey-to-published-need)
9. [Sequence — Volunteer Matching & Dispatch](#9-sequence--volunteer-matching--dispatch)
10. [Sequence — Disaster Crisis Mode](#10-sequence--disaster-crisis-mode)
11. [Sequence — Beneficiary SMS/IVR Intake](#11-sequence--beneficiary-smsivr-intake)
12. [Sequence — Volunteer Voice / Feedback Channel](#12-sequence--volunteer-voice--feedback-channel)
13. [Entity Relationship Diagram](#13-entity-relationship-diagram)
14. [Volunteer User Journey](#14-volunteer-user-journey)
15. [Deployment Topology (GCP)](#15-deployment-topology-gcp)
16. [Privacy & PII Flow](#16-privacy--pii-flow)
17. [Module Mindmap](#17-module-mindmap)

---

## 1. System Context (C4-Lite)

```mermaid
flowchart TB
    subgraph Users["👥 Users"]
        V["Volunteer"]
        FW["Field Worker"]
        C["NGO Coordinator"]
        A["NGO Admin"]
        B["Beneficiary"]
        D["Donor"]
        AU["Auditor"]
        G["Govt / Disaster Cell"]
        SA["Platform Super Admin"]
    end

    subgraph Platform["🌐 SamaajSetu Platform on GCP"]
        Mob["📱 Volunteer / Field Mobile App<br/>(Flutter + Firebase)"]
        Web["💻 NGO Web Console<br/>(Next.js on Cloud Run)"]
        Pub["🌍 Public / Donor Portal<br/>(Firebase Hosting)"]
        SMS["📞 SMS / IVR / WhatsApp Gateway"]
        Core["🧠 Core Services<br/>(Identity, Intake, Need,<br/>Matching, Dispatch, Analytics)"]
    end

    subgraph External["🔌 External Systems"]
        Carrier["Telecom Carriers"]
        Pay["Payment Gateway"]
        GovIDP["Govt Identity Provider"]
    end

    V --> Mob
    FW --> Mob
    C --> Web
    A --> Web
    AU --> Web
    SA --> Web
    D --> Pub
    B --> SMS
    G --> Web

    Mob --> Core
    Web --> Core
    Pub --> Core
    SMS --> Core

    SMS <--> Carrier
    Pub <--> Pay
    Web <--> GovIDP
```

---

## 2. Use Case Diagram (All Personas)

```mermaid
flowchart LR
    classDef actor fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef uc fill:#fff8e1,stroke:#f57f17,color:#000
    classDef sys fill:#f3e5f5,stroke:#6a1b9a,color:#000

    V(("👤 Volunteer")):::actor
    FW(("👤 Field Worker")):::actor
    B(("👤 Beneficiary")):::actor
    C(("👤 Coordinator")):::actor
    A(("👤 NGO Admin")):::actor
    AU(("👤 Auditor")):::actor
    D(("👤 Donor")):::actor
    G(("👤 Govt Cell")):::actor
    SA(("👤 Super Admin")):::actor

    subgraph SYS["🌐 SamaajSetu System"]
        UC1["Sign up / Login (OTP)"]:::uc
        UC2["Build profile, skills, availability"]:::uc
        UC3["Receive personalized need feed"]:::uc
        UC4["Accept task / Check-in"]:::uc
        UC5["Submit completion proof"]:::uc
        UC6["Raise concern (Voice channel)"]:::uc
        UC7["View impact & badges"]:::uc

        UC10["Capture paper survey / photo"]:::uc
        UC11["Log offline need"]:::uc
        UC12["Capture beneficiary consent"]:::uc

        UC20["Request help via SMS / IVR"]:::uc
        UC21["Track request status"]:::uc

        UC30["Triage incoming needs"]:::uc
        UC31["Run smart matcher"]:::uc
        UC32["Dispatch volunteers"]:::uc
        UC33["Monitor mission control"]:::uc
        UC34["Review feedback / sentiment"]:::uc
        UC35["Generate impact reports"]:::uc

        UC40["Configure org & policies"]:::uc
        UC41["Manage staff / RBAC"]:::uc
        UC42["Define retention / consent"]:::uc
        UC43["Manage billing & integrations"]:::uc

        UC50["Audit access logs"]:::uc
        UC51["Export DPIA evidence pack"]:::uc

        UC60["View transparency portal"]:::uc
        UC61["Donate / sponsor program"]:::uc
        UC62["Receive impact report"]:::uc

        UC70["Declare disaster / crisis"]:::uc
        UC71["Cross-NGO situational view"]:::uc
        UC72["Broadcast verified alert"]:::uc

        UC80["Manage tenants & abuse"]:::uc
        UC81["Monitor model drift / SLOs"]:::uc
    end
    SYS:::sys

    V --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7
    FW --> UC1 & UC10 & UC11 & UC12
    B --> UC20 & UC21
    C --> UC30 & UC31 & UC32 & UC33 & UC34 & UC35
    A --> UC40 & UC41 & UC42 & UC43 & UC35
    AU --> UC50 & UC51
    D --> UC60 & UC61 & UC62
    G --> UC70 & UC71 & UC72 & UC33
    SA --> UC80 & UC81
```

---

## 3. End-to-End Process Flow

```mermaid
flowchart TD
    Start([🟢 Community has a need])

    subgraph CAPTURE["📥 Capture"]
        A1["Field Worker visits<br/>(offline survey)"]
        A2["Beneficiary SMS/IVR"]
        A3["Paper form scanned"]
        A4["Voice memo recorded"]
        A5["Coordinator logs directly"]
    end

    subgraph DIGITIZE["🔄 Digitize & Normalize"]
        D1["Document AI<br/>(OCR + Form Parser)"]
        D2["Speech-to-Text"]
        D3["Translation API"]
        D4["Cloud DLP<br/>(PII tokenize)"]
        D5["Geocoding API"]
        D6["NL API<br/>(entities + sentiment)"]
    end

    subgraph STORE["🗄️ Store"]
        S1[("Cloud Storage<br/>raw + KMS")]
        S2[("Firestore<br/>hot operational")]
        S3[("BigQuery<br/>curated analytics")]
    end

    subgraph TRIAGE["🧭 Triage"]
        T1["Coordinator reviews<br/>in Triage Inbox"]
        T2["AI duplicate detection"]
        T3["Set urgency + program"]
        T4{"Approved?"}
    end

    subgraph MATCH["🧠 Match & Dispatch"]
        M1["Generate Need embedding<br/>(Vertex AI Embeddings)"]
        M2["Vertex AI Vector Search<br/>(ANN top-K)"]
        M3["Gemini re-rank +<br/>explanations"]
        M4["Coordinator selects<br/>volunteers"]
        M5["FCM Push + SMS fallback"]
    end

    subgraph EXEC["🤝 Execute"]
        E1["Volunteer accepts"]
        E2["Routes API navigation"]
        E3["Geo-verified check-in"]
        E4["Task performed"]
        E5["Photo + note + signature"]
    end

    subgraph CLOSE["✅ Close & Learn"]
        L1["Beneficiary feedback"]
        L2["BigQuery ML retention<br/>+ impact scoring"]
        L3["Recognition push<br/>(Gemini-personalized)"]
        L4["Looker Studio dashboards"]
        L5["Donor portal updated"]
    end

    Start --> A1 & A2 & A3 & A4 & A5
    A1 --> S1
    A3 --> D1
    A4 --> D2
    A2 --> D3
    A5 --> S2
    D1 --> D3
    D2 --> D3
    D3 --> D4
    D4 --> D5
    D5 --> D6
    D6 --> S2
    S1 --> S3
    S2 --> T1
    T1 --> T2 --> T3 --> T4
    T4 -->|Yes| M1
    T4 -->|No| Reject([❌ Reject / merge])
    M1 --> M2 --> M3 --> M4 --> M5
    M5 --> E1 --> E2 --> E3 --> E4 --> E5
    E5 --> L1 --> L2 --> L3
    L2 --> L4 --> L5
    L5 --> Done([🏁 Closed & verified])
```

---

## 4. Microservices & GCP Component Architecture

```mermaid
flowchart LR
    subgraph CLIENT["📱 Clients"]
        CMob["Volunteer / Field App<br/>Flutter + Firebase SDK"]
        CWeb["Coordinator/Admin Console<br/>Next.js"]
        CPub["Donor / Public Portal<br/>Firebase Hosting"]
        CSMS["SMS / IVR / WhatsApp"]
    end

    subgraph EDGE["🛡️ Edge & API"]
        APIG["Apigee API Gateway<br/>(AuthN/Z, WAF, Quota)"]
        IAP["Identity-Aware Proxy<br/>(internal consoles)"]
        IDP["Identity Platform<br/>(Phone OTP, SAML, OIDC)"]
    end

    subgraph SERVICES["⚙️ Domain Services (Cloud Run)"]
        S_ID["identity-svc"]
        S_IN["intake-svc"]
        S_DG["digitization-svc"]
        S_ND["need-svc"]
        S_VL["volunteer-svc"]
        S_MT["matching-svc"]
        S_DP["dispatch-svc"]
        S_EN["engagement-svc"]
        S_AN["analytics-svc"]
        S_TR["trust-svc"]
        S_BL["billing-svc"]
    end

    subgraph BUS["🚌 Event Bus"]
        PS["Pub/Sub Topics<br/>needs.* volunteers.*<br/>match.* alerts.* audit.*"]
        WF["Cloud Workflows<br/>(orchestration)"]
        TQ["Cloud Tasks<br/>(scheduled jobs)"]
    end

    subgraph AI["🧠 AI / ML"]
        DAI["Document AI"]
        STT["Speech-to-Text"]
        TRN["Translation API"]
        NLP["Natural Language API"]
        EMB["Vertex AI Embeddings"]
        VS["Vertex AI Vector Search"]
        GEM["Vertex AI Gemini"]
        BQML["BigQuery ML"]
        EE["Earth Engine"]
        DLG["Dialogflow CX"]
    end

    subgraph DATA["🗄️ Data"]
        FS[("Firestore")]
        BQ[("BigQuery")]
        GCS[("Cloud Storage")]
        SQL[("Cloud SQL / AlloyDB")]
        DC["Data Catalog"]
    end

    subgraph PIPELINE["🔄 Pipelines"]
        DF["Dataflow<br/>(stream + batch)"]
        EVT["Eventarc"]
    end

    subgraph NOTIFY["🔔 Engagement"]
        FCM["Firebase Cloud Messaging"]
        SMSGW["SMS Gateway (Cloud Run)"]
        MAPS["Maps / Routes / Geocoding"]
    end

    subgraph SECURITY["🔐 Security & Compliance"]
        DLP["Cloud DLP"]
        KMS["Cloud KMS (CMEK)"]
        VPC["VPC Service Controls"]
        AW["Assured Workloads"]
        SM["Secret Manager"]
        AL["Audit Logs"]
    end

    subgraph OBS["📊 Observability"]
        LOG["Cloud Logging"]
        TRC["Cloud Trace"]
        MON["Cloud Monitoring"]
        ER["Error Reporting"]
        LK["Looker Studio / Looker"]
    end

    CMob --> APIG
    CWeb --> APIG
    CPub --> APIG
    CSMS --> SMSGW --> APIG
    APIG --> IDP
    IAP --> CWeb

    APIG --> S_ID & S_IN & S_ND & S_VL & S_MT & S_DP & S_EN & S_AN & S_TR & S_BL
    S_DG --- EVT
    EVT --> GCS

    S_IN --> FS
    S_IN --> GCS
    S_DG --> DAI
    S_DG --> STT
    S_DG --> TRN
    S_DG --> DF
    S_ND --> FS
    S_ND --> BQ
    S_VL --> FS
    S_VL --> BQ
    S_MT --> EMB --> VS
    S_MT --> GEM
    S_DP --> FCM
    S_DP --> MAPS
    S_DP --> SMSGW
    S_EN --> DLG
    S_EN --> NLP
    S_AN --> BQ
    S_AN --> BQML
    S_AN --> EE
    S_AN --> LK
    S_TR --> DLP
    S_TR --> DC
    S_TR --> AL
    S_BL --> SQL

    S_IN -.publish.-> PS
    S_ND -.publish.-> PS
    S_VL -.publish.-> PS
    S_MT -.publish.-> PS
    S_DP -.publish.-> PS
    PS --> WF
    PS --> TQ
    WF --> S_DP
    WF --> S_AN
    DF --> BQ
    DF --> DLP

    SERVICES --> SECURITY
    SERVICES --> OBS
    KMS -.encrypts.-> DATA
    VPC -.perimeter.-> DATA
```

---

## 5. Data Pipeline (Ingestion → Analytics)

```mermaid
flowchart LR
    subgraph IN["Ingest"]
        I1["📷 Scanned forms"]
        I2["📱 Mobile app"]
        I3["📞 SMS/IVR"]
        I4["🎤 Voice memo"]
        I5["💻 Web entry"]
    end

    GCS[("☁️ Cloud Storage<br/>raw zone, KMS")]
    FS[("⚡ Firestore<br/>hot ops")]

    subgraph PROC["Stream Processing (Dataflow)"]
        P1["Schema validate"]
        P2["DLP redact / tokenize"]
        P3["Translate"]
        P4["Sentiment / entities"]
        P5["Geocode"]
        P6["Enrich w/ taxonomy"]
        P7["Write to BQ"]
    end

    BQ[("📊 BigQuery<br/>curated, partitioned")]

    subgraph ML["ML & Insights"]
        M1["BigQuery ML<br/>(churn, demand)"]
        M2["Vertex Pipelines<br/>(embedding refresh)"]
        M3["Earth Engine<br/>(geospatial overlays)"]
    end

    subgraph SERVE["Serve"]
        V1["Vertex Vector Search<br/>(volunteer/need index)"]
        V2["Looker Studio dashboards"]
        V3["matching-svc API"]
        V4["Donor / Public widgets"]
    end

    I1 --> GCS
    I2 --> FS
    I3 --> FS
    I4 --> GCS
    I5 --> FS
    GCS --> P1
    FS --> P1
    P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> BQ
    BQ --> M1 & M2 & M3
    M2 --> V1
    V1 --> V3
    BQ --> V2
    M1 --> V2
    V2 --> V4
```

---

## 6. Need Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> draft: created by field/coordinator
    draft --> submitted: submit
    submitted --> triaged: coordinator reviews
    triaged --> published: approve + publish
    triaged --> withdrawn: duplicate / invalid
    published --> matched: matcher returns volunteers
    matched --> in_progress: first volunteer checks in
    in_progress --> completed: proof submitted
    completed --> verified: beneficiary / coordinator confirms
    verified --> closed: archived to BigQuery
    published --> escalated: SLA breach
    escalated --> matched: re-dispatch
    published --> expired: window passed
    expired --> closed
    withdrawn --> [*]
    closed --> [*]
```

---

## 7. Assignment Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> offered: dispatch-svc sends FCM
    offered --> accepted: volunteer taps "I'll help"
    offered --> declined: dismiss / timeout
    declined --> [*]
    accepted --> en_route: navigation started
    en_route --> checked_in: geofence triggered
    checked_in --> performing: task underway
    performing --> proof_submitted: photo + note
    proof_submitted --> verified: coordinator/beneficiary confirms
    proof_submitted --> disputed: feedback flag
    disputed --> verified: resolved
    disputed --> reassigned: redo with another volunteer
    verified --> recognized: badges / certificate
    recognized --> [*]
    accepted --> cancelled: volunteer cancels
    en_route --> cancelled
    cancelled --> [*]
```

---

## 8. Sequence — Paper Survey to Published Need

```mermaid
sequenceDiagram
    autonumber
    actor FW as Field Worker
    participant App as Mobile App (Flutter)
    participant GCS as Cloud Storage
    participant EVT as Eventarc
    participant CF as Cloud Function
    participant DAI as Document AI
    participant DF as Dataflow
    participant DLP as Cloud DLP
    participant FS as Firestore
    participant BQ as BigQuery
    participant PS as Pub/Sub
    actor CO as Coordinator

    FW->>App: capture photo of paper form
    App->>App: queue offline (Firestore cache)
    App-->>App: connectivity restored
    App->>GCS: upload raw image (KMS encrypted)
    GCS->>EVT: ObjectFinalized event
    EVT->>CF: trigger pipeline
    CF->>DAI: ProcessDocument(formType=intake-v1)
    DAI-->>CF: structured JSON + confidence scores
    CF->>DF: publish to ingestion stream
    DF->>DLP: inspect + tokenize PII
    DLP-->>DF: redacted record
    DF->>FS: upsert Need (state=submitted)
    DF->>BQ: append curated row
    FS->>PS: emit need.submitted
    PS->>CO: realtime listener -> Triage Inbox badge
    CO->>FS: review + set urgency, publish
    FS->>PS: emit need.published
```

---

## 9. Sequence — Volunteer Matching & Dispatch

```mermaid
sequenceDiagram
    autonumber
    participant PS as Pub/Sub (need.published)
    participant MT as matching-svc
    participant EMB as Vertex Embeddings
    participant VS as Vertex Vector Search
    participant GEM as Gemini
    participant DP as dispatch-svc
    participant FS as Firestore
    participant FCM as FCM
    participant SMS as SMS Gateway
    actor V as Volunteer
    participant Maps as Routes API

    PS->>MT: need.published event
    MT->>EMB: embed(need.skills + geo + lang)
    EMB-->>MT: vector v_n
    MT->>VS: ANN query(v_n, k=50, filters)
    VS-->>MT: candidate list
    MT->>GEM: rerank + generate explanations
    GEM-->>MT: top-K with "why" chips
    MT->>FS: write match.suggestions
    MT->>DP: trigger dispatch(need_id)
    DP->>FCM: push notification(s)
    DP->>SMS: fallback for offline volunteers
    FCM-->>V: "Help needed 1.2km away"
    V->>DP: accept (Assignment.accepted)
    DP->>FS: update assignment state
    DP->>Maps: compute route
    Maps-->>V: turn-by-turn directions
```

---

## 10. Sequence — Disaster Crisis Mode

```mermaid
sequenceDiagram
    autonumber
    actor G as Govt Cell
    participant Web as Govt Console
    participant PS as Pub/Sub (alerts.gov)
    participant WF as Cloud Workflows
    participant BQ as BigQuery
    participant EE as Earth Engine
    participant MT as matching-svc
    participant DP as dispatch-svc
    participant FCM as FCM Topic
    participant DLG as Dialogflow CX
    actor V as Volunteers
    actor B as Beneficiaries
    actor CO as Coordinators

    G->>Web: Declare disaster (district 7)
    Web->>PS: publish disaster.declared
    PS->>WF: start crisis-response workflow
    WF->>BQ: query open needs in district
    WF->>EE: pull rainfall/flood overlay
    EE-->>WF: risk grid
    WF->>MT: bulk match (relaxed filters)
    MT-->>WF: ranked volunteer pools
    WF->>DP: bulk dispatch
    DP->>FCM: topic broadcast: disaster/d7
    FCM-->>V: emergency push (loud channel)
    WF->>DLG: launch IVR intake campaign
    DLG-->>B: SMS/voice intake in local lang
    WF->>CO: pivot dashboard to Crisis Mode
    CO->>DP: manual overrides as needed
```

---

## 11. Sequence — Beneficiary SMS/IVR Intake

```mermaid
sequenceDiagram
    autonumber
    actor B as Beneficiary
    participant Carrier as Telecom Carrier
    participant GW as SMS Gateway (Cloud Run)
    participant DLG as Dialogflow CX
    participant TR as Translation API
    participant IN as intake-svc
    participant FS as Firestore
    participant PS as Pub/Sub
    actor CO as Coordinator

    B->>Carrier: SMS "HELP" to shortcode
    Carrier->>GW: webhook (text, MSISDN)
    GW->>DLG: detect intent + slot fill
    DLG->>TR: translate to working language
    DLG-->>GW: structured intake payload
    GW->>IN: POST /v1/needs (source=sms)
    IN->>FS: persist Need (state=submitted)
    FS->>PS: emit need.submitted
    PS->>CO: Triage Inbox notification
    CO-->>B: SMS reply "Tracking code ABC-123"
```

---

## 12. Sequence — Volunteer Voice / Feedback Channel

```mermaid
sequenceDiagram
    autonumber
    actor V as Volunteer
    participant App as Mobile App
    participant DLG as Dialogflow CX
    participant NLP as NL API
    participant GEM as Gemini
    participant EN as engagement-svc
    participant FS as Firestore
    participant PS as Pub/Sub
    actor CO as Coordinator

    V->>App: open Voice tab, record concern
    App->>DLG: text or audio (with consent)
    DLG->>NLP: sentiment + entities
    NLP-->>DLG: classified (relational/value/transactional)
    DLG->>EN: ticket payload
    EN->>FS: persist VoiceTicket (anonymized opt)
    FS->>PS: emit feedback.submitted
    PS->>GEM: weekly digest job
    GEM-->>EN: themed summary
    EN-->>CO: Voice Channel inbox + digest
    CO->>FS: update SLA status, respond
```

---

## 13. Entity Relationship Diagram

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ PROGRAM : runs
    TENANT ||--o{ SURVEY_TEMPLATE : owns
    TENANT ||--o{ POLICY : configures

    USER ||--o{ ROLE_BINDING : has
    ROLE_BINDING }o--|| ROLE : grants
    USER ||--o{ VOLUNTEER_PROFILE : "1:1 if volunteer"
    USER ||--o{ STAFF_PROFILE : "1:1 if staff"

    PROGRAM ||--o{ NEED : contains
    NEED ||--o{ TASK : decomposes
    TASK ||--o{ ASSIGNMENT : produces
    ASSIGNMENT }o--|| VOLUNTEER_PROFILE : assignedTo
    ASSIGNMENT ||--o{ OUTCOME : results
    OUTCOME ||--o{ FEEDBACK : collects

    NEED ||--o| BENEFICIARY : about
    BENEFICIARY ||--o{ CONSENT : grants
    BENEFICIARY {
        string beneficiary_token PK
        string household_id
        string locale
        string consent_status
    }

    NEED {
        string need_id PK
        string program_id FK
        string title
        string category
        string urgency
        string state
        geo geo
        timestamp window_start
        timestamp window_end
        int headcount_required
        int headcount_filled
        string embedding_ref
    }

    VOLUNTEER_PROFILE {
        string user_id PK
        string org_id FK
        string[] languages
        json skills
        json availability
        geo home
        int max_radius_km
        float trust_score
        string embedding_ref
    }

    ASSIGNMENT {
        string assignment_id PK
        string task_id FK
        string user_id FK
        string state
        timestamp accepted_at
        timestamp checked_in_at
        timestamp completed_at
    }

    AUDIT_EVENT {
        string event_id PK
        string actor
        string action
        string resource
        timestamp ts
    }

    USER ||--o{ AUDIT_EVENT : "produces"
```

---

## 14. Volunteer User Journey

```mermaid
journey
    title Volunteer's day on SamaajSetu
    section Morning
      Open app, see 3 personalized cards: 5: Volunteer
      Tap "I'll help" on relief drive: 5: Volunteer
      Receive route + ETA: 4: Volunteer
    section Travel
      Navigate via Routes API: 4: Volunteer
      Geofence triggers check-in: 5: Volunteer, App
    section On-site
      Coordinate with team: 4: Volunteer, Coordinator
      Distribute kits, capture proof: 5: Volunteer
    section After
      Submit photo + note (offline ok): 5: Volunteer
      Get personalized recognition push: 5: Volunteer
      View updated impact stats: 4: Volunteer
```

---

## 15. Deployment Topology (GCP)

```mermaid
flowchart TB
    subgraph ORG["🏢 GCP Organization"]
        subgraph FOLD_PROD["📁 prod folder"]
            subgraph PRJ_APP["🔒 prj-samaajsetu-app-prod"]
                CR1["Cloud Run services<br/>(11 microservices)"]
                APIG["Apigee"]
                FB["Firebase project<br/>(Firestore, FCM, Auth, Hosting)"]
            end
            subgraph PRJ_DATA["🔐 prj-samaajsetu-data-prod (VPC-SC perimeter)"]
                BQ[("BigQuery datasets")]
                GCS[("Cloud Storage buckets<br/>+ CMEK")]
                DAI["Document AI processors"]
                VS["Vertex AI Vector Search"]
                EE["Earth Engine"]
            end
            subgraph PRJ_OBS["📊 prj-samaajsetu-obs-prod"]
                LOG["Centralized logs sink"]
                MON["Monitoring + Alerts"]
                LK["Looker"]
            end
        end
        subgraph FOLD_STG["📁 staging folder"]
            STG["mirror of prod (smaller)"]
        end
        subgraph FOLD_DEV["📁 dev folder"]
            DEV["Per-developer sandboxes"]
        end
        subgraph FOLD_SEC["📁 security folder"]
            KMSP["Central KMS keyring"]
            SECR["Org-level Secret Manager"]
            AUDP["Audit log destination"]
        end
    end

    subgraph EXT["🌐 External"]
        CDN["Cloud CDN / Edge"]
        Users["End users"]
    end

    Users --> CDN --> APIG
    APIG --> CR1
    CR1 --> FB
    CR1 --> BQ
    CR1 --> GCS
    CR1 --> DAI
    CR1 --> VS
    CR1 --> EE
    CR1 -.logs.-> LOG
    LOG --> MON
    BQ --> LK
    KMSP -.CMEK.-> GCS
    KMSP -.CMEK.-> BQ
    AUDP -.audit.-> CR1
```

---

## 16. Privacy & PII Flow

```mermaid
flowchart LR
    subgraph SRC["Source"]
        S1["Beneficiary form (paper / mobile)"]
    end
    subgraph EDGE["Edge ingest"]
        E1["intake-svc / digitization-svc"]
    end
    subgraph DLP_ZONE["DLP Inspection Zone"]
        D1["Cloud DLP inspectContent"]
        D2{"PII detected?"}
        D3["Tokenize / DeID<br/>(format-preserving)"]
        D4["Hash / drop"]
    end
    subgraph VAULT["🔐 Restricted Vault"]
        V1[("PII bucket<br/>CMEK + VPC-SC")]
        V2["KMS-wrapped lookup table"]
    end
    subgraph SAFE["Curated zone"]
        SZ1[("BigQuery analytics<br/>tokens only")]
        SZ2[("Firestore ops<br/>tokens only")]
    end
    subgraph CONSUMER["Consumers"]
        C1["Coordinator UI (re-id with role)"]
        C2["Donor portal (aggregated only)"]
        C3["Auditor (audit logs)"]
    end

    S1 --> E1 --> D1 --> D2
    D2 -->|yes| D3 --> V1
    D2 -->|no| SZ2
    D3 --> SZ2
    D3 --> SZ1
    V1 --- V2
    V2 -->|authorized re-id| C1
    SZ1 --> C2
    V1 -.access logs.-> C3
```

---

## 17. Module Mindmap

```mermaid
mindmap
  root((SamaajSetu))
    Personas
      Volunteer
      Field Worker
      Coordinator
      NGO Admin
      Beneficiary
      Donor
      Auditor
      Govt Cell
      Super Admin
    Domain Services
      identity-svc
      intake-svc
      digitization-svc
      need-svc
      volunteer-svc
      matching-svc
      dispatch-svc
      engagement-svc
      analytics-svc
      trust-svc
      billing-svc
    Clients
      Mobile App
        Volunteer mode
        Field Worker mode
      Web Console
        Coordinator
        Admin
        Auditor
      Public Portal
        Donor
        Transparency
      SMS / IVR / WhatsApp
    GCP Building Blocks
      AI/ML
        Document AI
        Speech-to-Text
        Translation
        NL API
        Vertex Embeddings
        Vertex Vector Search
        Gemini
        BigQuery ML
        Earth Engine
        Dialogflow CX
      Data
        Firestore
        BigQuery
        Cloud Storage
        Cloud SQL
        Data Catalog
      Compute
        Cloud Run
        Cloud Functions
        Cloud Workflows
        Cloud Tasks
      Eventing
        Pub/Sub
        Eventarc
      Engagement
        Firebase Cloud Messaging
        Maps Platform
        Routes API
      Security
        Identity Platform
        IAP
        Apigee
        Cloud DLP
        Cloud KMS
        VPC-SC
        Assured Workloads
        Secret Manager
      Observability
        Cloud Logging
        Cloud Trace
        Cloud Monitoring
        Looker Studio
    Cross-cutting
      Offline-first
      Multilingual
      Accessibility
      RBAC + Multi-tenant
      Audit + Compliance
      SLOs + Quality Gates
```

---

*Document version: 1.0 — generated 2026-04-28*
*Render in: GitHub, VS Code (Markdown Preview Mermaid Support), Obsidian, mermaid.live, Notion.*
