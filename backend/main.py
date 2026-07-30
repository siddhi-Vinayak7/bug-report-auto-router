from collections import Counter
from contextlib import asynccontextmanager
import sys
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Add classifier directory to Python path so we can import predict_module and predict_severity
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
CLASSIFIER_DIR = PROJECT_DIR / "classifier"

if str(CLASSIFIER_DIR) not in sys.path:
    sys.path.insert(0, str(CLASSIFIER_DIR))

from module_classifier import predict_module, get_top_contributing_words as get_module_reason_words
from severity_classifier import predict_severity, get_top_contributing_words as get_severity_reason_words
from database import Correction, Report, create_tables, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="Bug Report Auto-Router API", lifespan=lifespan)

# CORS middleware enabling specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bug-report-auto-router.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODULE_TEAM_MAP = {
    "Auth": "Identity & Access Team",
    "Chat": "Messaging Team",
    "Tasks": "Workflow Team",
    "Profile": "Account Team",
    "Payments": "Billing Team",
    "Other": "General Engineering",
}


# Pydantic Schemas
class TriageRequest(BaseModel):
    report_text: str = Field(..., max_length=2000)


class TriageResponse(BaseModel):
    report_id: int
    module: str
    severity: str
    module_confidence: float
    severity_confidence: float
    module_reason_words: list[str] = Field(default_factory=list)
    severity_reason_words: list[str] = Field(default_factory=list)
    routed_team: str = "General Engineering"
    low_confidence_flag: bool = False


class CorrectionRequest(BaseModel):
    report_id: int
    original_module: str
    corrected_module: Optional[str] = None
    original_severity: str
    corrected_severity: Optional[str] = None


class CorrectionResponse(BaseModel):
    status: str = "saved"
    correction_id: int


# Endpoints
@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Bug Report Auto-Router API is running",
        "endpoints": ["/api/health", "/api/triage", "/api/correct"],
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/triage", response_model=TriageResponse)
def triage_report(payload: TriageRequest, db: Session = Depends(get_db)):
    text = payload.report_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="report_text cannot be empty")

    if len(text) < 10:
        raise HTTPException(
            status_code=400,
            detail="Bug report is too short to classify meaningfully — please provide more detail.",
        )

    cleaned_chars = [c for c in text.lower() if not c.isspace()]
    if cleaned_chars:
        most_common_freq = Counter(cleaned_chars).most_common(1)[0][1] / len(cleaned_chars)
        is_highly_repetitive = most_common_freq > 0.70
    else:
        is_highly_repetitive = False

    if is_highly_repetitive:
        raise HTTPException(
            status_code=400,
            detail="This doesn't look like a valid bug report — please describe the issue in plain language.",
        )

    module_pred, module_conf = predict_module(text)
    severity_pred, severity_conf = predict_severity(text)
    module_reasons = get_module_reason_words(text, top_n=3)
    severity_reasons = get_severity_reason_words(text, top_n=3)
    routed_team = MODULE_TEAM_MAP.get(module_pred, "General Engineering")
    low_confidence_flag = bool(module_conf < 0.15 and severity_conf < 0.15)

    db_report = Report(
        report_text=text,
        predicted_module=module_pred,
        predicted_severity=severity_pred,
        module_confidence=module_conf,
        severity_confidence=severity_conf,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return TriageResponse(
        report_id=db_report.id,
        module=db_report.predicted_module,
        severity=db_report.predicted_severity,
        module_confidence=db_report.module_confidence,
        severity_confidence=db_report.severity_confidence,
        module_reason_words=module_reasons,
        severity_reason_words=severity_reasons,
        routed_team=routed_team,
        low_confidence_flag=low_confidence_flag,
    )


@app.post("/api/correct", response_model=CorrectionResponse)
def log_correction(payload: CorrectionRequest, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == payload.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="report_id not found")

    db_correction = Correction(
        report_id=payload.report_id,
        original_module=payload.original_module,
        corrected_module=payload.corrected_module,
        original_severity=payload.original_severity,
        corrected_severity=payload.corrected_severity,
    )
    db.add(db_correction)
    db.commit()
    db.refresh(db_correction)

    return CorrectionResponse(
        status="saved",
        correction_id=db_correction.id,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
