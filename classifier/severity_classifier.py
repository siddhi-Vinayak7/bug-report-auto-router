import os
from pathlib import Path
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# Base paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
TRAIN_DATA_PATH = PROJECT_DIR / "data" / "bug_reports_train.csv"
MODEL_PATH = BASE_DIR / "severity_model.pkl"

_cached_pipeline = None


from explainability import extract_top_contributing_words


def load_severity_model(model_path: Path = MODEL_PATH) -> Pipeline:
    global _cached_pipeline
    if _cached_pipeline is not None:
        return _cached_pipeline
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}. Train the model first.")
    _cached_pipeline = joblib.load(model_path)
    return _cached_pipeline


def train_severity_model(train_csv_path: Path = TRAIN_DATA_PATH, model_save_path: Path = MODEL_PATH) -> Pipeline:
    df = pd.read_csv(train_csv_path)
    X = df["report_text"].fillna("")
    y = df["severity"]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)),
        ("clf", LogisticRegression(C=0.5, max_iter=1000, random_state=42, class_weight="balanced"))
    ])

    pipeline.fit(X, y)
    joblib.dump(pipeline, model_save_path)
    print(f"Severity model successfully trained and saved to {model_save_path}")
    return pipeline


def predict_severity(text: str) -> tuple[str, float]:
    """
    Predicts the severity label and returns (predicted_label, confidence_score)
    where confidence is the model's max predict_proba value.
    """
    pipeline = load_severity_model()
    probabilities = pipeline.predict_proba([text])[0]
    classes = pipeline.classes_
    
    max_idx = probabilities.argmax()
    predicted_label = str(classes[max_idx])
    confidence_score = float(probabilities[max_idx])
    
    return predicted_label, confidence_score


def get_top_contributing_words(text: str, top_n: int = 3) -> list[str]:
    """
    Returns top N words/n-grams contributing positively to the severity prediction.
    """
    pipeline = load_severity_model()
    return extract_top_contributing_words(pipeline, text, top_n=top_n)



if __name__ == "__main__":
    train_severity_model()
