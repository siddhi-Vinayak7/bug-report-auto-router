# Bug Report Auto-Router

Multi-label classifier that predicts **module** and **severity** for free-text bug reports, with human-correction logging.

## Status
- [ ] Dataset created (80 labeled reports, 60/20 split)
- [ ] Test set locked
- [ ] Classifiers built + evaluated
- [ ] Backend API (/api/triage, /api/correct)
- [ ] Frontend form
- [ ] Deployment
- [ ] Accuracy report

## Structure
- `data/` — labeled dataset, train/test split
- `classifier/` — module + severity classifiers, evaluation script
- `backend/` — API + DB
- `frontend/` — bug report form + prediction panel
- `docs/` — accuracy report, screenshots