import pandas as pd, numpy as np, glob, joblib, json, os
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Reuse the same cleaned CICIDS2017 load as before
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
    # Filter benign early to save substantial memory
    benign_sub = sub_df[sub_df["Label"].str.strip().str.upper() == "BENIGN"]
    dfs.append(benign_sub)

df = pd.concat(dfs, ignore_index=True)
df.drop_duplicates(inplace=True)

# 2. Isolation Forest trains ONLY on benign traffic — it learns what "normal" looks like
X_benign = df.drop(columns=["Label"]).select_dtypes(include=[np.number]).astype(np.float32)
print("Benign rows available:", len(X_benign))

X_train, X_val = train_test_split(X_benign, test_size=0.2, random_state=42)

# Free temporary memory before training
del df, dfs
import gc
gc.collect()

print("Training IsolationForest (n_estimators=200, contamination=0.01)...")
model = IsolationForest(
    n_estimators=200, contamination=0.01, random_state=42, n_jobs=-1)
model.fit(X_train)

# 3. Sanity check: score distribution on held-out benign data (should mostly look "normal")
print("Scoring validation set...")
scores = model.decision_function(X_val)
print("Validation score range:", scores.min(), "to", scores.max())
print("Mean score:", scores.mean())

# 4. Save model + metadata
joblib.dump(model, os.path.join(MODELS_DIR, "isolation_forest.joblib"))
joblib.dump(model, os.path.join(MODELS_DIR, "network_traffic_IsolationForest.joblib"))
with open(os.path.join(MODELS_DIR, "isolation_forest_metadata.json"), "w") as f:
    json.dump({
        "dataset": "CICIDS2017 benign rows only",
        "features": list(X_benign.columns),
        "n_benign_rows": len(X_benign),
        "validation_min_score": float(scores.min()),
        "validation_max_score": float(scores.max()),
        "validation_mean_score": float(scores.mean()),
        "trained_on": "2026-10-01"
    }, f, indent=2)

print(f"Saved {os.path.join(MODELS_DIR, 'isolation_forest.joblib')} and {os.path.join(MODELS_DIR, 'isolation_forest_metadata.json')}")
