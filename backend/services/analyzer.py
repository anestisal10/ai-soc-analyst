import os
import asyncio
import logging
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from cerebras.cloud.sdk import Cerebras
from groq import AsyncGroq
import json
import html
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

from services.osint import check_url_virustotal, check_ip_abuseipdb, check_domain_age, trace_url_redirects, check_certificate
from services.attachment_analyzer import analyze_all_attachments
from services.threat_intel import generate_stix_bundle, push_to_misp
from utils.auth_analyzer import analyze_email_headers
from utils.ioc_utils import is_ip as _is_ip

class OsintResult(BaseModel):
    source: str
    target: str
    data: Dict[str, Any]

class ThreatReport(BaseModel):
    threat_score: int
    score_breakdown: List[Dict[str, Any]]
    technical_analysis: str
    psychological_analysis: str
    iocs: List[str]
    graph_data: dict
    remediation_script: str
    osint_results: List[OsintResult]
    attachment_results: List[Dict[str, Any]] = []
    authentication_results: dict
    stix_bundle: Optional[str] = None
    misp_status: Optional[dict] = None

def get_cerebras_prompt(data_type: str) -> str:
    return f"""You are a Tier-3 Cybersecurity SOC Analyst specializing in technical analysis of {data_type} data.
Analyze the following {data_type} telemetry. Focus ONLY on:
1. Obfuscated URLs, malicious domains, or suspicious IP addresses.
2. Exploit techniques, payload indicators, or evasion attempts.
3. Structural anomalies or known attack vectors.

Extract all Indicators of Compromise (IoCs).
Produce a concise technical report.

Return your response entirely as a JSON object matching this schema:
{{
  "technical_analysis": "<your detailed technical findings>",
  "iocs": ["url1.com", "192.168.1.1", "bad_domain.xyz"],
  "technical_score": <1-100 severity score>
}}
"""

def get_groq_prompt(data_type: str) -> str:
    if data_type == "Email":
        return """You are a Social Engineering and Behavioral Psychology expert specializing in phishing detection.
Analyze the following email content. Focus ONLY on:
1. Tone and Urgency (False sense of urgency, threats).
2. Authority Imitation (Pretending to be IT, CEO, or a trusted brand).
3. Manipulation tactics (Fear, Greed, Curiosity).

Produce a concise psychological profile of the attack.
Return your response entirely as a JSON object matching this schema:
{
  "psychological_analysis": "<your detailed profile>",
  "psychological_score": <1-100 score indicating manipulation severity>
}
"""
    else:
        return f"""You are a Threat Actor Profiling expert specializing in behavioral analysis.
Analyze the following {data_type} telemetry. Focus ONLY on:
1. Attacker Intent (Reconnaissance, Exploitation, Exfiltration).
2. Behavioral Patterns (Evasion techniques, persistence mechanisms).
3. Tactics, Techniques, and Procedures (TTPs) mapping to MITRE ATT&CK.

Produce a concise behavioral profile of the attack.
Return your response entirely as a JSON object matching this schema:
{{
  "psychological_analysis": "<your detailed behavioral profile>",
  "psychological_score": <1-100 score indicating behavioral severity>
}}
"""

# Cerebras SDK is synchronous — run it inside a thread to avoid blocking the event loop
def _sync_call_cerebras(content: str, data_type: str) -> dict:
    """Synchronous Cerebras call — must be run via asyncio.to_thread."""
    client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
    system_prompt = get_cerebras_prompt(data_type)
    completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ],
        model="gpt-oss-120b",
        max_completion_tokens=2048,
        temperature=0.2,
        top_p=1,
        stream=False,
    )
    result_text = completion.choices[0].message.content
    return json.loads(result_text)


async def call_cerebras(content: str, data_type: str) -> dict:
    """Async wrapper around the Cerebras technical analysis call."""
    try:
        result = await asyncio.to_thread(_sync_call_cerebras, content, data_type)
        if not isinstance(result, dict):
            logger.warning(f"Cerebras returned unexpected type: {type(result)}")
            return {"technical_analysis": "Unexpected response format.", "iocs": [], "technical_score": 0}
        for key in ("technical_analysis", "iocs", "technical_score"):
            if key not in result:
                logger.warning(f"Cerebras response missing key '{key}'. Keys present: {list(result.keys())}")
        return result
    except Exception as e:
        logger.error(f"Cerebras Error: {e}", exc_info=True)
        return {"technical_analysis": "Error analyzing", "iocs": [], "technical_score": 0}

async def call_groq(content: str, data_type: str) -> dict:
    try:
        client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))
        system_prompt = get_groq_prompt(data_type)
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content}
            ],
            model="moonshotai/kimi-k2-instruct-0905",
            response_format={"type": "json_object"}
        )
        result_text = chat_completion.choices[0].message.content
        result = json.loads(result_text)
        # Fix #11: Validate required keys
        if not isinstance(result, dict):
            logger.warning(f"Groq returned unexpected type: {type(result)}")
            return {"psychological_analysis": "Unexpected response format.", "psychological_score": 0}
        for key in ("psychological_analysis", "psychological_score"):
            if key not in result:
                logger.warning(f"Groq response missing key '{key}'. Keys present: {list(result.keys())}")
        return result
    except Exception as e:
        logger.error(f"Groq Error: {e}", exc_info=True)
        return {"psychological_analysis": "Error analyzing", "psychological_score": 0}

