# Bug Report Auto-Router

Multi-label classifier system that predicts **module** and **severity** for free-text bug reports, with explainability, department routing, and human-correction logging.

## Live Application & Links
- **Frontend App**: [bug-report-auto-router.vercel.app](https://bug-report-auto-router.vercel.app)
- **Backend API**: [bug-report-auto-router.onrender.com](https://bug-report-auto-router.onrender.com)
- **Accuracy Report**: [docs/ACCURACY_REPORT.md](docs/ACCURACY_REPORT.md)

## Status
- [x] Dataset created (100 training reports, 20 locked test reports)
- [x] Test set locked
- [x] Classifiers built + evaluated
- [x] Backend API (`/api/triage`, `/api/correct`, `/api/health`)
- [x] Frontend form & prediction panel
- [x] Deployment
- [x] Accuracy report

## Features
- **Module & Severity Prediction**: Predicts module (`Auth`, `Chat`, `Tasks`, `Profile`, `Payments`, `Other`) and severity (`Critical`, `Major`, `Minor`) from free-text bug descriptions.
- **Confidence Calibration**: Displays exact model confidence scores for both predictions.
- **Explainability**: Extracts and displays the top 3 signal words/n-grams driving each prediction based on TF-IDF weights and Logistic Regression model coefficients.
- **Department Routing**: Automatically maps predictions to owning engineering teams (Identity & Access, Messaging, Workflow, Account, Billing, General Engineering).
- **Input Validity & Safety Heuristics**: Rejects inputs under 10 characters or gibberish with character repetition >70%; flags low-confidence predictions for manual review.
- **Active Learning Feedback Loop**: Allows engineers to confirm or override predictions, logging human corrections to PostgreSQL for future retraining.
- **Model Evaluation**: Comprehensive benchmarking including alternative SVM comparison in [docs/ACCURACY_REPORT.md](docs/ACCURACY_REPORT.md).

## Structure
- `data/` — Labeled bug report dataset (`bug_reports_train.csv` and locked `bug_reports_test.csv`)
- `classifier/` — Module & severity Logistic Regression classifiers, `explainability.py` module, SVM baseline comparisons, and `evaluate.py`
- `backend/` — FastAPI web service, SQLAlchemy database models, and PostgreSQL connection setup
- `frontend/` — React SPA with Tailwind CSS, Vite, Triage form, and interactive prediction panel
- `docs/` — Accuracy report and documentation