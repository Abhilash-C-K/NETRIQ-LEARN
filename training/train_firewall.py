import os
from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, precision_recall_curve
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Dataset path resolution
data_path = os.path.join(PROJECT_ROOT, "training", "firewall", "log2.csv")
if not os.path.exists(data_path):
    data_path = "training/firewall/log2.csv"

# Load
print(f"Loading data from {data_path}...")
df = pd.read_csv(data_path)
y = (df["Action"].str.lower() != "allow").astype(int)  # 1 = deny/drop/reset
X = df.drop(columns=["Action"])

# Split: train / validation / test
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.3, stratify=y, random_state=42
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42
)

# Train
print("Training base XGBoost model...")
base_model = XGBClassifier(
    n_estimators=300, max_depth=6, learning_rate=0.1, eval_metric="logloss", random_state=42
)
base_model.fit(X_train, y_train)

# Calibrate probabilities on validation set (compatible with both older and newer scikit-learn)
print("Calibrating probabilities...")
try:
    from sklearn.frozen import FrozenEstimator
    model = CalibratedClassifierCV(FrozenEstimator(base_model), method="isotonic")
except ImportError:
    model = CalibratedClassifierCV(base_model, method="isotonic", cv="prefit")

model.fit(X_val, y_val)

# Pick threshold: smallest cutoff where validation precision >= 0.95
probs_val = model.predict_proba(X_val)[:, 1]
prec, rec, thresh = precision_recall_curve(y_val, probs_val)
valid = [(p, t) for p, t in zip(prec, thresh) if p >= 0.95]
best_threshold = min(valid, key=lambda x: x[1])[1] if valid else 0.5

# Evaluate on test set, untouched until now
probs_test = model.predict_proba(X_test)[:, 1]
preds_test = (probs_test >= best_threshold).astype(int)
print("\n--- Test Set Evaluation ---")
print(classification_report(y_test, preds_test, digits=4))
print("Chosen threshold:", best_threshold)

# Save model + metadata together
joblib.dump(model, os.path.join(MODELS_DIR, "firewall_XGBoost.joblib"))
with open(os.path.join(MODELS_DIR, "firewall_metadata.json"), "w") as f:
    json.dump(
        {
            "dataset": "UCI Internet Firewall Data",
            "features": list(X.columns),
            "threshold": float(best_threshold),
            "trained_on": "2026-10-01",
        },
        f,
        indent=2,
    )
print(f"\nModel saved to {os.path.join(MODELS_DIR, 'firewall_XGBoost.joblib')}")
print(f"Metadata saved to {os.path.join(MODELS_DIR, 'firewall_metadata.json')}")