async def run_osint_enrichment(iocs: List[str]) -> List[OsintResult]:
    """Run OSINT enrichment against extracted IoCs using VirusTotal, AbuseIPDB, and Custom OSINT."""
    results = []
    tasks = []

    for ioc in iocs:
        if _is_ip(ioc):
            tasks.append(("AbuseIPDB", ioc, check_ip_abuseipdb(ioc)))
        else:
            # 1. VirusTotal
            tasks.append(("VirusTotal", ioc, check_url_virustotal(ioc)))

            # Extract domain robustly using urlparse
            if "://" in ioc:
                parsed = urlparse(ioc)
                domain = parsed.hostname or ioc
            elif "/" in ioc:
                domain = ioc.split("/")[0]
            else:
                domain = ioc

            # Strip port if present
            if ":" in domain:
                domain = domain.split(":")[0]

            # 2. Domain Age (WHOIS)
            tasks.append(("WHOIS", domain, check_domain_age(domain)))

            # 3. Certificate Transparency (crt.sh)
            tasks.append(("Certificate (crt.sh)", domain, check_certificate(domain)))

            # 4. Redirect Tracing
            url = ioc if "://" in ioc else f"http://{ioc}"
            tasks.append(("Redirect Trace", url, trace_url_redirects(url)))

    # Run all OSINT lookups in parallel
    enrichment_results = await asyncio.gather(*[t[2] for t in tasks], return_exceptions=True)

    for i, result in enumerate(enrichment_results):
        source, target, _ = tasks[i]
        if isinstance(result, Exception):
            results.append(OsintResult(source=source, target=target, data={"error": str(result)}))
        else:
            results.append(OsintResult(source=source, target=target, data=result))

    return results


async def generate_remediation(iocs: List[str]) -> str:
    if not iocs: return "No IoCs found to block."
    rule = f"""<entry name="Block_Phishing_Campaign_Auto">
  <from><member>any</member></from>
  <to><member>any</member></to>
  <source><member>any</member></source>
  <destination>
"""
    for ioc in iocs:
        rule += f"    <member>{html.escape(ioc)}</member>\n"
    rule += """  </destination>
  <application><member>any</member></application>
  <service><member>application-default</member></service>
  <action>deny</action>
</entry>"""
    return rule

async def generate_graph(sender: str, urls: List[str], osint_results: List[OsintResult]) -> dict:
    """Create a node/link structure for react-force-graph, enriched with OSINT data."""
    nodes = [{"id": "Sender", "group": 1, "label": sender}]
    links = []

    for i, url in enumerate(urls):
        node_id = f"URL_{i}"
        nodes.append({"id": node_id, "group": 2, "label": url})
        links.append({"source": "Sender", "target": node_id})

        # Payload node uses the IoC value as its label
        payload_id = f"Payload_{i}"
        nodes.append({"id": payload_id, "group": 3, "label": f"Payload: {url}"})
        links.append({"source": node_id, "target": payload_id})

    # Add OSINT enrichment nodes
    for osint in osint_results:
        osint_node_id = f"OSINT_{osint.source}_{osint.target}"

        if "error" in osint.data:
            label = f"{osint.source}: ⚪ Error"
        else:
            malicious_count = osint.data.get("malicious", osint.data.get("abuseConfidenceScore", 0))
            is_critical = osint.data.get("critical", False)
            is_suspicious = osint.data.get("suspicious", False)

            if malicious_count > 3 or is_critical:
                label = f"{osint.source}: 🔴 Malicious"
            elif malicious_count > 0 or is_suspicious:
                label = f"{osint.source}: 🟡 Suspicious"
            else:
                label = f"{osint.source}: 🟢 Clean"

        nodes.append({"id": osint_node_id, "group": 4, "label": label})

        # Link to the matching IoC node
        for j, url in enumerate(urls):
            if url == osint.target:
                links.append({"source": f"URL_{j}", "target": osint_node_id})
                break

    return {"nodes": nodes, "links": links}

