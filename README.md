# 🛡️ AI SOC Analyst — Cybersecurity Control Center

An AI-powered phishing analysis control center that uses **dual-brain LLM agents** (Cerebras `gpt-oss-120b` + Groq / Kimi K2) for comprehensive threat analysis, **Deep Email Authentication**, **Static Attachment Analysis**, **OSINT enrichment** (VT, AbuseIPDB, crt.sh, WHOIS), and **Threat Intel Automation** (STIX 2.1 & MISP).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Client Interfaces                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Web App  │  │ Dashboard &  │  │ Chrome        │  │
│  │ (Next.js)│  │ Invest. Graph│  │ Extension     │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
└─────────────────┬───────────────────────────────────┘
                  │ REST API & Server-Sent Events
┌─────────────────▼───────────────────────────────────┐
│                FastAPI Backend                        │
│  ┌──────────────────────────────────────────────┐    │
│  │          Orchestration Engine                 │    │
│  │   ┌─────────┐  ┌──────────┐  ┌───────────┐   │    │
│  │   │ Gemini  │  │  Claude  │  │   OSINT   │   │    │
│  │   │Technical│  │Psycholog.│  │ & Enrchmt │   │    │
│  │   └─────────┘  └──────────┘  └───────────┘   │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────┐  ┌─────────────┐   ┌──────────────┐   │
│  │ Email    │  │ Attachment  │   │ Threat Intel │   │
│  │ Auth Dt. │  │ Scan (Yara) │   │ (STIX/MISP)  │   │
│  └──────────┘  └─────────────┘   └──────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Features

- **🧠 Dual-Brain AI Analysis** — Cerebras (`gpt-oss-120b`) handles technical IoC extraction at ultra-low latency; Groq / Kimi K2 (`moonshotai/kimi-k2-instruct-0905`) profiles social engineering tactics.
- **📧 Deep Email Authentication** — Deterministic checks for SPF, DKIM, DMARC, header anomalies, and X-Mailer fingerprinting.
- **📎 Static Attachment Analysis** — Analyzes attachments (PDFs, macros) safely without detonation using YARA, OLE tools, and custom scanning.
- **🌐 Advanced Domain Enrichment** — Automated VirusTotal URL scanning, AbuseIPDB IP checks, WHOIS domain age (NRDs), URL unshortening, and SSL/TLS checks via crt.sh.
- **🔗 Interactive Investigation Graph** — Force-directed visualization of attack relationships (sender → URLs → payloads → OSINT context).
- **🛡️ Auto-Remediation** — Generates Palo Alto firewall XML rules to block extracted IoCs instantly.
- **📡 Threat Intel Automation** — Automatically exports structured STIX 2.1 bundles and pushes IoC attributes directly to MISP instances.
- **⚡ Zero-Latency Caching** — SHA-256 based response caching to prevent redundant LLM and API calls for known payloads.
- **📄 PDF Export** — Instantly generate and download styled PDF threat reports for external sharing and ticketing.
- **🧩 Browser Extension** — Brings AI SOC analysis directly to your browser for quick scoring and URL checking.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          
```

**Edit your `.env` file with necessary keys:**
```env
CEREBRAS_API_KEY=your_cerebras_api_key_here
GROQ_API_KEY=your_groq_api_key_here
VIRUSTOTAL_API_KEY=your_vt_key
ABUSEIPDB_API_KEY=your_abuseipdb_key
MISP_URL=https://your-misp-instance.local  # Optional
MISP_KEY=your_misp_auth_key                # Optional
```

**Run the backend:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Chrome Extension (Optional)
```bash
cd extension
npm install
npm run build
```
Load the `dist/` folder as an unpacked extension in Chrome matching `chrome://extensions/`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Framer Motion, react-force-graph-2d |
| Extension | React, Chrome Extension API Manifest V3 |
| Backend | FastAPI, Python 3.11+ |
| AI Engines | Cerebras (`gpt-oss-120b`), Groq / Kimi K2 (`moonshotai/kimi-k2-instruct-0905`) |
| Tools/OSINT | VirusTotal API, AbuseIPDB, crt.sh, python-whois, dnspython |
| Sec Analysis | yara-python, oletools, dkimpy |
| Threat Intel | stix2, PyMISP |
| Styling | Tailwind CSS v4 |

## Team Newral 
Built for the **AI-Powered Cybersecurity Hackathon**.
