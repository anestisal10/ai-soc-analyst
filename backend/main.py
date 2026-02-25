import uvicorn
from fastapi import FastAPI, Form, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

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

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/analyze", response_model=ThreatReport)
async def analyze_endpoint(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Endpoint to analyze either pasted text or an uploaded .eml file.
    """
    content_to_analyze = ""
    sender = "Unknown"
    
    if file:
        raw_content = (await file.read()).decode("utf-8", errors="ignore")
        parsed = parse_raw_email(raw_content)
        content_to_analyze = f"Headers:\nFrom: {parsed.sender}\nTo: {parsed.recipient}\nSubject: {parsed.subject}\n\nBody:\n{parsed.body}"
        sender = parsed.sender
    elif text:
        content_to_analyze = text
        # Try to do a basic extraction if they just pasted headers + body
        if "From:" in text:
            try:
                sender = text.split("From:")[1].split("\n")[0].strip()
            except Exception:
                pass
    else:
        raise HTTPException(status_code=400, detail="Must provide either text or file")

    # Pass to the orchestration service
    report = await analyze_content(content_to_analyze, sender)
    return report

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
