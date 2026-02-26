# AI SOC Analyst — Agent Orchestration Rules

## Introduction
This document dictates the rules, workflows, and architectural boundaries for any AI agent or human developer contributing to the **AI SOC Analyst** project. Adhering to these guidelines ensures system stability, consistency, and alignment with the hackathon goals.

## 1. Core Development Philosophy
- **Speed & Visual Impact**: As a hackathon project, prioritize delivering a visually impressive, working "happy path" over covering every obscure edge case.
- **Mocking for Velocity**: Use `asyncio.sleep()` and static mock data to simulate LLM or API responses when API limits are hit or actual endpoints are unavailable. Do not break the pipeline just because a third-party API is down.
- **Asynchronous by Default**: All significant I/O operations (LLM inferences, OSINT queries) must remain asynchronous to ensure the backend remains non-blocking.

## 2. Backend Orchestration Rules (FastAPI)
- **Parallel Processing**: Maintain the parallel execution flow in `backend/services/analyzer.py`. When adding a new LLM call or OSINT enrichment, use `asyncio.gather()` to run them concurrently with existing tasks.
- **LLM Specialization (Dual-Brain)**: 
  - **Gemini** handles pure *Technical Analysis* (IoC extraction, payload details, HTTP header anomalies).
  - **Claude** handles *Psychological/Contextual Analysis* (Social engineering tactics, urgency, tone).
  - *Rule*: Do NOT mix these responsibilities. If you need new behavioral insights, modify Claude's prompt. If you need new technical extractions, modify Gemini's.
- **OSINT Enrichment**:
  - The `run_osint_enrichment` function aggregates requests.
  - New sources (e.g., DomainTools) must return the standard `OsintResult` Pydantic model.
- **Remediation**:
  - Firewall rule generation (e.g., Palo Alto XML) should remain segregated in its specific utility function. Ensure XML generation is robust and handles empty IoC lists gracefully.

## 3. Frontend Orchestration Rules (Next.js)
- **Component Architecture**: Keep components modular. The core screens are Input Panel, Results Dashboard, Investigation Graph, and Remediation.
- **Styling**: Strictly use **Tailwind CSS v4**. Do not introduce external massive component libraries (like MUI or AntD) unless strictly necessary, as they can conflict with the custom aesthetic.
- **Investigation Graph**: Modifications to the `react-force-graph-2d` implementation must be carefully tested to ensure the layout mechanism and node dragging remain smooth. Ensure OSINT data dynamically sets node colors (e.g., Red for malicious, Yellow for suspicious).

## 4. Environment & Secrets
- Never commit actual API keys to the repository.
- Ensure `.env.example` is updated whenever a new third-party integration (e.g., an OSINT API) is added.

## 5. Agent Prompting & Collaboration
When an AI agent (like yourself) is tasked with adding a feature:
1. **Analyze First**: Read `ARCHITECTURE.md` and `backend/services/analyzer.py` before modifying core logic.
2. **Atomic Changes**: Only modify the specific pipeline component requested (e.g., if asked to add an IP lookup logic, do not rewrite the Claude prompt).
3. **Verify Constraints**: Ensure the `ThreatReport` Pydantic model correctly represents any new data fields, and update the Next.js frontend to properly render them without crashing if data is missing.
4. **Final updates**: When you think you are done, update the ARCHITECTURE.md minimally with the changes you made.

