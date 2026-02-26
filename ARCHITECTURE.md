# AI SOC Analyst — System Architecture

## Overview
The AI SOC Analyst is a comprehensive, dual-brain AI-powered control center for analyzing phishing and social engineering attacks. It automates the intake, deterministic analysis, AI evaluation, OSINT enrichment, and Threat Intelligence export phases of a Security Operations Center workflow.

## Component Architecture

### 1. Client Interfaces Layer
- **Web Frontend (Next.js 16)**:
  - **Styling**: Tailwind CSS v4, Framer Motion.
  - **Core Views**: 
    - Input Panel: Raw text pasting, `.eml` uploads, and concurrent timeline.
    - Dashboard: Unified threat scores and summarized insights.
    - Investigation Graph: `react-force-graph-2d` visualization bridging senders, IoCs, and OSINT findings.
    - Remediation Panel: XML rules (Palo Alto), STIX 2.1 JSON bundles, and MISP push logs.
- **Browser Extension**:
  - Manifest V3 Chrome extension providing in-browser context and fast analysis of suspected text and URLs.

### 2. API Gateway & Orchestration (FastAPI)
- **Entry Point**: `/api/analyze`. Accepts text or `.eml` files. Streams server-sent events (SSE) back to the client for real-time timeline updates.
- **Email Parser** (`parser.py`): Extracts Headers (From, To, Subject) and Body.
- **Orchestration Engine** (`analyzer.py`):
  - Kicks off parallel tasks using `asyncio.gather` for both AI and deterministic pipelines.
  - Aggregates results into a unified `ThreatReport` Pydantic model.

### 3. Deterministic Analysis Layers
- **Authentication Analyzer** (`auth_analyzer.py`): 
  - Performs validation of SPF, DKIM, and DMARC alignments using deterministic DNS queries (`dnspython`, `dkimpy`). 
  - Detects structural anomalies (Return-Path and From mismatches) and fingerprints X-Mailer strings.
- **Static Attachment Analyzer** (`attachment_analyzer.py`): 
  - Extracts attachments non-invasively and scans them without detonation.
  - Utilizes YARA (`yara-python`), OLE/Macro analysis (`oletools`), and native PDF structural scanning for hidden payloads.

### 4. AI Analysis Layer (Dual-Brain)
- **Technical Engine (Google Gemini 3 Flash)**: 
  - Extracts Indicators of Compromise (IoCs) including domains, IPs, URLs.
  - Detects obfuscation, homoglyphs, and logical payload structures.
- **Psychological Engine (Anthropic Claude Sonnet 4.6)**: 
  - Profiles social engineering tactics (Fear, Greed, Authority Imitation).
  - Analyzes the emotional payload and urgency mechanics.

### 5. Advanced OSINT Enrichment Layer (`osint.py`)
Triggered dynamically upon extracting IoCs via Gemini.
- **Reputation APIs**: VirusTotal (URLs/Domains) and AbuseIPDB (IPs).
- **Domain Age & NRD**: Identifies Newly Registered Domains via `python-whois`.
- **Redirect Tracing**: Unshortens URLs and follows HTTP 301/302 hops.
- **Certificate Transparency**: Checks SSL/TLS certificate history using `crt.sh`.

### 6. Automated Remediation & Threat Intel Layer (`threat_intel.py`)
- **Firewall Rules**: Constructs dynamic `Block_Phishing_Campaign_Auto` XML configuration blocks ready for Palo Alto Networks integration.
- **STIX 2.1 Bundles**: Converts the investigation context (Threat Actor → IoC → Malware) into industry-standard STIX 2.1 JSON for local SIEMs.
- **MISP Integration**: Automatically pushes indicators as a correlated event to an organizational MISP instance via `PyMISP`.

## Complete Data Flow
1. **Intake**: User submits `email.eml` via Web or Context via Extension.
2. **Parsing**: FastAPI reads file, extracts components using `parser.py`.
3. **Deterministic Auth**: `auth_analyzer.py` checks SPF/DKIM/DMARC and headers.
4. **Attachment Scan**: `attachment_analyzer.py` extracts and scans payloads.
5. **Parallel Generative AI**: 
   - `Gemini` -> IoC Extraction & Technical breakdown.
   - `Claude` -> Urgent syntax and psychological categorization.
6. **Parallel OSINT**: `run_osint_enrichment` processes Gemini's IoCs across 5 external/internal verification sources.
7. **Threat Intel Prep**: `threat_intel.py` formats STIX bundles and generates firewall scripts.
8. **MISP Push**: IoCs are sent asynchronously to the MISP database.
9. **Streaming Response**: Updates flow via SSE to populate the Frontend timeline and Investigation Graph instantaneously.
