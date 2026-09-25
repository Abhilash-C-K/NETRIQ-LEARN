import os
import sys
import json
import time
import joblib
import numpy as np
import xgboost as xgb
import lightgbm as lgb
from sklearn.preprocessing import StandardScaler

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

from backend.ai.anomaly_detector import EXPECTED_FEATURE_NAMES, StatisticalAnomalyDetector

def generate_network_dataset(n_samples=4000):
    np.random.seed(42)
    n_features = len(EXPECTED_FEATURE_NAMES)
    
    # 0 = Benign (80%), 1 = Anomaly / Attack (20%)
    n_benign = int(n_samples * 0.8)
    n_attack = n_samples - n_benign
    
    # Realistic feature baseline for Benign web/DNS/HTTPS traffic:
    # Most benign web flows have moderate packet lengths (64-1500), ACK flags, reasonable IAT
    X_benign = np.zeros((n_benign, n_features))
    for i in range(n_benign):
        fwd_pkts = np.random.randint(2, 50)
        bwd_pkts = np.random.randint(2, 80)
        avg_pkt_size = np.random.uniform(200.0, 1200.0)
        flow_dur = np.random.uniform(50000.0, 5000000.0) # 50ms - 5s
        
        row = np.random.uniform(1.0, 20.0, size=n_features)
        # Assign key CICIDS2017 features
        row[0] = flow_dur                                   # Flow Duration
        row[1] = fwd_pkts                                   # Total Fwd Packets
        row[2] = bwd_pkts                                   # Total Backward Packets
        row[3] = fwd_pkts * np.random.uniform(50, 400)      # Total Length of Fwd Packets
        row[4] = bwd_pkts * np.random.uniform(200, 1400)    # Total Length of Bwd Packets
        row[13] = (row[3] + row[4]) / (flow_dur / 1e6 + 1e-5) # Flow Bytes/s
        row[14] = (fwd_pkts + bwd_pkts) / (flow_dur / 1e6 + 1e-5) # Flow Packets/s
        row[42] = np.random.choice([0, 1], p=[0.7, 0.3])    # FIN Flag Count
        row[43] = 1.0                                       # SYN Flag Count (standard handshake)
        row[44] = 0.0                                       # RST Flag Count
        row[46] = 1.0                                       # ACK Flag Count
        row[51] = avg_pkt_size                              # Average Packet Size
        X_benign[i] = row
        
    # Attack traffic (Port scans, SYN flood, DoS):
    # High SYN count, 0 ACK, high packet rate, tiny packet size or huge flow bytes
    X_attack = np.zeros((n_attack, n_features))
    for i in range(n_attack):
        attack_type = np.random.choice(["syn_flood", "port_scan", "volumetric"])
        row = np.random.uniform(5.0, 50.0, size=n_features)
        if attack_type == "syn_flood":
            row[0] = np.random.uniform(100.0, 10000.0)      # very fast
            row[1] = np.random.randint(100, 5000)           # massive fwd pkts
            row[2] = 0                                      # no bwd response
            row[43] = 1.0                                   # SYN Flag
            row[46] = 0.0                                   # NO ACK
            row[51] = 40.0                                  # Min header-only size
        elif attack_type == "port_scan":
            row[0] = np.random.uniform(10.0, 500.0)         # tiny duration
            row[1] = 1                                      # single probe
            row[2] = np.random.choice([0, 1])
            row[44] = np.random.choice([0, 1])              # RST
            row[46] = 0.0
            row[51] = 44.0
        else: # volumetric
            row[0] = np.random.uniform(10000.0, 200000.0)
            row[1] = np.random.randint(500, 10000)
            row[2] = np.random.randint(10, 100)
            row[13] = np.random.uniform(5e6, 5e8)           # massive bytes/s
            row[51] = 1450.0
        X_attack[i] = row

    X = np.vstack([X_benign, X_attack])
    y = np.array([0] * n_benign + [1] * n_attack)
    
    # Shuffle
    perm = np.random.permutation(len(y))
    return X[perm], y[perm], X_benign

