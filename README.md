# 🛡️ AI SOC Analyst — Cybersecurity Control Center

An AI-powered phishing analysis control center that uses **dual-brain LLM agents** (Google Gemini + Anthropic Claude) for comprehensive threat analysis, **OSINT enrichment** via VirusTotal & AbuseIPDB, and **auto-remediation** with Palo Alto firewall rule generation.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Next.js Frontend                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Input    │  │ Investigation│  │  Results       │  │
│  │ Panel +  │  │ Force Graph  │  │  Dashboard     │  │
│  │ File     │  │              │  │  + Timeline    │  │
│  │ Upload   │  │              │  │  + Remediation │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
└─────────────────┬───────────────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────────────┐
│                FastAPI Backend                        │
│  ┌──────────────────────────────────────────────┐    │
│  │          Orchestration Engine                 │    │
│  │   ┌─────────┐  ┌──────────┐  ┌───────────┐   │    │
│  │   │ Gemini  │  │  Claude  │  │   OSINT   │   │    │
│  │   │Technical│  │Psycholog.│  │ VT + AIDB │   │    │
│  │   └─────────┘  └──────────┘  └───────────┘   │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Email    │  │ Graph        │  │ Remediation   │  │
│  │ Parser   │  │ Builder      │  │ Generator     │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Features

- **🧠 Dual-Brain AI Analysis** — Gemini handles technical IoC extraction; Claude profiles social engineering tactics
- **🌐 OSINT Enrichment** — Automated VirusTotal URL scanning and AbuseIPDB IP reputation checks
- **🔗 Interactive Investigation Graph** — Force-directed visualization of attack relationships (sender → URLs → payloads → OSINT)
- **🛡️ Auto-Remediation** — Generates Palo Alto firewall XML rules to block extracted IoCs
- **📧 Email Parsing** — Supports `.eml` file upload and raw text input with header extraction
- **⏱️ Real-Time Pipeline Timeline** — Shows analysis progress step-by-step as each agent completes

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # Add your API keys
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Framer Motion, react-force-graph-2d |
| Backend | FastAPI, Python 3.11+ |
| AI Engines | Google Gemini 3 Flash, Anthropic Claude Sonnet 4.6 |
| OSINT | VirusTotal API, AbuseIPDB API |
| Styling | Tailwind CSS v4 |

## Team
Newral
Built for the **AI-Powered Cybersecurity Hackathon**.
