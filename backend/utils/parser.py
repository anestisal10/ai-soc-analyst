import email
import logging
from email import policy
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

class ParsedEmail(BaseModel):
    sender: str
    recipient: str
    subject: str
    body: str
    urls: List[str]
    ips: List[str]
    attachments: List[dict] = []

def parse_raw_email(raw_content: str) -> ParsedEmail:
    """
    Parses a raw string or .eml content into structured data.
    """
    msg = email.message_from_string(raw_content, policy=policy.default)
    
    sender = msg.get("From", "")
    recipient = msg.get("To", "")
    subject = msg.get("Subject", "")
    
    body = ""
    attachments = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    body += part.get_payload(decode=True).decode(charset, errors="replace")
                except Exception as e:
                    logger.warning(f"Failed to decode plain text part: {e}")
            elif "attachment" in content_disposition or part.get_filename():
                filename = part.get_filename() or "unknown.bin"
                payload = part.get_payload(decode=True)
                if payload:
                    attachments.append({
                        "filename": filename,
                        "content_type": content_type,
                        "payload": payload
                    })
    else:
        try:
            charset = msg.get_content_charset() or "utf-8"
            body = msg.get_payload(decode=True).decode(charset, errors="replace")
        except Exception as e:
            logger.warning(f"Could not decode non-multipart email payload, falling back to raw: {e}")
            body = msg.get_payload() or ""
            
    # For MVP, we will rely on Gemini to extract the URLs and IPs 
    # from the body rather than using complex regex here, 
    # to showcase the power of the LLM.
            
    return ParsedEmail(
        sender=sender,
        recipient=recipient,
        subject=subject,
        body=body,
        urls=[],
        ips=[],
        attachments=attachments
    )

def parse_telemetry(raw_content: str, data_type: str) -> ParsedEmail:
    """
    Dispatcher to parse either raw emails or generic telemetry (logs, pcaps, etc).
    """
    if data_type == "Email":
        return parse_raw_email(raw_content)
    
    # Generic fallback for logs, alerts, or raw text
    return ParsedEmail(
        sender="System",
        recipient="Analyst",
        subject=f"Raw {data_type}",
        body=raw_content.strip(),
        urls=[],
        ips=[],
        attachments=[]
    )

