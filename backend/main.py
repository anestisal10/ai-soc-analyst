import uvicorn
import logging
from fastapi import FastAPI, Form, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import asyncio
import json
from dotenv import load_dotenv

load_dotenv()

# Configure standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Import our services
from services.analyzer import analyze_content, ThreatReport
from utils.parser import parse_raw_email

app = FastAPI(title="AI Phishing Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize shared application state."""
    app.state.bg_tasks = set()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/analyze")
async def analyze_endpoint(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Endpoint to analyze either pasted text or an uploaded .eml file.
    """
    content_to_analyze = ""
    sender = "Unknown"
    parsed = None  # will be set below only for file uploads
    raw_bytes = None # Will store raw bytes for DKIM checks
    
    if file:
        # Check size limit on raw bytes safely without exhausting memory
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
        
        if file.size and file.size > MAX_FILE_SIZE:
             logger.warning(f"File upload rejected: {file.filename} exceeded metadata size limit")
             raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

        raw_bytes = await file.read()
        if len(raw_bytes) > MAX_FILE_SIZE:
            logger.warning(f"File upload rejected: {file.filename} exceeded read size limit")
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")

        raw_content = raw_bytes.decode("utf-8", errors="ignore")
        try:
            parsed = parse_raw_email(raw_content)
            content_to_analyze = f"Headers:\nFrom: {parsed.sender}\nTo: {parsed.recipient}\nSubject: {parsed.subject}\n\nBody:\n{parsed.body}".strip()
            
            if not content_to_analyze or len(content_to_analyze) < 10:
                raise ValueError("Parsed content is too short or empty")
                
            sender = parsed.sender
        except Exception as e:
            logger.error(f"Error parsing uploaded email: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail="Failed to parse email content. Please ensure it is a valid text or .eml format.")
            
    elif text:
        content_to_analyze = text.strip()
        if not content_to_analyze or len(content_to_analyze) < 10:
            raise HTTPException(status_code=400, detail="Text content must be at least 10 characters long.")
            
        # Try to do a basic extraction if they just pasted headers + body
        if "From:" in text:
            try:
                sender = text.split("From:")[1].split("\n")[0].strip()
            except Exception as e:
                logger.debug(f"Could not extract sender from pasted text: {e}")
                pass
    else:
        raise HTTPException(status_code=400, detail="Must provide either text or file")

    # Pass to the orchestration service via SSE streaming
    async def event_generator():
        q = asyncio.Queue()
        
        async def status_callback(msg: str):
            await q.put({"type": "status", "message": msg})
            
        async def run_analysis():
            try:
                report = await analyze_content(
                    content=content_to_analyze,
                    sender=sender,
                    attachments=parsed.attachments if parsed else None,
                    raw_bytes=raw_bytes,
                    status_callback=status_callback
                )
                await q.put({"type": "result", "data": report.model_dump()})
            except Exception as e:
                logger.error(f"Analysis task error: {e}", exc_info=True)
                await q.put({"type": "error", "message": str(e)})
            finally:
                await q.put(None) # EOF marker
                
        task = asyncio.create_task(run_analysis())
        app.state.bg_tasks.add(task)
        task.add_done_callback(app.state.bg_tasks.discard)
        
        while True:
            item = await q.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
