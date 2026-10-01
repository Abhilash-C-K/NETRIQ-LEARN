import pandas as pd, numpy as np, glob, joblib, json, os
from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, precision_recall_curve
from sklearn.ensemble import RandomForestClassifier

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Load and merge all 8 CICIDS2017 CSVs
network_dir = os.path.join(PROJECT_ROOT, "training", "network")
files = glob.glob(os.path.join(network_dir, "*.csv"))
if not files:
    files = glob.glob("datasets/training/network/*.csv") or glob.glob("training/network/*.csv")
print("Files found:", len(files))

# Stream loading with per-file cleaning to prevent memory spike
dfs = []
for f in files:
    print(f"Loading {os.path.basename(f)}...")
    sub_df = pd.read_csv(f, low_memory=False)
    sub_df.columns = sub_df.columns.str.strip()
    sub_df.replace([np.inf, -np.inf], np.nan, inplace=True)
    sub_df.dropna(inplace=True)
    sub_df.drop_duplicates(inplace=True)
    dfs.append(sub_df)

df = pd.concat(dfs, ignore_index=True)

# 2. Clean known CICIDS2017 issues across the combined dataframe
df.drop_duplicates(inplace=True)                        # bidirectional flow duplicates
print("Rows after cleaning:", len(df))

# 3. Binary label: BENIGN vs everything else
y = (df["Label"].str.strip().str.upper() != "BENIGN").astype(int)
X = df.drop(columns=["Label"])
X = X.select_dtypes(include=[np.number])  # drop any stray non-numeric columns
# Downcast float64 to float32 to conserve RAM
X = X.astype(np.float32)
print("Feature count:", X.shape[1])
print("Class balance:\n", y.value_counts(normalize=True))

# 4. Split: train / validation / test
print("Splitting train/val/test...")
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.3, stratify=y, random_state=42)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42)

# Free full dataframe to release memory before training
del df, dfs, X, y
import gc
gc.collect()

# 5. Train
print("Training RandomForest (n_estimators=300, max_depth=20)...")
base_model = RandomForestClassifier(
    n_estimators=300, max_depth=20, class_weight="balanced",
    n_jobs=-1, random_state=42)
base_model.fit(X_train, y_train)

# 6. Calibrate
print("Calibrating probabilities...")
try:
    from sklearn.frozen import FrozenEstimator
    model = CalibratedClassifierCV(FrozenEstimator(base_model), method="isotonic")
except ImportError:
    model = CalibratedClassifierCV(base_model, method="isotonic", cv="prefit")
model.fit(X_val, y_val)

# 7. Threshold: smallest cutoff where validation precision >= 0.95
print("Selecting threshold...")
probs_val = model.predict_proba(X_val)[:, 1]
prec, rec, thresh = precision_recall_curve(y_val, probs_val)
valid = [(p, t) for p, t in zip(prec, thresh) if p >= 0.95]
best_threshold = min(valid, key=lambda x: x[1])[1] if valid else 0.5

# 8. Evaluate on untouched test set
print("Evaluating on test set...")
probs_test = model.predict_proba(X_test)[:, 1]
preds_test = (probs_test >= best_threshold).astype(int)
print("\n" + classification_report(y_test, preds_test, digits=4))
print("Chosen threshold:", best_threshold)

# 9. Save
joblib.dump(model, os.path.join(MODELS_DIR, "network_traffic_RandomForest.joblib"))
with open(os.path.join(MODELS_DIR, "network_metadata.json"), "w") as f:
    json.dump({
        "dataset": "CICIDS2017 (8 files, Mon-Fri, deduplicated)",
        "features": list(X_train.columns),
        "threshold": float(best_threshold),
        "trained_on": "2026-10-01"
    }, f, indent=2)
print(f"Saved {os.path.join(MODELS_DIR, 'network_traffic_RandomForest.joblib')} and {os.path.join(MODELS_DIR, 'network_metadata.json')}")
