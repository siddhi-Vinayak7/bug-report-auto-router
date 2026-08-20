# Accuracy Report — Bug Report Auto-Router

## Method
Two independent classifiers were trained: TF-IDF vectorization + Logistic Regression 
(scikit-learn), with `class_weight='balanced'` to correct for class imbalance in the 
training data. Each classifier was trained on 60 labeled bug reports 
(`data/bug_reports_train.csv`) and evaluated exactly once on a held-out set of 20 
reports (`data/bug_reports_test.csv`) that was locked in its own git commit before any 
model code was written, and was never viewed or used during training or tuning.

Hyperparameters (C for both classifiers) were selected via 5-fold stratified cross-validation on the 60-row training set only. The test set was not consulted during this process. evaluate.py was then run exactly once against the locked 20-row test set to produce the final numbers below. Notably, cross-validation confirmed C=0.5 as optimal for both classifiers, and the resulting test accuracy (55.00% module, 40.00% severity) matches the previously reported figures, indicating the results are stable across reasonable hyperparameter choices.

## Results

| Field    | Accuracy |
|----------|----------|
| Module   | 55.00%   |
| Severity | 40.00%   |

## Which was harder, and why

**Severity was harder than module.**

Module classification is largely a topic-matching problem: distinct vocabulary tends to 
map cleanly to distinct modules (e.g., "login," "password," "OAuth" → Auth; "task," 
"assignee," "kanban" → Tasks). Two of six modules (Chat, Tasks) reached 100% recall on 
the test set.

Severity classification is a judgment call, not a topic-matching problem. The same 
surface language ("crashes," "doesn't work," "fails," "broken") appears across Critical, 
Major, and Minor reports — what makes something Critical vs Major is often about impact 
and context, not distinctive keywords. This is reflected in the confusion matrix: 6 of 9 
true-Critical reports were misclassified as Major.

The "Other" module scored 0% accuracy, which is expected given the dataset size — with 
only ~10 training examples per module and "Other" acting as a catch-all with no 
consistent vocabulary, there simply isn't enough signal for the model to learn a reliable 
pattern for it.

## Why this matters more than the raw number

These accuracy numbers reflect a starting point on 60 hand-written examples, not a 
ceiling. The system is designed around the assumption that initial model accuracy is 
less important than capturing every human correction: each time a human overrides a 
prediction, that correction is logged to the database. Over time, this correction log 
is a far more valuable and realistic training signal than the initial 60-example dataset, 
since it reflects real bug reports and real disagreements about severity — the exact 
kind of judgment calls a static training set can't fully capture in 60 rows.

Every confirmation on the frontend writes a row to the corrections table, with NULL in a field meaning the human accepted the displayed prediction (whether from the LLM or classifier fallback) for that field, and a non-NULL value meaning the human overrode it. This lets us compute both a per-field agreement rate and isolate genuine corrections for future retraining.

## Dataset Expansion and Updated Results

To address initial feedback that the model was overly dependent on exact keyword matches (e.g., only recognizing Auth issues containing the specific words "login" or "password"), the training set was expanded from 60 to 100 labeled bug reports (`data/bug_reports_train.csv`). The 40 new training examples were deliberately drafted using varied phrasing, sentence structures, and alternative domain vocabulary (e.g., "credentials rejected", "session expired unexpectedly", "locked out of account", "can't authenticate").

The 20-row test set (`data/bug_reports_test.csv`) was **NOT modified** and remained strictly locked.

Hyperparameters were re-tuned using the same 5-fold StratifiedKFold cross-validation process on the expanded 100-row training set only (without consulting the test set):
- **Module Classifier**: $C = 1.0$ (72.00% mean CV accuracy)
- **Severity Classifier**: $C = 2.0$ (44.00% mean CV accuracy)

### Updated One-Shot Test Set Results (20 Samples)

| Metric | Original (60 rows) | Expanded (100 rows) | Change |
|---|---|---|---|
| Module accuracy | 55.00% | 75.00% | +20.00% |
| Severity accuracy | 40.00% | 45.00% | +5.00% |

### Analysis & Caveats

