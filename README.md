# Bug Report Auto-Router

Multi-label bug triage system featuring an **LLM-primary decision architecture** (Groq `openai/gpt-oss-120b`) backed by a TF-IDF + Logistic Regression classifier for context and fallback, with explainability, department routing, and active learning correction logging.

## Live Application & Links
- **Frontend App**: [bug-report-auto-router.vercel.app](https://bug-report-auto-router.vercel.app)
- **Backend API**: [bug-report-auto-router.onrender.com](https://bug-report-auto-router.onrender.com)
- **Accuracy Report**: [docs/ACCURACY_REPORT.md](docs/ACCURACY_REPORT.md)

## Status
- [x] Dataset created (100 training reports, 20 locked test reports)
- [x] Test set locked
- [x] Classifiers built + evaluated
- [x] Backend API (`/api/triage`, `/api/correct`, `/api/suggest-fix`, `/api/health`)
- [x] Frontend form & prediction panel
- [x] Deployment
- [x] Accuracy report

## Triage Architecture & Decision Flow

The `/api/triage` endpoint combines lightweight machine learning with LLM decision making:

1. **Classifier Reference Signal**: The scikit-learn TF-IDF + Logistic Regression classifier evaluates the report text first, generating candidate module/severity predictions, confidence calibration scores, and key signal words.
2. **LLM Primary Decision**: The original report text and the classifier's predictions (framed as a reference signal) are sent to the Groq API (`openai/gpt-oss-120b`). If the LLM returns a valid module and severity, its response becomes the final decision (`decision_source: "llm"`).
3. **Graceful Classifier Fallback**: If the Groq API call fails, times out, is unconfigured, or returns unparseable output, the system seamlessly uses the classifier's own prediction as the final decision (`decision_source: "classifier_fallback"`).

## Features
- **LLM-Primary Module & Severity Prediction**: Evaluates module (`Auth`, `Chat`, `Tasks`, `Profile`, `Payments`, `Other`) and severity (`Critical`, `Major`, `Minor`) using Groq `openai/gpt-oss-120b` with classifier context.
- **Classifier Confidence & Signal Words**: Displays exact classifier certainty scores and extracts top 3 contributing n-grams using model coefficients.
- **Department Routing**: Automatically routes triaged reports to owning engineering teams based on the final decided module.
- **Input Validity & Safety Heuristics**: Rejects inputs under 10 characters or gibberish with character repetition >70%; flags low-confidence predictions for manual review.
- **Optional AI Fix Suggestions**: On-demand diagnostic advice for investigating reports via dedicated Groq endpoint (`/api/suggest-fix`).
- **Active Learning Feedback Loop**: Logs human confirmations and overrides to PostgreSQL, storing normalized NULL entries when predictions are accepted.
- **Model Evaluation**: Comprehensive baseline evaluation and SVM comparison documented in [docs/ACCURACY_REPORT.md](docs/ACCURACY_REPORT.md).

## Structure
- `data/` — Labeled bug report dataset (`bug_reports_train.csv` and locked `bug_reports_test.csv`)
- `classifier/` — Module & severity Logistic Regression classifiers, `explainability.py` module, SVM baseline comparisons, and `evaluate.py`
- `backend/` — FastAPI web service, SQLAlchemy database models, and PostgreSQL connection setup
- `frontend/` — React SPA with Tailwind CSS, Vite, Triage form, and interactive prediction panel
- `docs/` — Accuracy report and documentation