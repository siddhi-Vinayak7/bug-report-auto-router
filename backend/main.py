from collections import Counter
from contextlib import asynccontextmanager
import os
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

VALID_MODULES = {"Auth", "Chat", "Tasks", "Profile", "Payments", "Other"}
VALID_SEVERITIES = {"Critical", "Major", "Minor"}


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
    decision_source: str = "llm"


class CorrectionRequest(BaseModel):
    report_id: int
    original_module: str
    corrected_module: Optional[str] = None
    original_severity: str
    corrected_severity: Optional[str] = None


class CorrectionResponse(BaseModel):
    status: str = "saved"
    correction_id: int


class SuggestFixRequest(BaseModel):
    report_text: str = Field(..., max_length=2000)
    module: str
    severity: str


class SuggestFixResponse(BaseModel):
    suggestion: str


# Endpoints
@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Bug Report Auto-Router API is running",
        "endpoints": ["/api/health", "/api/triage", "/api/correct", "/api/suggest-fix"],
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

    # 1. Run classifier baseline (reference signal)
    module_pred, module_conf = predict_module(text)
    severity_pred, severity_conf = predict_severity(text)
    module_reasons = get_module_reason_words(text, top_n=3)
    severity_reasons = get_severity_reason_words(text, top_n=3)
    low_confidence_flag = bool(module_conf < 0.15 and severity_conf < 0.15)

    # 2. LLM Decision with Classifier Fallback
    final_module = module_pred
    final_severity = severity_pred
    decision_source = "classifier_fallback"

    api_key = os.environ.get("GROQ_API_KEY")
    if api_key:
        try:
            from groq import Groq

            client = Groq(api_key=api_key)
            prompt = (
                f"You are an AI triage assistant for an engineering bug tracking system.\n"
                f"Review the bug report below and make the final decision on the MODULE and SEVERITY.\n\n"
                f"Bug Report Text: {text}\n\n"
                f"Reference Signal (from ML Classifier):\n"
                f"- Suggested Module: {module_pred} (confidence: {module_conf:.2%})\n"
                f"- Suggested Severity: {severity_pred} (confidence: {severity_conf:.2%})\n\n"
                f"Allowed Modules (choose exactly one): Auth, Chat, Tasks, Profile, Payments, Other\n"
                f"Allowed Severities (choose exactly one): Critical, Major, Minor\n\n"
                f"If you disagree with the classifier's suggestion, use your own judgment based on the bug report text.\n\n"
                f"Respond ONLY in the following strict two-line format and nothing else:\n"
                f"MODULE: <one of the 6 exact values>\n"
                f"SEVERITY: <one of the 3 exact values>"
            )

            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=60,
            )

            raw_response = completion.choices[0].message.content.strip()
            parsed_module = None
            parsed_severity = None

            for line in raw_response.splitlines():
                line_str = line.strip()
                if line_str.startswith("MODULE:"):
                    parsed_module = line_str.split("MODULE:", 1)[1].strip()
                elif line_str.startswith("SEVERITY:"):
                    parsed_severity = line_str.split("SEVERITY:", 1)[1].strip()

            if parsed_module in VALID_MODULES and parsed_severity in VALID_SEVERITIES:
                final_module = parsed_module
                final_severity = parsed_severity
                decision_source = "llm"
            else:
                print(f"[Triage Fallback] Invalid or unparseable LLM output: module={parsed_module}, severity={parsed_severity}. Raw: {raw_response}")
        except Exception as e:
            print(f"[Triage Fallback] Groq LLM API call failed or timed out: {e}")
    else:
        print("[Triage Fallback] GROQ_API_KEY not found. Using classifier predictions.")

    routed_team = MODULE_TEAM_MAP.get(final_module, "General Engineering")

    db_report = Report(
        report_text=text,
        predicted_module=final_module,
        predicted_severity=final_severity,
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
        decision_source=decision_source,
    )


@app.post("/api/correct", response_model=CorrectionResponse)
def log_correction(payload: CorrectionRequest, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == payload.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="report_id not found")

    # Normalize redundant non-null values to None (SQL NULL) if they equal original values
    corrected_module = payload.corrected_module
    if corrected_module == payload.original_module:
        corrected_module = None

    corrected_severity = payload.corrected_severity
    if corrected_severity == payload.original_severity:
        corrected_severity = None

    db_correction = Correction(
        report_id=payload.report_id,
        original_module=payload.original_module,
        corrected_module=corrected_module,
        original_severity=payload.original_severity,
        corrected_severity=corrected_severity,
    )
    db.add(db_correction)
    db.commit()
    db.refresh(db_correction)

    return CorrectionResponse(
        status="saved",
        correction_id=db_correction.id,
    )


@app.post("/api/suggest-fix", response_model=SuggestFixResponse)
def suggest_fix(payload: SuggestFixRequest):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI suggestion feature is not configured",
        )

    try:
        from groq import Groq

        client = Groq(api_key=api_key)
        prompt = (
            f"You are an expert software engineer reviewing a triaged bug report.\n"
            f"Bug Report Text: {payload.report_text}\n"
            f"Predicted Module: {payload.module}\n"
            f"Severity: {payload.severity}\n\n"
            f"Provide a brief (2-3 sentence) suggested next step or diagnostic approach for an engineer investigating this bug. "
            f"Be concise, practical, and direct. Do not invent specific technical details that cannot be known (such as exact file names or line numbers). "
            f"Acknowledge if more information or reproducing steps are needed."
        )

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200,
        )

        suggestion_text = completion.choices[0].message.content.strip()
        return SuggestFixResponse(suggestion=suggestion_text)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="AI suggestion temporarily unavailable, please try again",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