def main():
    print("=" * 70)
    print("  NETRIQ — Production ML Model Builder & Calibration Suite")
    print("=" * 70 + "\n")
    
    print("[1/5] Synthesizing grounded CICIDS2017 training flows...")
    X, y, X_benign = generate_network_dataset(n_samples=5000)
    print(f"      Total dataset: {X.shape[0]} samples, {X.shape[1]} features.")
    print(f"      Benign: {np.sum(y == 0)}, Anomaly: {np.sum(y == 1)}")

    print("[2/5] Fitting StandardScaler on feature space...")
    scaler = StandardScaler()
    scaler.fit(X)
    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.joblib"))
    joblib.dump({}, os.path.join(MODELS_DIR, "encoders.joblib"))
    print(f"      Saved scaler.joblib & encoders.joblib to {MODELS_DIR}")

    X_scaled = scaler.transform(X)

    print("[3/5] Training XGBoost Network Classifier (Gradient Boosted Trees)...")
    network_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        eval_metric="logloss"
    )
    network_model.fit(X_scaled, y)
    
    # Save network model (replaces old uncalibrated mock)
    network_model_path = os.path.join(MODELS_DIR, "network_traffic_RandomForest.joblib")
    joblib.dump(network_model, network_model_path)
    print(f"      Saved network classifier to {network_model_path}")

    # Firewall XGBoost
    firewall_model = xgb.XGBClassifier(
        n_estimators=50,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        eval_metric="logloss"
    )
    firewall_model.fit(X_scaled[:1000], y[:1000])
    joblib.dump(firewall_model, os.path.join(MODELS_DIR, "firewall_XGBoost.joblib"))
    print("      Saved firewall_XGBoost.joblib")

    # System Logs LightGBM
    system_model = lgb.LGBMClassifier(
        n_estimators=50,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        verbosity=-1
    )
    system_model.fit(X_scaled[:1000], y[:1000])
    joblib.dump(system_model, os.path.join(MODELS_DIR, "system_logs_LightGBM.joblib"))
    print("      Saved system_logs_LightGBM.joblib")

    print("[4/5] Calibrating Unsupervised Statistical Anomaly Detector...")
    benign_means = X_benign.mean(axis=0)
    benign_stds = X_benign.std(axis=0)
    anomaly_detector = StatisticalAnomalyDetector(means=benign_means, stds=benign_stds)
    
    # Compute decision_function bounds on benign calibration data
    benign_raw_scores = -anomaly_detector.decision_function(X_benign) # higher means more anomalous
    min_score = float(np.percentile(benign_raw_scores, 1))
    max_score = float(np.percentile(benign_raw_scores, 99))
    
    joblib.dump(anomaly_detector, os.path.join(MODELS_DIR, "network_traffic_IsolationForest.joblib"))
    print(f"      Saved network_traffic_IsolationForest.joblib (min={min_score:.4f}, max={max_score:.4f})")

    # Per-feature distribution stats for DeviationExplainer
    feature_stats = {
        feat: {"mean": float(benign_means[i]), "std": float(benign_stds[i])}
        for i, feat in enumerate(EXPECTED_FEATURE_NAMES)
    }

    print("[5/5] Generating metadata.json...")
    metadata = {
        "models": {
            "network_traffic_RandomForest": "2.0-XGBoost",
            "firewall_XGBoost": "2.0-XGBoost",
            "system_logs_LightGBM": "2.0-LightGBM",
            "network_traffic_IsolationForest": "2.0-Statistical"
        },
        "features": {
            "canonical_count": len(EXPECTED_FEATURE_NAMES),
            "feature_names": EXPECTED_FEATURE_NAMES
        },
        "calibration": {
            "isolation_forest": {
                "min_score": min_score,
                "max_score": max_score,
                "sample_count": len(X_benign),
                "feature_count": len(EXPECTED_FEATURE_NAMES),
                "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "feature_stats": feature_stats
            }
        },
        "build_info": {
            "framework": "XGBoost + LightGBM + NumPy",
            "wdac_compatible": True,
            "trained_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    }
    
    with open(os.path.join(MODELS_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    print("      Saved metadata.json successfully!")

    print("\n" + "=" * 70)
    print("  ALL PRODUCTION MODEL ARTIFACTS BUILT SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
