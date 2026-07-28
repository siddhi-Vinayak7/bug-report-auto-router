"""
evaluate_svm.py
---------------
Evaluates the SVM module and severity classifiers against the locked
held-out test set (data/bug_reports_test.csv).

This is a copy of evaluate.py adapted for the SVM models. It does NOT
modify evaluate.py or the existing .pkl files.

Run this script ONCE against the test set. CV-based model selection
is handled entirely within module_classifier_svm.py / severity_classifier_svm.py.
"""

import sys
from pathlib import Path
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# ---------------------------------------------------------------------------
# Make classifier/ importable when running as a script from any CWD
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from module_classifier_svm import predict_module_svm, train_module_svm, MODEL_PATH as MODULE_MODEL_PATH
from severity_classifier_svm import predict_severity_svm, train_severity_svm, MODEL_PATH as SEVERITY_MODEL_PATH

PROJECT_DIR = BASE_DIR.parent
TEST_DATA_PATH = PROJECT_DIR / "data" / "bug_reports_test.csv"

# Logistic Regression baseline (locked results from ACCURACY_REPORT.md)
LR_MODULE_ACC = 55.00
LR_SEVERITY_ACC = 40.00

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 1000)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_models_trained() -> None:
    """Train SVM models if their .pkl files do not yet exist."""
    if not MODULE_MODEL_PATH.exists():
        print("Module SVM model not found -- training now...\n")
        train_module_svm()
        print()
    if not SEVERITY_MODEL_PATH.exists():
        print("Severity SVM model not found -- training now...\n")
        train_severity_svm()
        print()


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate_svm_models() -> None:
    if not TEST_DATA_PATH.exists():
        raise FileNotFoundError(f"Test data file not found at {TEST_DATA_PATH}")

    _ensure_models_trained()

    test_df = pd.read_csv(TEST_DATA_PATH)

    module_preds = []
    severity_preds = []

    for text in test_df["report_text"]:
        module_preds.append(predict_module_svm(text))
        severity_preds.append(predict_severity_svm(text))

    y_true_module = test_df["module"]
    y_true_severity = test_df["severity"]

    module_acc = accuracy_score(y_true_module, module_preds) * 100
    severity_acc = accuracy_score(y_true_severity, severity_preds) * 100

    # ------------------------------------------------------------------
    # Results header
    # ------------------------------------------------------------------
    print()
    print("=" * 60)
    print("SVM EVALUATION RESULTS ON HELD-OUT TEST SET (20 SAMPLES)")
    print("=" * 60)
    print(f"\na. Overall Accuracy (Module):   {module_acc:.2f}%")
    print(f"b. Overall Accuracy (Severity): {severity_acc:.2f}%")

    # ------------------------------------------------------------------
    # Per-class breakdown: Module
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("c. PER-CLASS BREAKDOWN & CONFUSION MATRIX: MODULE")
    print("=" * 60)
    module_labels = sorted(set(y_true_module) | set(module_preds))
    print("\nClassification Report (Module):")
    print(classification_report(y_true_module, module_preds, zero_division=0))
    print("Confusion Matrix (Module):")
    cm_module = pd.DataFrame(
        confusion_matrix(y_true_module, module_preds, labels=module_labels),
        index=[f"True_{l}" for l in module_labels],
        columns=[f"Pred_{l}" for l in module_labels],
    )
    print(cm_module)

    # ------------------------------------------------------------------
    # Per-class breakdown: Severity
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("d. PER-CLASS BREAKDOWN & CONFUSION MATRIX: SEVERITY")
    print("=" * 60)
    severity_labels = sorted(set(y_true_severity) | set(severity_preds))
    print("\nClassification Report (Severity):")
    print(classification_report(y_true_severity, severity_preds, zero_division=0))
    print("Confusion Matrix (Severity):")
    cm_severity = pd.DataFrame(
        confusion_matrix(y_true_severity, severity_preds, labels=severity_labels),
        index=[f"True_{l}" for l in severity_labels],
        columns=[f"Pred_{l}" for l in severity_labels],
    )
    print(cm_severity)

    # ------------------------------------------------------------------
    # Head-to-head comparison vs Logistic Regression baseline
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("e. HEAD-TO-HEAD: SVM vs LOGISTIC REGRESSION")
    print("=" * 60)
    print(f"{'Field':<12} {'Logistic Regression':>20} {'LinearSVC (SVM)':>17} {'Delta':>8}")
    print("-" * 60)

    mod_delta = module_acc - LR_MODULE_ACC
    sev_delta = severity_acc - LR_SEVERITY_ACC

    mod_arrow = f"+{mod_delta:.2f}%" if mod_delta >= 0 else f"{mod_delta:.2f}%"
    sev_arrow = f"+{sev_delta:.2f}%" if sev_delta >= 0 else f"{sev_delta:.2f}%"

    print(f"{'Module':<12} {LR_MODULE_ACC:>19.2f}% {module_acc:>16.2f}% {mod_arrow:>8}")
    print(f"{'Severity':<12} {LR_SEVERITY_ACC:>19.2f}% {severity_acc:>16.2f}% {sev_arrow:>8}")
    print("=" * 60)

    winner_mod = "SVM" if module_acc > LR_MODULE_ACC else ("LR" if LR_MODULE_ACC > module_acc else "TIE")
    winner_sev = "SVM" if severity_acc > LR_SEVERITY_ACC else ("LR" if LR_SEVERITY_ACC > severity_acc else "TIE")
    print(f"  Module winner:   {winner_mod}")
    print(f"  Severity winner: {winner_sev}")
    print("=" * 60)
    print("\nTest set evaluation complete. Awaiting your decision.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    evaluate_svm_models()
