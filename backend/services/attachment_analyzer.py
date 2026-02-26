import asyncio
from typing import Dict, Any, List
import json
import logging

# Ensure yara is available
try:
    import yara
except ImportError:
    yara = None

# Ensure oletools is available
try:
    from oletools.olevba import VBA_Parser
except ImportError:
    VBA_Parser = None

logger = logging.getLogger(__name__)

async def scan_yara(payload: bytes, filename: str) -> Dict[str, Any]:
    """Scan raw bytes against a compiled YARA rule if available."""
    if yara is None:
        return {"tool": "YARA", "status": "Error: yara-python not installed"}
    
    rules = yara.compile(sources={
        'suspicious_js': 'rule suspicious_js { strings: $a = "eval(" $b = "document.write" condition: any of them }',
        'suspicious_exe': 'rule exe_file { strings: $mz = { 4D 5A } condition: $mz at 0 }'
    })
    
    def _do_match():
        try:
            matches = rules.match(data=payload)
            if matches:
                return {
                    "tool": "YARA",
                    "status": "Suspicious",
                    "findings": [str(m.rule) for m in matches]
                }
            return {"tool": "YARA", "status": "Clean", "findings": []}
        except Exception as e:
            return {"tool": "YARA", "status": f"Error: {e}", "findings": []}

    return await asyncio.to_thread(_do_match)


async def scan_ole(payload: bytes, filename: str) -> Dict[str, Any]:
    """Use oletools to parse VBA macros from Office documents."""
    if VBA_Parser is None:
        return {"tool": "OleTools (olevba)", "status": "Error: oletools not installed"}
    
    # Check if it looks like an OLE/Office file based on extension
    ext = filename.split('.')[-1].lower() if '.' in filename else ''

    def _do_ole():
        parser = VBA_Parser(filename, data=payload)
        if parser.detect_vba_macros():
            results = parser.analyze_macros()
            suspicious_keywords = []
            for kw_type, keyword, description in results:
                suspicious_keywords.append(f"{kw_type}: {keyword} ({description})")
            
            parser.close()
            return {
                "tool": "OleTools (olevba)",
                "status": "Malicious" if suspicious_keywords else "Clean",
                "findings": suspicious_keywords[:10] # limit to top 10
            }
        else:
            parser.close()
            return {"tool": "OleTools (olevba)", "status": "Clean", "findings": ["No VBA Macros found"]}

    try:
        return await asyncio.to_thread(_do_ole)
    except Exception as e:
        return {"tool": "OleTools (olevba)", "status": "Error/Not OLE", "findings": [str(e)]}


async def scan_pdf(payload: bytes, filename: str) -> Dict[str, Any]:
    """Lightweight zero-bloat PDF structural scan (emulating pdfid)."""
    # Simply count occurrences of suspicious PDF streams or actions in the bytes
    suspicious_strings = [
        b'/JavaScript', b'/JS', b'/OpenAction', b'/Launch', b'/EmbeddedFiles', 
        b'/RichMedia', b'/ObjStm', b'/AcroForm'
    ]
    
    findings = []
    total_suspicious = 0
    for s in suspicious_strings:
        count = payload.count(s)
        if count > 0:
            total_suspicious += count
            findings.append(f"{s.decode('utf-8', errors='ignore')} found {count} times")
            
    if total_suspicious > 0:
        return {
            "tool": "PDF Analyzer (Native)",
            "status": "Suspicious" if total_suspicious > 2 else "Warning",
            "findings": findings
        }
    return {"tool": "PDF Analyzer (Native)", "status": "Clean", "findings": []}

async def analyze_attachment(attachment: dict) -> Dict[str, Any]:
    """Orchestrates the static analysis of a single attachment."""
    filename = attachment.get("filename", "")
    content_type = attachment.get("content_type", "")
    payload = attachment.get("payload", b"")
    
    results = {
        "filename": filename,
        "content_type": content_type,
        "scans": []
    }
    
    if not payload:
        results["scans"].append({"tool": "General", "status": "Empty payload", "findings": []})
        return results

    # Run Yara on everything
    yara_res = await scan_yara(payload, filename)
    results["scans"].append(yara_res)
    
    # Run OleTools if it's an office doc or unknown binary
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    if ext in ['doc', 'xls', 'xlsm', 'docm', 'rtf'] or 'officedocument' in content_type:
         ole_res = await scan_ole(payload, filename)
         results["scans"].append(ole_res)
         
    # Run PDF analyzer if it's a PDF
    if ext == 'pdf' or 'pdf' in content_type:
         pdf_res = await scan_pdf(payload, filename)
         results["scans"].append(pdf_res)

    return results

async def analyze_all_attachments(attachments: List[dict]) -> List[Dict[str, Any]]:
    tasks = [analyze_attachment(att) for att in attachments]
    return await asyncio.gather(*tasks)
