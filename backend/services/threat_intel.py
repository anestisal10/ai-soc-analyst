import os
import asyncio
import logging
from typing import List
from stix2 import Bundle, Indicator, Malware, Relationship, Identity, KillChainPhase
from datetime import datetime, timezone
from utils.ioc_utils import is_ip as _is_ip

logger = logging.getLogger(__name__)


def generate_stix_bundle(sender: str, iocs: List[str]) -> str:
    """
    Generates a STIX 2.1 JSON bundle representing the investigation graph.
    """
    objects = []
    
    # 1. Create Threat Actor / Sender Identity
    sender_name = sender if sender and sender != "Unknown" else "Unknown Malicious Actor"
    sender_identity = Identity(
        name=sender_name,
        identity_class="threat-actor",
    )
    objects.append(sender_identity)
    
    # 2. Create Malware / Payload Object
    malware = Malware(
        name="Credential Harvester / Phishing Payload",
        is_family=False,
        kill_chain_phases=[
            KillChainPhase(
                kill_chain_name="lockheed-martin-cyber-kill-chain",
                phase_name="delivery"
            )
        ]
    )
    objects.append(malware)
    
    # 3. Link Sender to Malware
    objects.append(Relationship(
        source_ref=sender_identity.id,
        target_ref=malware.id,
        relationship_type="uses"
    ))

    # 4. Create Indicators for all IoCs
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    for ioc in iocs:
        if _is_ip(ioc):
            pattern = f"[ipv4-addr:value = '{ioc.replace(chr(39), chr(92)+chr(39))}']"
        elif "://" in ioc:
            # Full URL — use the url SCO
            safe_ioc = ioc.replace("'", "\\'")
            pattern = f"[url:value = '{safe_ioc}']"
        else:
            # Bare domain — use domain-name SCO
            safe_ioc = ioc.replace("'", "\\'")
            pattern = f"[domain-name:value = '{safe_ioc}']"
        indicator = Indicator(
            name=f"Malicious IoC: {ioc}",
            pattern=pattern,
            pattern_type="stix",
            valid_from=now_str
        )
        objects.append(indicator)
        
        # Link Indicator to Malware
        objects.append(Relationship(
            source_ref=indicator.id,
            target_ref=malware.id,
            relationship_type="indicates"
        ))

    # 5. Package into a Bundle
    bundle = Bundle(objects=objects)
    return bundle.serialize(indent=2)

async def push_to_misp(iocs: List[str]) -> dict:
    """
    Simulates pushing IoCs to a MISP instance or uses PyMISP if configured.
    Falls back to a modeled success response for hackathon velocity.
    """
    misp_url = os.environ.get("MISP_URL")
    misp_key = os.environ.get("MISP_KEY")
    
    # If environment variables are present, we could actually push using PyMISP
    if misp_url and misp_key:
        try:
            from pymisp import PyMISP, MISPEvent
            misp = PyMISP(misp_url, misp_key, False)
            event = MISPEvent()
            event.info = "AI SOC Analyst: Phishing Campaign Auto-Extraction"
            event.distribution = 0 # Your organization only
            event.threat_level_id = 2 # Medium
            event.analysis = 2 # Completed
            for ioc in iocs:
                if _is_ip(ioc):
                    type_str = "ip-dst"
                elif "://" in ioc:
                    # Full URL — use 'url' attribute type, not 'domain'
                    type_str = "url"
                else:
                    type_str = "domain"
                event.add_attribute(type_str, ioc)
            
            result = await asyncio.to_thread(misp.add_event, event)
            return {
                "status": "success", 
                "event_id": result.get("Event", {}).get("id", "Unknown"), 
                "message": "Successfully pushed to MISP"
            }
        except Exception as e:
            logger.error(f"PyMISP Error: {e}.", exc_info=True)
            return {"status": "error", "message": f"PyMISP push failed: {str(e)}", "event_id": None}
            
    return {"status": "skipped", "message": "MISP_URL or MISP_KEY not configured.", "event_id": None}