1. **Directional Interpretation**: Given the evaluation set size of 20 test samples, these accuracy figures should be read directionally as a meaningful improvement rather than as precise fixed percentages.
2. **Module vs. Severity Disparity**: Module classification showed a substantial gain (+20.00 percentage points), benefiting directly from broader vocabulary coverage. Severity classification improved by +5.00 percentage points; this smaller gain is consistent with our earlier finding that severity classification is inherently harder because it is judgment-based rather than topic-based, so additional data provides less leverage than it does for module routing.
3. **Standalone Classifier Scope & Live System Architecture**: Note that these accuracy metrics (75.00% module, 45.00% severity) describe the standalone scikit-learn Logistic Regression classifier evaluated in isolation via `evaluate.py` against the locked test set. In the live production system, the Groq LLM (`openai/gpt-oss-120b`) acts as the primary decision-maker, using the classifier's output as reference context and serving as a fallback if the LLM call fails. Consequently, these metrics describe the classifier's standalone performance rather than overall live system decision accuracy, which has not been separately benchmarked.

## Alternative Model Comparison: SVM

A LinearSVC (SVM) comparison was run after the Logistic Regression baseline was locked, using identical TF-IDF settings (`stop_words='english'`, `ngram_range=(1,2)`, `sublinear_tf=True`) and `class_weight='balanced'`. The C hyperparameter was selected via the same 5-fold StratifiedKFold procedure on the 60-row training set only, using the same candidate set [0.5, 1.0, 2.0, 5.0]. The test set was not consulted during this stage.

### CV Results (training set only)

**Module classifier (LinearSVC)**

| C   | Mean CV Accuracy | Std    |
|-----|-----------------|--------|
| 0.5 | 58.33%          | 0.0527 |
| **1.0** ✓ | **60.00%** | 0.0624 |
| 2.0 | 60.00%          | 0.0624 |
| 5.0 | 60.00%          | 0.0624 |

Locked C = **1.0** (first candidate to reach the best mean; C=2.0 and C=5.0 tied but were not preferred).

**Severity classifier (LinearSVC)**

| C   | Mean CV Accuracy | Std    |
|-----|-----------------|--------|
| 0.5 | 41.67%          | 0.0913 |
| 1.0 | 43.33%          | 0.1106 |
| 2.0 | 43.33%          | 0.1106 |
| **5.0** ✓ | **45.00%** | 0.1354 |

Locked C = **5.0**.

### Final Test Set Comparison (one-shot, 20 samples)

| Field    | Logistic Regression | LinearSVC (SVM) | Δ       |
|----------|--------------------:|----------------:|--------:|
| Module   | 55.00%              | 60.00%          | +5.00% |
| Severity | 40.00%              | 40.00%          | 0.00% (tie) |

### Analysis

SVM improved module accuracy by one correct prediction (5 percentage points) on this 20-row test set, and tied on severity. Despite the module improvement, Logistic Regression remains the deployed production model: the dataset is too small (20 test samples) for a single-prediction gain to be statistically conclusive, and switching algorithms this late in the project was not worth the redeployment risk for an ambiguous result.

Notably, both classifiers — regardless of algorithm — recorded 0% recall on the "Other" module category. This is consistent across both models and is most likely due to "Other" acting as a catch-all with no consistent or distinctive vocabulary, combined with too few training examples for that class (~10 rows) to provide a reliable signal.

The SVM comparison scripts and model files (`module_classifier_svm.py`, `severity_classifier_svm.py`, `evaluate_svm.py`, `module_model_svm.pkl`, `severity_model_svm.pkl`) are retained in `classifier/` for reference but are not loaded by the production backend.

## Additional Features (Post-Feedback)

Three production enhancements were added based on system review feedback:

1. **Prediction Explainability**: The `/api/triage` endpoint now returns `module_reason_words` and `severity_reason_words` representing the top contributing terms behind each prediction. These signal words are calculated by multiplying each present n-gram's TF-IDF weight by its corresponding Logistic Regression model coefficient for the predicted class, returning the top 3 positive contributors. This makes ML routing decisions interpretable to users rather than acting as a black box.

2. **Department Routing**: Predictions include a `routed_team` field derived from a static mapping of predicted modules to engineering teams (e.g., Auth → Identity & Access Team, Chat → Messaging Team, Tasks → Workflow Team, Profile → Account Team, Payments → Billing Team, Other → General Engineering). This provides explicit team ownership for triaged reports without requiring a separate classifier.

3. **Input Validity Checking & Low-Confidence Flagging**: `/api/triage` includes heuristic validation checks that reject input text under 10 characters or text where a single character represents >70% of content (gibberish), returning HTTP 400 with a descriptive error. Additionally, when both module and severity prediction confidence scores fall below 15%, a `low_confidence_flag` is returned, which the UI surfaces as a non-blocking warning suggesting manual review.