async def analyze_content(content: str, sender: str = "Unknown", attachments: List[dict] = None, raw_bytes: Optional[bytes] = None, status_callback=None, data_type: str = "Email") -> ThreatReport:
    """
    Main orchestration function.
    Calls Gemini, Groq, runs OSINT enrichment, attachment analysis and builds the final report.
    """

    if attachments is None:
        attachments = []

    if status_callback:
        await status_callback("Authenticating Infrastructure & Extracting Content")

    # Check headers deterministically first
    # Wrapped in to_thread because dkim.verify() does synchronous DNS I/O
    auth_results = await asyncio.to_thread(analyze_email_headers, content, raw_bytes)

    if status_callback:
        await status_callback("Running Dual-Engine AI Analysis & Attachment Scanning")

    # Run LLM calls and attachment analysis in parallel
    cerebras_task = call_cerebras(content, data_type)
    groq_task = call_groq(content, data_type)
    attachment_task = analyze_all_attachments(attachments)

    gemini_res, groq_res, attachment_res = await asyncio.gather(cerebras_task, groq_task, attachment_task)

    iocs = gemini_res.get("iocs", [])
    # Ensure iocs is always a list of strings
    if not isinstance(iocs, list):
        logger.warning(f"Gemini iocs field was not a list: {type(iocs)}")
        iocs = []
    iocs = [str(ioc) for ioc in iocs if ioc]

    if status_callback:
        await status_callback("Enriching Extracted IoCs via OSINT")

    # Run OSINT enrichment on extracted IoCs
    osint_results = await run_osint_enrichment(iocs)

    # Calculate unified additive score and breakdown
    score_breakdown = []
    total_score = 0

    # 1. Technical AI Analysis (Max 30)
    tech_val = gemini_res.get("technical_score", 0)
    tech_points = int((tech_val / 100.0) * 30)
    score_breakdown.append({"factor": "Technical Analysis", "score": tech_points, "type": "ai", "description": f"AI technical severity {tech_val}/100"})
    total_score += tech_points

    # 2. Psychological AI Analysis (Max 30)
    psych_val = groq_res.get("psychological_score", 0)
    psych_points = int((psych_val / 100.0) * 30)
    score_breakdown.append({"factor": "Psychological Tactics", "score": psych_points, "type": "ai", "description": f"AI psychological manipulation {psych_val}/100"})
    total_score += psych_points

    # 3. Authentication (Max 15)
    auth_points = 0
    auth_msgs = []
    if auth_results.get("spf") != "pass":
        auth_points += 5
        auth_msgs.append("SPF fail")
    if auth_results.get("dkim") != "pass":
        auth_points += 5
        auth_msgs.append("DKIM fail")
    if auth_results.get("dmarc") != "pass":
        auth_points += 5
        auth_msgs.append("DMARC fail")
    
    if auth_points > 0:
        score_breakdown.append({"factor": "Auth Failures", "score": auth_points, "type": "auth", "description": ", ".join(auth_msgs)})
        total_score += auth_points
    else:
        score_breakdown.append({"factor": "Authentication Passed", "score": 0, "type": "auth", "description": "SPF/DKIM/DMARC passed"})

    # 4. OSINT (Max 25)
    osint_points = 0
    osint_msgs = []
    for o_res in osint_results:
        malicious_count = o_res.data.get("malicious", o_res.data.get("abuseConfidenceScore", 0))
        is_critical = o_res.data.get("critical", False)
        is_suspicious = o_res.data.get("suspicious", False)
        
        if malicious_count > 3 or is_critical:
            osint_points += 15
            osint_msgs.append(f"{o_res.source} (Malicious)")
        elif malicious_count > 0 or is_suspicious:
            osint_points += 5
            osint_msgs.append(f"{o_res.source} (Suspicious)")

    osint_points = min(osint_points, 25)
    if osint_points > 0:
        score_breakdown.append({"factor": "OSINT Hits", "score": osint_points, "type": "osint", "description": ", ".join(list(set(osint_msgs)))})
        total_score += osint_points

    # 5. Attachments (Max 30)
    attach_points = 0
    attach_msgs = []
    for a_res in attachment_res:
        if a_res.get("status") == "malicious":
            attach_points += 30
            attach_msgs.append(f"{a_res.get('filename')} (Malicious)")
        elif a_res.get("status") == "suspicious":
            attach_points += 10
            attach_msgs.append(f"{a_res.get('filename')} (Suspicious)")
            
    attach_points = min(attach_points, 30)
    if attach_points > 0:
        score_breakdown.append({"factor": "Attachment Scans", "score": attach_points, "type": "attachment", "description": ", ".join(list(set(attach_msgs)))})
        total_score += attach_points

    total_score = min(max(total_score, 0), 100)

    # Generate graph data (now enriched with OSINT)
    graph_data = await generate_graph(sender, iocs, osint_results)

    if status_callback:
        await status_callback("Generating STIX Bundle & Graph Data")

    # Generate Remediation
    remediation, misp = await asyncio.gather(
        generate_remediation(iocs),
        push_to_misp(iocs)
    )

    stix = await asyncio.to_thread(generate_stix_bundle, sender, iocs) if iocs else None

    return ThreatReport(
        threat_score=total_score,
        score_breakdown=score_breakdown,
        technical_analysis=gemini_res.get("technical_analysis", ""),
        psychological_analysis=groq_res.get("psychological_analysis", ""),
        iocs=iocs,
        graph_data=graph_data,
        remediation_script=remediation,
        osint_results=osint_results,
        attachment_results=attachment_res,
        authentication_results=auth_results,
        stix_bundle=stix,
        misp_status=misp
    )

