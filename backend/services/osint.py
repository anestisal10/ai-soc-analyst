import os
import ipaddress
import httpx
import asyncio
import whois
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Fix #13: Single shared AsyncClient for the module lifetime — avoids creating
# a new TCP connection pool on every OSINT lookup.
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=10.0)
    return _http_client


async def close_http_client() -> None:
    """Improvement #4: Gracefully close the shared AsyncClient on shutdown.
    Call this from the FastAPI lifespan teardown to avoid connection leaks.
    """
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


def _is_private_ip(host: str) -> bool:
    """
    Fix #3 (SSRF guard): Return True if the host resolves to a private,
    loopback, link-local, or reserved IP address.
    """
    try:
        addr = ipaddress.ip_address(host)
        return (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
            or addr.is_unspecified
        )
    except ValueError:
        # It's a hostname, not a raw IP — we allow it and let the OS resolve
        return False


async def check_url_virustotal(url: str) -> Dict[str, Any]:
    """
    Calls VirusTotal API if VIRUSTOTAL_API_KEY is present,
    otherwise returns an error indicating missing configuration.
    """
    api_key = os.environ.get("VIRUSTOTAL_API_KEY")

    if api_key:
        try:
            import base64
            url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
            client = get_http_client()
            headers = {"x-apikey": api_key}
            resp = await client.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers=headers)

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
    otherwise returns an error indicating missing configuration.
    """
    api_key = os.environ.get("ABUSEIPDB_API_KEY")

    if api_key:
        try:
            client = get_http_client()
            headers = {
                "Accept": "application/json",
                "Key": api_key
            }
            params = {
                "ipAddress": ip,
                "maxAgeInDays": "90"
            }
            resp = await client.get("https://api.abuseipdb.com/api/v2/check", headers=headers, params=params)

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
    """Trace HTTP redirects with SSRF protection."""
    try:
        # Fix #3: Validate the initial URL is not targeting an internal address
        parsed_initial = urlparse(url)
        initial_host = parsed_initial.hostname or ""
        if _is_private_ip(initial_host):
            logger.warning(f"SSRF guard blocked redirect trace for private host: {initial_host}")
            return {"hops_count": 0, "final_destination": url, "error": "Blocked: target resolves to a private/internal address"}

        hops = []
        current_url = url
        client = get_http_client()

        for _ in range(5):
            try:
                resp = await client.head(current_url, follow_redirects=False)
                if resp.status_code in (301, 302, 303, 307, 308):
                    next_url = resp.headers.get('Location')
                    if next_url:
                        # Handle relative redirects
                        if next_url.startswith('/'):
                            parsed = urlparse(current_url)
                            next_url = f"{parsed.scheme}://{parsed.netloc}{next_url}"

                        # Fix #3: SSRF guard — validate each redirect hop
                        parsed_next = urlparse(next_url)
                        next_host = parsed_next.hostname or ""
                        if _is_private_ip(next_host):
                            logger.warning(f"SSRF guard blocked redirect to private host: {next_host}")
                            break

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
        client = get_http_client()
        resp = await client.get(f"https://crt.sh/?q={domain}&output=json")
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

            # Fix #22: Removed short redundant patterns ("E1", "E2", "R3" etc.) that
            # were dead code — "Let's Encrypt" presence check was already required.
            is_lets_encrypt = "Let's Encrypt" in issuer_name

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
