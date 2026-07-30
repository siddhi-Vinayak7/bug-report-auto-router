from sklearn.pipeline import Pipeline


def extract_top_contributing_words(pipeline: Pipeline, text: str, top_n: int = 3) -> list[str]:
    """
    Calculates top contributing words/n-grams for the predicted class of input text
    using feature TF-IDF values multiplied by LogisticRegression coefficients.
    """
    if not text or not text.strip():
        return []

    tfidf = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]

    vec = tfidf.transform([text])
    feature_names = tfidf.get_feature_names_out()

    nonzero_indices = vec.indices
    nonzero_data = vec.data

    if len(nonzero_indices) == 0:
        return []

    probabilities = pipeline.predict_proba([text])[0]
    predicted_class_idx = probabilities.argmax()

    classes = clf.classes_
    if len(classes) == 2:
        coefs = clf.coef_[0] if predicted_class_idx == 1 else -clf.coef_[0]
    else:
        coefs = clf.coef_[predicted_class_idx]

    contributions = []
    for feat_idx, tfidf_val in zip(nonzero_indices, nonzero_data):
        score = float(tfidf_val * coefs[feat_idx])
        if score > 0:
            contributions.append((str(feature_names[feat_idx]), score))

    contributions.sort(key=lambda item: item[1], reverse=True)
    return [word for word, _ in contributions[:top_n]]
