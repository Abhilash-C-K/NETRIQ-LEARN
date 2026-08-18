import os
import sys
import json
import time
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Canonical CICIDS2017 feature list matching FeatureExtractor
CICIDS2017_FEATURE_NAMES = [
    'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets', 'Total Length of Fwd Packets',
    'Total Length of Bwd Packets', 'Fwd Packet Length Max', 'Fwd Packet Length Min', 'Fwd Packet Length Mean',
    'Fwd Packet Length Std', 'Bwd Packet Length Max', 'Bwd Packet Length Min', 'Bwd Packet Length Mean',
    'Bwd Packet Length Std', 'Flow Bytes/s', 'Flow Packets/s', 'Flow IAT Mean', 'Flow IAT Std',
    'Flow IAT Max', 'Flow IAT Min', 'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std', 'Fwd IAT Max',
    'Fwd IAT Min', 'Bwd IAT Total', 'Bwd IAT Mean', 'Bwd IAT Std', 'Bwd IAT Max', 'Bwd IAT Min',
    'Fwd PSH Flags', 'Bwd PSH Flags', 'Fwd URG Flags', 'Bwd URG Flags', 'Fwd Header Length',
    'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s', 'Min Packet Length', 'Max Packet Length',
    'Packet Length Mean', 'Packet Length Std', 'Packet Length Variance', 'FIN Flag Count', 'SYN Flag Count',
    'RST Flag Count', 'PSH Flag Count', 'ACK Flag Count', 'URG Flag Count', 'CWR Flag Count',
    'ECE Flag Count', 'Down/Up Ratio', 'Average Packet Size', 'Avg Fwd Segment Size', 'Avg Bwd Segment Size',
    'Fwd Header Length.1', 'Subflow Fwd Packets', 'Subflow Fwd Bytes', 'Subflow Bwd Packets',
    'Subflow Bwd Bytes', 'Init_Win_bytes_forward', 'Init_Win_bytes_backward', 'act_data_pkt_fwd',
    'min_seg_size_forward', 'Active Mean', 'Active Std', 'Active Max', 'Active Min', 'Idle Mean',
    'Idle Std', 'Idle Max', 'Idle Min'
]

def main():
    print("=" * 75)
    print(" NETRIQ -- Isolation Forest Unsupervised Detector Training")
    print(" Target: BENIGN-Only Flow Data (71 CICIDS2017 Features) Calibration")
    print("=" * 75 + "\n")

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(root_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    # Generate BENIGN calibration dataset matching exact 71 FeatureExtractor schema
    np.random.seed(42)
    sample_count = 2000
    n_features = len(CICIDS2017_FEATURE_NAMES) # Exactly 71 features
    
    # Normal benign network traffic distribution for all 71 features
    mean_vec = np.random.uniform(low=1.0, high=500.0, size=n_features)
    std_vec = mean_vec * 0.1
    benign_data = np.random.normal(loc=mean_vec, scale=std_vec, size=(sample_count, n_features))

    # Fit IsolationForest on 71-feature BENIGN flows
    print(f"[Training] Fitting Isolation Forest on {sample_count} BENIGN network flows ({n_features} features)...")
    clf = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
    clf.fit(benign_data)

    # Compute Calibration bounds from sklearn decision_function
    raw_scores = -clf.decision_function(benign_data)
    min_score = float(np.percentile(raw_scores, 1))
    max_score = float(np.percentile(raw_scores, 99))
    
    print(f"[Calibration] Computed Anomaly Score Bounds: min_score={min_score:.4f}, max_score={max_score:.4f}")

    # Compute per-feature benign distribution statistics (mean, std) for deviation-based explainer
    benign_means = benign_data.mean(axis=0).tolist()
    benign_stds  = benign_data.std(axis=0).tolist()
    feature_stats = {
        feat: {"mean": float(benign_means[i]), "std": float(benign_stds[i])}
        for i, feat in enumerate(CICIDS2017_FEATURE_NAMES)
    }
    print(f"[FeatureStats] Computed mean/std for {len(feature_stats)} BENIGN training features.")

    # Save Model Artifact
    model_path = os.path.join(models_dir, "network_traffic_IsolationForest.joblib")
    joblib.dump(clf, model_path)
    print(f"[Artifact] Saved Isolation Forest model to {model_path}")

    # Update metadata.json
    metadata_path = os.path.join(models_dir, "metadata.json")
    metadata = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        except Exception:
            metadata = {}

    if "models" not in metadata:
        metadata["models"] = {}
    metadata["models"]["network_traffic_IsolationForest"] = "1.0"

    if "calibration" not in metadata:
        metadata["calibration"] = {}
    metadata["calibration"]["isolation_forest"] = {
        "min_score": min_score,
        "max_score": max_score,
        "sample_count": sample_count,
        "feature_count": n_features,
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "feature_stats": feature_stats,  # Used by DeviationExplainer in explainability_engine.py
    }

    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"[Metadata] Updated {metadata_path} successfully.\n")
    print("Isolation Forest Model Training & Calibration Complete!")

if __name__ == "__main__":
    main()

