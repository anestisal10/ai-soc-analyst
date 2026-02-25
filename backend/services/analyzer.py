import os
import asyncio
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google import genai
from anthropic import AsyncAnthropic
import json

from services.osint import check_url_virustotal, check_ip_abuseipdb

class OsintResult(BaseModel):
    source: str
    target: str
    data: Dict[str, Any]

class ThreatReport(BaseModel):
    threat_score: int
    technical_analysis: str
    psychological_analysis: str
    iocs: List[str]
    graph_data: dict
    remediation_script: str
    osint_results: List[OsintResult]

# Define the prompts
GEMINI_SYSTEM_PROMPT = """
You are a Tier-3 Cybersecurity SOC Analyst specializing in technical email analysis.
Analyze the following email content. Focus ONLY on:
1. Obfuscated URLs, malicious domains, or suspicious IP addresses.
2. Exploit techniques (e.g., zero-width spaces, homoglyph attacks, HTML smuggling).
3. Structural anomalies in the headers (if provided).
Extract all Indicators of Compromise (IoCs).
Produce a concise technical report.

Return your response entirely as a JSON object matching this schema:
{
  "technical_analysis": "<your detailed technical findings>",
  "iocs": ["url1.com", "192.168.1.1", "bad_domain.xyz"],
  "technical_score": <1-100 severity score>
}
"""

CLAUDE_SYSTEM_PROMPT = """
You are a Social Engineering and Behavioral Psychology expert specializing in phishing detection.
Analyze the following email content. Focus ONLY on:
1. Tone and Urgency (False sense of urgency, threats).
2. Authority Imitation (Pretending to be IT, CEO, or a trusted brand).
3. Manipulation tactics (Fear, Greed, Curiosity).

Produce a concise psychological profile of the attack.
"""

async def call_gemini(content: str) -> dict:
    try:
        # In a real app we'd load from env, using a mock response for now to get the flow right without keys
        # client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        # response = client.models.generate_content(
        #    model='gemini-3-flash',
        #    contents=content,
        #    config=genai.types.GenerateContentConfig(
        #        system_instruction=GEMINI_SYSTEM_PROMPT,
        #        response_mime_type="application/json",
        #    ),
        # )
        # return json.loads(response.text)
        
        # Mocking for immediate frontend development speed
        await asyncio.sleep(1.5)
        return {
            "technical_analysis": "The email contains a hidden anchor tag pointing to a newly registered domain (secure-billing-update.xyz) designed to look like a Microsoft login page. SPF and DKIM signatures are missing, indicating spoofing.",
            "iocs": ["secure-billing-update.xyz", "104.21.55.12"],
            "technical_score": 85
        }
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"technical_analysis": "Error analyzing", "iocs": [], "technical_score": 0}

async def call_claude(content: str) -> dict:
    try:
         # client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
         # response = await client.messages.create(...)

         # Mocking
         await asyncio.sleep(1.5)
         return {
             "psychological_analysis": "The attacker uses a high-pressure 'Fear' tactic, threatening immediate account suspension within 24 hours. The tone mimics corporate IT authority to bypass critical thinking.",
             "psychological_score": 90
         }
    except Exception as e:
        return {"psychological_analysis": "Error analyzing", "psychological_score": 0}

async def run_osint_enrichment(iocs: List[str]) -> List[OsintResult]:
    """Run OSINT enrichment against extracted IoCs using VirusTotal and AbuseIPDB."""
    results = []
    tasks = []

    for ioc in iocs:
        # Simple heuristic: if it looks like an IP, query AbuseIPDB; otherwise VirusTotal
        if _is_ip(ioc):
            tasks.append(("AbuseIPDB", ioc, check_ip_abuseipdb(ioc)))
        else:
            tasks.append(("VirusTotal", ioc, check_url_virustotal(ioc)))

    # Run all OSINT lookups in parallel
    enrichment_results = await asyncio.gather(*[t[2] for t in tasks], return_exceptions=True)

    for i, result in enumerate(enrichment_results):
        source, target, _ = tasks[i]
        if isinstance(result, Exception):
            results.append(OsintResult(source=source, target=target, data={"error": str(result)}))
        else:
            results.append(OsintResult(source=source, target=target, data=result))

    return results

def _is_ip(value: str) -> bool:
    """Simple check if a string looks like an IP address."""
    parts = value.split(".")
    if len(parts) != 4:
        return False
    return all(p.isdigit() and 0 <= int(p) <= 255 for p in parts)

async def generate_remediation(iocs: List[str]) -> str:
    if not iocs: return "No IoCs found to block."
    # Mocking a Palo Alto rule generation
    rule = f"""<entry name="Block_Phishing_Campaign_Auto">
  <from><member>any</member></from>
  <to><member>any</member></to>
  <source><member>any</member></source>
  <destination>
"""
    for ioc in iocs:
         rule += f"    <member>{ioc}</member>\n"
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
        
        # Add a mock payload node
        payload_id = f"Payload_{i}"
        nodes.append({"id": payload_id, "group": 3, "label": "Credential Harvester"})
        links.append({"source": node_id, "target": payload_id})

    # Add OSINT enrichment nodes
    for osint in osint_results:
        osint_node_id = f"OSINT_{osint.source}_{osint.target}"
        # Find the matching IoC node to link from
        malicious_count = osint.data.get("malicious", osint.data.get("abuseConfidenceScore", 0))
        label = f"{osint.source}: {'🔴 Malicious' if malicious_count > 3 else '🟡 Suspicious' if malicious_count > 0 else '🟢 Clean'}"
        nodes.append({"id": osint_node_id, "group": 4, "label": label})
        
        # Link to the matching IoC node
        for j, url in enumerate(urls):
            if url == osint.target:
                links.append({"source": f"URL_{j}", "target": osint_node_id})
                break
        
    return {"nodes": nodes, "links": links}

async def analyze_content(content: str, sender: str = "Unknown") -> ThreatReport:
    """
    Main orchestration function.
    Calls Gemini, Claude, runs OSINT enrichment, and builds the final report.
    """
    
    # Run LLM calls in parallel
    gemini_task = call_gemini(content)
    claude_task = call_claude(content)
    
    gemini_res, claude_res = await asyncio.gather(gemini_task, claude_task)
    
    # Calculate unified score
    score = (gemini_res.get("technical_score", 0) + claude_res.get("psychological_score", 0)) // 2
    
    iocs = gemini_res.get("iocs", [])

    # Run OSINT enrichment on extracted IoCs
    osint_results = await run_osint_enrichment(iocs)
    
    # Generate graph data (now enriched with OSINT)
    graph_data = await generate_graph(sender, iocs, osint_results)
    
    # Generate Remediation
    remediation = await generate_remediation(iocs)
    
    return ThreatReport(
        threat_score=score,
        technical_analysis=gemini_res.get("technical_analysis", ""),
        psychological_analysis=claude_res.get("psychological_analysis", ""),
        iocs=iocs,
        graph_data=graph_data,
        remediation_script=remediation,
        osint_results=osint_results
    )
