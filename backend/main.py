import uvicorn
import logging
import time
import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Form, File, UploadFile, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Configure standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ── Simple in-memory rate limiter ──────────────────────────────────────────────
# Stores {ip: [timestamps]} for a sliding 60-second window
_rate_limit_store: dict[str, list[float]] = {}
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60


def check_rate_limit(ip: str) -> bool:
    """Return True if the request is allowed, False if rate-limited."""
    now = time.monotonic()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    timestamps = _rate_limit_store.get(ip, [])
    # Evict old timestamps
    timestamps = [t for t in timestamps if t > window_start]
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        _rate_limit_store[ip] = timestamps
        return False
    timestamps.append(now)
    _rate_limit_store[ip] = timestamps
    return True


# ── Improvement #3: Periodic rate-limit store cleanup ────────────────────────
async def _cleanup_rate_limit_store():
    """Purge stale IP entries from the rate limit store every 60 seconds.
    Without this, IPs that make one request and never return accumulate
    indefinitely, causing an unbounded memory leak.
    """
    while True:
        await asyncio.sleep(RATE_LIMIT_WINDOW_SECONDS)
        now = time.monotonic()
        window_start = now - RATE_LIMIT_WINDOW_SECONDS
        stale_ips = [
            ip for ip, timestamps in _rate_limit_store.items()
            if not any(t > window_start for t in timestamps)
        ]
        for ip in stale_ips:
            del _rate_limit_store[ip]
        if stale_ips:
            logger.debug(f"Rate-limit cleanup: evicted {len(stale_ips)} stale IP(s).")


# ── Lifespan (replaces deprecated @app.on_event) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and tear down shared application state."""
    app.state.bg_tasks = set()

    # Improvement #3: Start periodic rate-limit store cleanup
    cleanup_task = asyncio.create_task(_cleanup_rate_limit_store())

    yield

    # Gracefully cancel any in-flight background tasks on shutdown
    cleanup_task.cancel()
    for task in list(app.state.bg_tasks):
        task.cancel()

    # Improvement #4: Close the shared httpx AsyncClient
    from services.osint import close_http_client
    await close_http_client()


# Import our services
from services.analyzer import analyze_content, ThreatReport
from services.cache import generate_hash, get_cached_report, set_cached_report
from services.pdf_exporter import generate_pdf_report
from utils.parser import parse_raw_email, parse_telemetry

app = FastAPI(title="AI Phishing Analyzer API", lifespan=lifespan)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Fix #1: Restrict to known safe origins; remove allow_credentials which is
# incompatible with allow_origins=["*"] and not needed here.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_endpoint(
    request: Request,
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    data_type: str = Form("Email")
):
    """
    Endpoint to analyze either pasted text or an uploaded .eml file.
    """
    # ── Rate limiting ──────────────────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_MAX_REQUESTS} requests per minute."
        )

    content_to_analyze = ""
    sender = "Unknown"
    parsed = None  # will be set below only for file uploads
    raw_bytes = None  # Will store raw bytes for DKIM checks

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
            parsed = parse_telemetry(raw_content, data_type)
            if data_type == "Email":
                content_to_analyze = f"Headers:\nFrom: {parsed.sender}\nTo: {parsed.recipient}\nSubject: {parsed.subject}\n\nBody:\n{parsed.body}".strip()
            else:
                content_to_analyze = f"Data Type: {data_type}\n\nContent:\n{parsed.body}".strip()

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

        if data_type != "Email":
            content_to_analyze = f"Data Type: {data_type}\n\nContent:\n{content_to_analyze}"

        # Try to do a basic extraction if they just pasted headers + body
        if data_type == "Email" and "From:" in text:
            try:
                sender = text.split("From:")[1].split("\n")[0].strip()
            except Exception as e:
                logger.debug(f"Could not extract sender from pasted text: {e}")
    else:
        raise HTTPException(status_code=400, detail="Must provide either text or file")

    # Pass to the orchestration service via SSE streaming
    async def event_generator():
        q: asyncio.Queue = asyncio.Queue()

        async def status_callback(msg: str):
            await q.put({"type": "status", "message": msg})

        async def run_analysis():
            try:
                # --- Cache Check ---
                content_hash = generate_hash(content_to_analyze, raw_bytes)
                cached_data = get_cached_report(content_hash)
                
                if cached_data:
                    await status_callback("Retrieving cached analysis results...")
                    # Add a tiny delay so the frontend UI can show the status update
                    await asyncio.sleep(0.5)
                    await q.put({"type": "result", "data": cached_data})
                    return
                # -------------------

                report = await analyze_content(
                    content=content_to_analyze,
                    sender=sender,
                    attachments=parsed.attachments if parsed else None,
                    raw_bytes=raw_bytes,
                    status_callback=status_callback,
                    data_type=data_type
                )
                
                report_dict = report.model_dump()
                # --- Save to Cache ---
                # We can save synchronously or run it in a thread if it blocks, 
                # but diskcache is usually very fast.
                set_cached_report(content_hash, report_dict)
                # ---------------------
                
                await q.put({"type": "result", "data": report_dict})
            except Exception as e:
                logger.error(f"Analysis task error: {e}", exc_info=True)
                await q.put({"type": "error", "message": str(e)})
            finally:
                await q.put(None)  # EOF marker

        task = asyncio.create_task(run_analysis())
        app.state.bg_tasks.add(task)

        # Fix #30: Safely discard the task even if the callback itself raises
        def _safe_discard(t):
            try:
                app.state.bg_tasks.discard(t)
            except Exception:
                pass

        task.add_done_callback(_safe_discard)

        while True:
            item = await q.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/export/pdf")
async def export_pdf_endpoint(report: ThreatReport):
    """Generate a PDF report from a JSON ThreatReport object."""
    try:
        # Generate the PDF in a thread to avoid blocking the event loop
        pdf_buffer = await asyncio.to_thread(generate_pdf_report, report)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="threat_report.pdf"'}
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
