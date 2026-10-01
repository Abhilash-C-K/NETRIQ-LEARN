import numpy as np, joblib, json
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, precision_recall_curve
from sklearn.feature_extraction.text import CountVectorizer
import lightgbm as lgb
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Load
data_path = os.path.join(PROJECT_ROOT, "training", "system", "HDFS.npz")
if not os.path.exists(data_path):
    data_path = "HDFS.npz"
print(f"Loading {data_path}...")
data = np.load(data_path, allow_pickle=True)
x_data, y_data = data["x_data"], data["y_data"]

# Convert event sequences to "documents" (space-joined strings) for CountVectorizer
print("Vectorizing sequences...")
sequences = [" ".join(seq) for seq in x_data]

# Build event-count feature matrix (bag-of-events)
# Note: lowercase=False is required because token_pattern=r"E\d+" is uppercase
# dtype=np.float32 is required because LightGBM expects float32/float64 CSR matrix data
vectorizer = CountVectorizer(lowercase=False, token_pattern=r"E\d+", dtype=np.float32)
X = vectorizer.fit_transform(sequences)
y = y_data

# Split: train / validation / test (stratified due to imbalance)
print("Splitting dataset...")
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.3, stratify=y, random_state=42)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42)

# Train with class weighting for the 97/3 imbalance
print("Training base LightGBM model...")
base_model = lgb.LGBMClassifier(
    n_estimators=300, max_depth=8, learning_rate=0.1,
    class_weight="balanced", random_state=42)
base_model.fit(X_train, y_train)

# Calibrate probabilities on validation set
print("Calibrating probabilities...")
try:
    from sklearn.frozen import FrozenEstimator
    model = CalibratedClassifierCV(FrozenEstimator(base_model), method="isotonic")
except ImportError:
    model = CalibratedClassifierCV(base_model, method="isotonic", cv="prefit")
model.fit(X_val, y_val)

# Pick threshold: smallest cutoff where validation precision >= 0.95
print("Selecting threshold...")
probs_val = model.predict_proba(X_val)[:, 1]
prec, rec, thresh = precision_recall_curve(y_val, probs_val)
valid = [(p, t) for p, t in zip(prec, thresh) if p >= 0.95]
best_threshold = min(valid, key=lambda x: x[1])[1] if valid else 0.5

# Evaluate on untouched test set
print("Evaluating on test set...")
probs_test = model.predict_proba(X_test)[:, 1]
preds_test = (probs_test >= best_threshold).astype(int)
print("\n" + classification_report(y_test, preds_test, digits=4))
print("Chosen threshold:", best_threshold)
print("Vocabulary size (event types):", len(vectorizer.vocabulary_))

# Save model + vectorizer + metadata together
joblib.dump(model, os.path.join(MODELS_DIR, "system_logs_LightGBM.joblib"))
joblib.dump(vectorizer, os.path.join(MODELS_DIR, "system_logs_vectorizer.joblib"))
with open(os.path.join(MODELS_DIR, "system_metadata.json"), "w") as f:
    json.dump({
        "dataset": "Loghub HDFS_v1",
        "feature_type": "event-count bag-of-events",
        "vocabulary": vectorizer.vocabulary_,
        "threshold": float(best_threshold),
        "trained_on": "2026-10-01"
    }, f, indent=2, default=str)
print(f"Saved {os.path.join(MODELS_DIR, 'system_logs_LightGBM.joblib')}, {os.path.join(MODELS_DIR, 'system_logs_vectorizer.joblib')}, and {os.path.join(MODELS_DIR, 'system_metadata.json')}")
