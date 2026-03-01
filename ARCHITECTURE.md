# AI SOC Analyst — System Architecture

## Overview
The AI SOC Analyst is a comprehensive, dual-brain AI-powered **Cybersecurity Control Center**. It provides two distinct modes: a high-level **System Dashboard** for operational awareness across multiple alert types, and a **deep-dive Investigation Workspace** for single-artifact analysis. It automates intake, deterministic analysis, AI evaluation, OSINT enrichment, and Threat Intelligence export phases of an SOC workflow. The system is designed for **pivot readiness** — a data type selector and templated prompts allow the pipeline to handle phishing emails, firewall logs, SIEM alerts, and network captures without backend rewrites.

---

## Component Architecture

### 1. Client Interfaces Layer

#### Web Frontend (Next.js)
- **Styling**: Tailwind CSS v4, Framer Motion. Custom fonts: **Syne** (headings/UI) and **DM Mono** (data/code display).
- **Tab Navigation**: Top-level tab bar switches between two views:

  **🏠 System Dashboard (`ControlCenterHome.tsx`)**
  - KPI widget row: Active Threats (24h), Critical Alerts, Avg Threat Score, Automated Remediation %.
  - Alert Queue table: live list of incoming alerts with type, source, severity badges, and "Triage" action button that navigates to the Investigation Workspace.
  - Threat Origins panel: placeholder for geo-IP map visualization.
  - Threat Volume panel: bar chart of alert volume over time.

  **🔍 Investigation Workspace (Existing Analysis View)**
  - **Ingest Form (`IngestForm.tsx`)**: Generic telemetry intake panel.
    - **Data Type Selector**: Dropdown with `Phishing Email | Firewall Log | SIEM Alert / Event | Network Capture | Custom`. Drives parser dispatch and AI prompt template on the backend.
    - **Drag-and-Drop Upload**: Accepts `.eml`, `.txt`, `.msg`, `.csv`, `.json`, `.log`, `.pcap`, `.syslog`.
    - **Annotated Text Input (`AnnotatedEmailInput.tsx`)**: Real-time inline threat annotation — regex-based highlighting of suspicious URLs, urgency language, financial keywords, and file extensions with hover tooltips before analysis is triggered.
    - Active Integrations panel (VirusTotal, AbuseIPDB status).
    - Pipeline Timeline (`PipelineTimeline.tsx`): real-time SSE step progress.
  - **Report Dashboard (`ReportDashboard.tsx`)**:
    - **Threat Waterfall (`ThreatWaterfall.tsx`)**: Animated additive waterfall chart decomposing the threat score into labelled factor contributions (replaces the static ThreatGauge).
    - Authentication Results, Attachment Scan, IoC Tables, OSINT Enrichment cards.
    - Investigation Graph (`InvestigationGraph.tsx`): force-directed visualization (`react-force-graph-2d`) linking sender → URLs → payloads → OSINT context.
    - Remediation Panel: Palo Alto XML rules, STIX 2.1 bundle download, MISP push log.
    - PDF Export button — calls `/api/export/pdf`.

#### Browser Extension
- Manifest V3 Chrome extension providing in-browser context, fast analysis of suspected text and URLs, and threat scoring without leaving the active tab.

---

### 2. API Gateway & Orchestration (FastAPI — `main.py`)

- **`GET /health`** — Liveness probe.
- **`POST /api/analyze`** — Primary analysis endpoint. Accepts `text` or `file` (multipart form) plus `data_type` (string, default `"Email"`). Validates file size (10 MB cap), rate-limits by client IP (10 req/min sliding window with automatic stale-entry cleanup), checks the disk cache (`diskcache`), and streams `status` / `result` / `error` events back to the client via **Server-Sent Events (SSE)**.
- **`POST /api/export/pdf`** — Accepts a serialized `ThreatReport` JSON body, delegates to `pdf_exporter.py` in a thread pool, and returns a streaming `application/pdf` response.
- **Shared `httpx.AsyncClient`** lifecycle managed via `asynccontextmanager` lifespan (initialized once at startup, closed on shutdown).
- **CORS**: Restricted to `localhost:3000` / `127.0.0.1:3000`.

---

### 3. Parsing & Orchestration Layer

#### `utils/parser.py`
- **`parse_telemetry(raw_content, data_type)`** — Top-level dispatcher. Routes to `parse_raw_email()` for `Email` data type, or wraps content in a generic `ParsedContent` model for all other data types (Firewall Log, SIEM Alert, Network Capture, Custom).
- **`parse_raw_email(raw_content)`** — Extracts `From`, `To`, `Subject`, body (plain text with HTML fallback), and attachments from raw email strings or `.eml` files.

#### `services/analyzer.py` — Orchestration Engine
- Accepts `content`, `sender`, `attachments`, `raw_bytes`, `status_callback`, and `data_type`.
- **Templated AI Prompt**: System prompt is parameterized by `data_type`:
  ```
  "You are a SOC Analyst AI operating inside a Cybersecurity Control Center.
   Analyze the following {data_type} and extract: IoCs, attack classification,
   severity, and recommended response actions."
  ```
- Kicks off parallel tasks via `asyncio.gather`:
  1. Technical AI Engine (Cerebras)
  2. Psychological AI Engine (Groq/Kimi K2)
  3. Auth Analysis (`auth_analyzer.py`)
  4. Attachment Scan (`attachment_analyzer.py`)
