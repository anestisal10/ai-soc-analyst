import email
import re
import authres
import dkim
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

def analyze_email_headers(raw_content: str, raw_bytes: bytes = None) -> Dict[str, Any]:
    """
    Analyzes the raw email headers for SPF/DKIM/DMARC, structural anomalies, and X-Mailer.
    Returns a dictionary with the results.
    """
    msg = email.message_from_string(raw_content)
    
    results = {
        "spf_pass": False,
        "dkim_pass": False,
        "dmarc_pass": False,
        "anomalies": [],
        "x_mailer": None,
        "spoofed_indicators": False,
        "summary": ""
    }
    
    # 1. SPF / DKIM / DMARC Verification (Mocked/Fallback for hackathon, but with real attempt)
    # We will look for an Authentication-Results header first
    auth_results_header = msg.get_all("Authentication-Results", [])
    if auth_results_header:
        for header in auth_results_header:
            parsed = authres.AuthenticationResultsHeader.parse(header)
            for res in parsed.results:
                if isinstance(res, authres.SPFAuthenticationResult):
                    results["spf_pass"] = (res.result.lower() == 'pass')
                elif isinstance(res, authres.DKIMAuthenticationResult):
                    results["dkim_pass"] = (res.result.lower() == 'pass')
                elif isinstance(res, authres.DMARCAuthenticationResult):
                    results["dmarc_pass"] = (res.result.lower() == 'pass')
    else:
        # Fallback simulation for hackathon if no header is present
        # In a real scenario we would do:
        # spf.check(...)
        # dkim.verify(raw_content.encode())
        # To make it demo-friendly:
        results["spf_pass"] = False
        results["dkim_pass"] = False
        results["dmarc_pass"] = False
        results["anomalies"].append("No Authentication-Results header (Expected for plain text or unstructured inputs).")

    # Try deterministic DKIM check if it fails the header check
    if not results["dkim_pass"]:
        try:
            # dkimpy verify
            # Use raw bytes if available to prevent encoding-mutated signatures
            payload_to_verify = raw_bytes if raw_bytes else raw_content.encode()
            is_valid = dkim.verify(payload_to_verify)
            results["dkim_pass"] = is_valid
        except Exception as e:
            logger.debug(f"Deterministic DKIM verification failed or skipped: {e}")

    # 2. Header Anomaly Detection
    from_header = msg.get("From", "")
    return_path = msg.get("Return-Path", "")
    reply_to = msg.get("Reply-To", "")
    
    # Extract email addresses from headers
    def extract_email(header_val: str) -> str:
        if not header_val: return ""
        # Require at least one dot in domain part (TLD required) to avoid matching 'user@localhost'
        match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', header_val)
        return match.group(0).lower() if match else ""
    
    from_email = extract_email(from_header)
    return_email = extract_email(return_path)
    reply_email = extract_email(reply_to)
    
    if return_email and from_email and return_email != from_email:
        results["anomalies"].append(f"Return-Path ({return_email}) does not match From address ({from_email}).")
        results["spoofed_indicators"] = True
        
    if reply_email and from_email and reply_email != from_email:
        results["anomalies"].append(f"Reply-To ({reply_email}) does not match From address ({from_email}).")
    
    # Analyze Received hops
    received_headers = msg.get_all("Received", [])
    if not received_headers:
        results["anomalies"].append("No 'Received' headers found (Email did not traverse normal MTA paths).")
    
    # Check for domain mismatches in from address
    if from_email:
        domain = from_email.split("@")[-1]
        # Simulate a fake Microsoft check
        if "microsoft" in from_header.lower() and domain != "microsoft.com":
            results["anomalies"].append(f"Sender name claims 'Microsoft' but domain is '{domain}'.")
            results["spoofed_indicators"] = True

    # 3. X-Mailer Fingerprinting
    x_mailer = msg.get("X-Mailer", "") or msg.get("User-Agent", "")
    if x_mailer:
        results["x_mailer"] = x_mailer
        # Red flag: claims microsoft but uses PHP mailer
        if "microsoft" in from_header.lower() and "php" in x_mailer.lower():
            results["anomalies"].append(f"Instant Red Flag: Sender claims Microsoft but X-Mailer is '{x_mailer}'.")
            results["spoofed_indicators"] = True
            
    # Build a summary
    auth_summary = [
        "SPF: " + ("PASS" if results["spf_pass"] else "FAIL"),
        "DKIM: " + ("PASS" if results["dkim_pass"] else "FAIL"),
        "DMARC: " + ("PASS" if results["dmarc_pass"] else "FAIL")
    ]
    results["summary"] = " | ".join(auth_summary)
    
    return results
