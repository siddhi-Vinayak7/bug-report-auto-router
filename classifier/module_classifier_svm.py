"""
module_classifier_svm.py
------------------------
SVM-based module classifier. Mirrors module_classifier.py but uses
LinearSVC instead of LogisticRegression.

Intended only for comparison -- does NOT overwrite module_model.pkl or
modify any existing file. Saves its own model to module_model_svm.pkl.
"""

from pathlib import Path
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.model_selection import StratifiedKFold, cross_val_score

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
TRAIN_DATA_PATH = PROJECT_DIR / "data" / "bug_reports_train.csv"
MODEL_PATH = BASE_DIR / "module_model_svm.pkl"

# Candidate C values -- same set used for Logistic Regression tuning
C_CANDIDATES = [0.5, 1.0, 2.0, 5.0]
CV_FOLDS = 5
RANDOM_STATE = 42

_cached_pipeline = None


# ---------------------------------------------------------------------------
# CV tuning (train set only)
# ---------------------------------------------------------------------------

def tune_module_svm(train_csv_path: Path = TRAIN_DATA_PATH) -> float:
    """
    Runs 5-fold StratifiedKFold CV over C_CANDIDATES on the training set.
    Prints CV results and returns the best C value.
    """
    df = pd.read_csv(train_csv_path)
    X = df["report_text"].fillna("")
    y = df["module"]

    skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    print("=" * 60)
    print("MODULE CLASSIFIER -- SVM (LinearSVC) -- CV RESULTS")
    print(f"(5-fold StratifiedKFold on {len(df)}-row training set)")
    print("=" * 60)

    best_c = None
    best_mean = -1.0

    for c in C_CANDIDATES:
        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                sublinear_tf=True,
            )),
            ("clf", LinearSVC(C=c, max_iter=5000, random_state=RANDOM_STATE,
                              class_weight="balanced")),
        ])
        scores = cross_val_score(pipeline, X, y, cv=skf, scoring="accuracy")
        mean_score = scores.mean()
        std_score = scores.std()
        print(f"  C={c:<5} | mean={mean_score:.4f} | std={std_score:.4f} | "
              f"folds={[f'{s:.4f}' for s in scores]}")
        if mean_score > best_mean:
            best_mean = mean_score
            best_c = c

    print(f"\n  >>> Best C for Module SVM: {best_c}  (CV accuracy: {best_mean:.4f})")
    print("=" * 60)
    return best_c


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_module_svm(
    train_csv_path: Path = TRAIN_DATA_PATH,
    model_save_path: Path = MODEL_PATH,
) -> Pipeline:
    """
    Tunes C via CV, trains the final LinearSVC pipeline on the full training
    set with the chosen C, and saves it to module_model_svm.pkl.
    """
    best_c = tune_module_svm(train_csv_path)

    df = pd.read_csv(train_csv_path)
    X = df["report_text"].fillna("")
    y = df["module"]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            sublinear_tf=True,
        )),
        ("clf", LinearSVC(C=best_c, max_iter=5000, random_state=RANDOM_STATE,
                          class_weight="balanced")),
    ])

    pipeline.fit(X, y)
    joblib.dump(pipeline, model_save_path)
    print(f"\nModule SVM model saved to {model_save_path}")
    return pipeline


# ---------------------------------------------------------------------------
# Loading & prediction
# ---------------------------------------------------------------------------

def load_module_svm_model(model_path: Path = MODEL_PATH) -> Pipeline:
    global _cached_pipeline
    if _cached_pipeline is not None:
        return _cached_pipeline
    if not model_path.exists():
        raise FileNotFoundError(
            f"SVM model not found at {model_path}. "
            "Run train_module_svm() first."
        )
    _cached_pipeline = joblib.load(model_path)
    return _cached_pipeline


def predict_module_svm(text: str) -> str:
    """Returns the predicted module label using the SVM model."""
    pipeline = load_module_svm_model()
    return str(pipeline.predict([text])[0])


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    train_module_svm()