- Runs OSINT enrichment on extracted IoCs.
- Runs Threat Intel prep (`threat_intel.py`).
- Aggregates all results into a unified `ThreatReport` Pydantic model including the threat score waterfall breakdown.

#### `services/cache.py`
- SHA-256 content hash (combining text + raw bytes when available) as cache key.
- `diskcache`-backed persistent response store — survives server restarts.

---

### 4. Deterministic Analysis Layers

#### `utils/auth_analyzer.py` — Email Authentication
- SPF, DKIM, DMARC validation via `dnspython` and `dkimpy`.
- Return-Path / From mismatch detection.
- X-Mailer fingerprinting for known spam infrastructure signatures.

#### `services/attachment_analyzer.py` — Static Attachment Scan
- Non-invasive extraction of email attachments.
- **YARA** (`yara-python`) — rule-based malware signature matching (rules compiled once at module load).
- **OLE/Macro analysis** (`oletools`) — detects malicious macros in Office documents.
- Native **PDF structural scanning** — identifies embedded payloads and suspicious stream objects.

---

### 5. AI Analysis Layer (Dual-Brain)

#### Technical Engine — Cerebras `gpt-oss-120b`
- IoC extraction: domains, IPs, URLs, file hashes.
- Obfuscation and homoglyph detection.
- Logical payload structure analysis.
- Run via `cerebras-cloud-sdk` SDK in `asyncio.to_thread` (non-blocking).

#### Psychological Engine — Groq / Kimi K2 (`moonshotai/kimi-k2-instruct-0905`)
- Social engineering tactic profiling: Fear, Greed, Authority Imitation, Urgency.
- Emotional payload analysis and manipulation scoring.
- Run via Groq inference API.

---

### 6. Advanced OSINT Enrichment Layer (`services/osint.py`)

Triggered upon IoC extraction. Results are TTL-cached via `cachetools.TTLCache` (15 minutes) to protect free-tier API quotas.

- **VirusTotal** — URL and domain reputation scoring.
- **AbuseIPDB** — IP address abuse confidence scoring.
- **WHOIS / `python-whois`** — Domain registration age; flags Newly Registered Domains (NRDs < 30 days).
- **URL Unshortening** — Follows HTTP 301/302 redirect chains to reveal final destinations.
- **crt.sh** — SSL/TLS certificate transparency log queries for domain history.

---

### 7. Automated Remediation & Threat Intel Layer (`services/threat_intel.py`)

- **Firewall Rules** — Generates `Block_Phishing_Campaign_Auto` XML configuration blocks for Palo Alto Networks.
- **STIX 2.1 Bundles** — Converts investigation context (Threat Actor → IoC → Malware) into industry-standard STIX 2.1 JSON (`stix2` library).
- **MISP Integration** — Pushes indicators as a correlated event to an organizational MISP instance via `PyMISP`.

---

### 8. PDF Export Layer (`services/pdf_exporter.py`)

- Accepts a `ThreatReport` model instance.
- Generates a styled, multi-section PDF report using `reportlab`.
- Includes threat score, authentication results, IoC tables, OSINT findings, and remediation actions.
- Run in a thread pool (`asyncio.to_thread`) to avoid blocking the async event loop.

---

## Complete Data Flow

```
User (Web UI)
│
├─ [System Dashboard Tab]
│   └─ ControlCenterHome renders KPI widgets + Alert Queue (static/mock data)
│       └─ "Triage" click → switches to Investigation Workspace tab
│
└─ [Investigation Workspace Tab]
    │
    1. INGEST: User selects Data Type, pastes text or uploads file
       └─ AnnotatedEmailInput highlights threats in real-time (frontend-only)
    │
    2. SUBMIT: POST /api/analyze { text|file, data_type }
    │
    3. CACHE CHECK: generate_hash → diskcache lookup
       ├─ HIT  → stream cached result immediately via SSE
       └─ MISS → proceed to analysis pipeline
    │
    4. PARSE: parse_telemetry(content, data_type)
       ├─ Email   → parse_raw_email() (headers + body + attachments)
       └─ Other   → generic body wrapper
    │
    5. PARALLEL ANALYSIS (asyncio.gather):
       ├─ Cerebras     → IoC extraction, obfuscation detection
       ├─ Groq/KimiK2  → social engineering profiling
       ├─ auth_analyzer → SPF/DKIM/DMARC/header checks
       └─ attachment_analyzer → YARA/OLE/PDF scan
    │
    6. OSINT ENRICHMENT: extracted IoCs → VT + AbuseIPDB + WHOIS + crt.sh
    │
    7. THREAT INTEL PREP: STIX bundle + Palo Alto XML + MISP push
    │
    8. SCORE WATERFALL: additive threat score computed with per-factor breakdown
    │
    9. CACHE SAVE: store ThreatReport in diskcache
    │
   10. SSE STREAM: status events + final JSON result → frontend
    │
   11. RENDER: ReportDashboard
       ├─ ThreatWaterfall (animated score breakdown)
       ├─ Auth / Attachment / IoC / OSINT cards
       ├─ InvestigationGraph (force-directed)
       └─ Remediation Panel + PDF Export button
```
