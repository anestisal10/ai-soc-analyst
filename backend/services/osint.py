import os
import httpx
import asyncio
import whois
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

async def check_url_virustotal(url: str) -> Dict[str, Any]:
    """
    Calls VirusTotal API if VIRUSTOTAL_API_KEY is present,
    otherwise falls back to mocked response.
    """
    api_key = os.environ.get("VIRUSTOTAL_API_KEY")
    
    if api_key:
        try:
            import base64
            url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
            async with httpx.AsyncClient() as client:
                headers = {"x-apikey": api_key}
                resp = await client.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=headers, timeout=10.0)
                
                if resp.status_code == 200:
                    stats = resp.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                    results = resp.json().get("data", {}).get("attributes", {}).get("last_analysis_results", {})
                    
                    reports = []
                    for k, v in results.items():
                        if v.get("category") in ["malicious", "suspicious"]:
                            reports.append(f"{k}: {v.get('result')}")
                            
                    return {
                        "malicious": stats.get("malicious", 0),
                        "suspicious": stats.get("suspicious", 0),
                        "undetected": stats.get("undetected", 0),
                        "harmless": stats.get("harmless", 0) + stats.get("timeout", 0),
                        "reports": reports[:10]  # Limit to 10 reports
                    }
                else:
                    logger.warning(f"VirusTotal API failed with status {resp.status_code}.")
                    return {"error": f"API failed with status {resp.status_code}"}
        except Exception as e:
            logger.error(f"VirusTotal API exception: {e}.")
            return {"error": f"Exception: {str(e)}"}

    return {"error": "VIRUSTOTAL_API_KEY not configured"}

async def check_ip_abuseipdb(ip: str) -> Dict[str, Any]:
    """
    Calls AbuseIPDB API if ABUSEIPDB_API_KEY is present,
    otherwise falls back to mocked response.
    """
    api_key = os.environ.get("ABUSEIPDB_API_KEY")

    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Accept": "application/json",
                    "Key": api_key
                }
                params = {
                    "ipAddress": ip,
                    "maxAgeInDays": "90"
                }
                resp = await client.get("https://api.abuseipdb.com/api/v2/check", headers=headers, params=params, timeout=10.0)
                
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    return {
                        "abuseConfidenceScore": data.get("abuseConfidenceScore", 0),
                        "usageType": data.get("usageType", "Unknown"),
                        "totalReports": data.get("totalReports", 0)
                    }
                else:
                     logger.warning(f"AbuseIPDB API failed with status {resp.status_code}.")
                     return {"error": f"API failed with status {resp.status_code}"}
        except Exception as e:
            logger.error(f"AbuseIPDB exception: {e}.")
            return {"error": f"Exception: {str(e)}"}

    return {"error": "ABUSEIPDB_API_KEY not configured"}

async def check_domain_age(domain: str) -> Dict[str, Any]:
    """Check domain age using whois."""
    try:
        def _get_whois():
            return whois.whois(domain)
        
        w = await asyncio.to_thread(_get_whois)
        
        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
            
        if creation_date:
            # Normalize to UTC-aware datetime to avoid naive vs aware subtraction
            if isinstance(creation_date, datetime):
                if creation_date.tzinfo is None:
                    creation_date = creation_date.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - creation_date).days
            return {
                "age_days": age,
                "critical": age < 30
            }
        return {"error": "WHOIS lookup returned empty"}
    except Exception as e:
        logger.debug(f"Domain age whois check failed: {e}")
        return {"error": f"WHOIS check failed: {str(e)}"}

async def trace_url_redirects(url: str) -> Dict[str, Any]:
    """Trace HTTP redirects."""
    try:
        hops = []
        current_url = url
        # Limit to 5 hops
        async with httpx.AsyncClient() as client:
            for _ in range(5):
                try:
                    resp = await client.head(current_url, follow_redirects=False, timeout=5.0)
                    if resp.status_code in (301, 302, 303, 307, 308):
                        next_url = resp.headers.get('Location')
                        if next_url:
                            # Handle relative redirects
                            if next_url.startswith('/'):
                                from urllib.parse import urlparse
                                parsed = urlparse(current_url)
                                next_url = f"{parsed.scheme}://{parsed.netloc}{next_url}"
                            hops.append(next_url)
                            current_url = next_url
                        else:
                            break
                    else:
                        break
                except httpx.RequestError as e:
                    logger.debug(f"Request error tracing redirects for {current_url}: {e}")
                    break
        
        return {
            "hops_count": len(hops),
            "final_destination": hops[-1] if hops else url,
            "suspicious": len(hops) > 1 or "bit.ly" in url or "tinyurl" in url,
            "redirect_chain": hops
        }
    except Exception as e:
        logger.error(f"Error tracing redirects for {url}: {e}", exc_info=True)
        return {"hops_count": 0, "final_destination": url, "error": str(e)}

async def check_certificate(domain: str) -> Dict[str, Any]:
    """Check Certificate Transparency logs via crt.sh"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://crt.sh/?q={domain}&output=json", timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
            else:
                data = []
            
        if data and len(data) > 0:
            # Check the issuer of the most recent cert
            latest_cert = data[0]
            issuer_name = latest_cert.get('issuer_name', '')
            
            # Extract CN if present
            latest_issuer_cn = issuer_name
            if "CN=" in issuer_name:
                parts = issuer_name.split("CN=")
                if len(parts) > 1:
                    latest_issuer_cn = parts[1].split(",")[0]
            elif "O=" in issuer_name:
                 parts = issuer_name.split("O=")
                 if len(parts) > 1:
                     latest_issuer_cn = parts[1].split(",")[0]
            
            # Identify Let's Encrypt by specific known issuer names
            LETS_ENCRYPT_PATTERNS = [
                "Let's Encrypt", "Let's Encrypt Authority",
                "E1", "E2", "R3", "R4", "R10", "R11"
            ]
            is_lets_encrypt = any(
                pat in issuer_name for pat in LETS_ENCRYPT_PATTERNS
            ) and "Let's Encrypt" in issuer_name  # Require full string presence too
            return {
                "cert_history_count": len(data),
                "latest_issuer": latest_issuer_cn,
                "is_lets_encrypt": is_lets_encrypt,
                "suspicious": is_lets_encrypt and len(data) < 3
            }
    except Exception as e:
        logger.debug(f"Certificate check failed for {domain}: {e}")
        
    return {
        "cert_history_count": 0,
        "latest_issuer": "Unknown",
        "is_lets_encrypt": False,
        "error": "Timeout or failed to fetch"
    }
