from pathlib import Path
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from module_classifier import predict_module
from severity_classifier import predict_severity

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
TEST_DATA_PATH = PROJECT_DIR / "data" / "bug_reports_test.csv"

# Configure Pandas display options for complete confusion matrix outputs
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 1000)



def evaluate_models():
    if not TEST_DATA_PATH.exists():
        raise FileNotFoundError(f"Test data file not found at {TEST_DATA_PATH}")

    test_df = pd.read_csv(TEST_DATA_PATH)

    # Make predictions on held-out test set
    module_preds = []
    module_confs = []
    severity_preds = []
    severity_confs = []

    for text in test_df["report_text"]:
        mod_label, mod_conf = predict_module(text)
        sev_label, sev_conf = predict_severity(text)
        
        module_preds.append(mod_label)
        module_confs.append(mod_conf)
        severity_preds.append(sev_label)
        severity_confs.append(sev_conf)

    # Compute metrics
    y_true_module = test_df["module"]
    y_true_severity = test_df["severity"]

    module_acc = accuracy_score(y_true_module, module_preds) * 100
    severity_acc = accuracy_score(y_true_severity, severity_preds) * 100

    print("=" * 60)
    print("EVALUATION RESULTS ON HELD-OUT TEST SET (20 SAMPLES)")
    print("=" * 60)

    print(f"\na. Overall Accuracy (Module): {module_acc:.2f}%")
    print(f"b. Overall Accuracy (Severity): {severity_acc:.2f}%")

    print("\n" + "=" * 60)
    print("c. PER-CLASS BREAKDOWN & CONFUSION MATRIX: MODULE")
    print("=" * 60)
    module_labels = sorted(list(set(y_true_module).union(set(module_preds))))
    print("\nClassification Report (Module):")
    print(classification_report(y_true_module, module_preds, zero_division=0))
    print("Confusion Matrix (Module):")
    cm_module = pd.DataFrame(
        confusion_matrix(y_true_module, module_preds, labels=module_labels),
        index=[f"True_{l}" for l in module_labels],
        columns=[f"Pred_{l}" for l in module_labels]
    )
    print(cm_module)

    print("\n" + "=" * 60)
    print("c. PER-CLASS BREAKDOWN & CONFUSION MATRIX: SEVERITY")
    print("=" * 60)
    severity_labels = sorted(list(set(y_true_severity).union(set(severity_preds))))
    print("\nClassification Report (Severity):")
    print(classification_report(y_true_severity, severity_preds, zero_division=0))
    print("Confusion Matrix (Severity):")
    cm_severity = pd.DataFrame(
        confusion_matrix(y_true_severity, severity_preds, labels=severity_labels),
        index=[f"True_{l}" for l in severity_labels],
        columns=[f"Pred_{l}" for l in severity_labels]
    )
    print(cm_severity)

    print("\n" + "=" * 60)
    print("d. ACCURACY COMPARISON")
    print("=" * 60)
    if module_acc < severity_acc:
        print(f"Field with lower accuracy: module ({module_acc:.2f}% vs {severity_acc:.2f}%)")
    elif severity_acc < module_acc:
        print(f"Field with lower accuracy: severity ({severity_acc:.2f}% vs {module_acc:.2f}%)")
    else:
        print(f"Both fields had equal accuracy ({module_acc:.2f}% vs {severity_acc:.2f}%)")
    print("=" * 60)


if __name__ == "__main__":
    evaluate_models()
