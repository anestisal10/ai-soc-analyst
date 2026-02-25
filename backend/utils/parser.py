import email
from email import policy
from pydantic import BaseModel
from typing import List, Optional

class ParsedEmail(BaseModel):
    sender: str
    recipient: str
    subject: str
    body: str
    urls: List[str]
    ips: List[str]

def parse_raw_email(raw_content: str) -> ParsedEmail:
    """
    Parses a raw string or .eml content into structured data.
    """
    msg = email.message_from_string(raw_content, policy=policy.default)
    
    sender = msg.get("From", "")
    recipient = msg.get("To", "")
    subject = msg.get("Subject", "")
    
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    body += part.get_payload(decode=True).decode()
                except Exception:
                    pass
    else:
        try:
            body = msg.get_payload(decode=True).decode()
        except Exception:
            body = msg.get_payload()
            
    # For MVP, we will rely on Gemini to extract the URLs and IPs 
    # from the body rather than using complex regex here, 
    # to showcase the power of the LLM.
            
    return ParsedEmail(
        sender=sender,
        recipient=recipient,
        subject=subject,
        body=body,
        urls=[],
        ips=[]
    )
