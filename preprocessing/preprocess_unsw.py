import os
import sys
import glob
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DATASET_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "netriq CORRECT DATASET",
    "unsw"
)

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "unsw"
)

UNSW_COLUMNS = [
    'srcip', 'sport', 'dstip', 'dsport', 'proto', 'state', 'dur', 'sbytes',
    'dbytes', 'sttl', 'dttl', 'sloss', 'dloss', 'service', 'Sload', 'Dload',
    'Spkts', 'Dpkts', 'swin', 'dwin', 'stcpb', 'dtcpb', 'smeansz', 'dmeansz',
    'trans_depth', 'res_bdy_len', 'Sjit', 'Djit', 'Stime', 'Ltime', 'tcprtt',
    'synack', 'ackdat', 'is_sm_ips_ports', 'ct_state_ttl', 'ct_flw_http_mthd',
    'is_ftp_login', 'ct_ftp_cmd', 'ct_srv_src', 'ct_srv_dst', 'ct_dst_ltm',
    'ct_src_ltm', 'ct_src_dport_ltm', 'ct_dst_sport_ltm', 'ct_dst_src_ltm',
    'attack_cat', 'label'
]

def load_and_merge_unsw(dataset_dir=DATASET_DIR):
    print("=" * 60)
    print("UNSW-NB15 STEP 1 & 2: LOADING ALL CSV FILES")
    print("=" * 60)
    
    csv_files = glob.glob(os.path.join(dataset_dir, "*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in: {dataset_dir}")
        
    print(f"Found {len(csv_files)} CSV file(s) in: {dataset_dir}\n")
    
    dfs = []
    for filepath in sorted(csv_files):
        filename = os.path.basename(filepath)
        print(f"Loading {filename}...", end=" ", flush=True)
        df = pd.read_csv(filepath, header=None, names=UNSW_COLUMNS, low_memory=False)
        print(f"({len(df):,} rows)")
        dfs.append(df)
        
    merged_df = pd.concat(dfs, ignore_index=True)
    print("-" * 60)
    print(f"Merged UNSW-NB15 Raw Total: {len(merged_df):,} rows, {merged_df.shape[1]} columns")
    print("-" * 60)
    return merged_df

def clean_unsw_dataset(df):
    print("\n" + "=" * 60)
    print("UNSW-NB15 STEP 3 & 4: CLEANING DATASET & HANDLING NaN/INF")
    print("=" * 60)
    
    initial_rows = len(df)
    
    # Fill missing attack_cat values as Normal
    df['attack_cat'] = df['attack_cat'].fillna('Normal').astype(str).str.strip()
    
    # Normalize category names
    cat_mapping = {
        'Backdoor': 'Backdoors',
        'Backdoors': 'Backdoors',
        'Fuzzers': 'Fuzzers',
        'Reconnaissance': 'Reconnaissance',
        'Shellcode': 'Shellcode'
    }
    df['attack_cat'] = df['attack_cat'].map(lambda x: cat_mapping.get(x, x))
    
    # Drop duplicates
    print("Removing duplicate rows...", end=" ", flush=True)
    df = df.drop_duplicates()
    print(f"Remaining: {len(df):,} rows (Removed {initial_rows - len(df):,} duplicates)")
    
    # Clean Infinity / NaN in numeric fields
    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=['attack_cat'])
    
    print("-" * 60)
    print(f"Cleaned UNSW Dataset Final Total: {len(df):,} rows")
    print("-" * 60)
    return df

def preprocess_and_encode_unsw(df):
    print("\n" + "=" * 60)
    print("UNSW-NB15 STEP 5: FEATURE ENCODING & TARGET LABELING")
    print("=" * 60)
    
    metadata_cols = ['srcip', 'sport', 'dstip', 'dsport', 'Stime', 'Ltime', 'label']
    df_features = df.drop(columns=[c for c in metadata_cols if c in df.columns])
    
    X_raw = df_features.drop(columns=['attack_cat'])
    y_raw = df_features['attack_cat']
    
    categorical_cols = ['proto', 'state', 'service']
    for col in categorical_cols:
        if col in X_raw.columns:
            le_cat = LabelEncoder()
            X_raw[col] = le_cat.fit_transform(X_raw[col].astype(str))
            
    # Ensure remaining feature columns are numeric
    X = X_raw.apply(pd.to_numeric, errors='coerce').fillna(0.0)
    
    # Encode attack category labels
    target_encoder = LabelEncoder()
    y = target_encoder.fit_transform(y_raw)
    
    print("\nUNSW-NB15 Label Encoding Mapping:")
    for index, label in enumerate(target_encoder.classes_):
        count = (y == index).sum()
        percentage = (count / len(y)) * 100
        print(f"  [{index:2d}] {label:<25}: {count:>10,} samples ({percentage:>6.2f}%)")
        
    feature_names = list(X.columns)
    print(f"\nFinal Feature Count (X): {X.shape[1]} features")
    print(f"Final Target Samples (y): {len(y):,} samples")
    
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(target_encoder, os.path.join(MODELS_DIR, "label_encoder.pkl"))
    joblib.dump(feature_names, os.path.join(MODELS_DIR, "feature_names.pkl"))
    print(f"\nSaved 'label_encoder.pkl' and 'feature_names.pkl' to: {MODELS_DIR}")
    
    return X, y, target_encoder, feature_names

def run_unsw_preprocessing_pipeline():
    raw_df = load_and_merge_unsw()
    cleaned_df = clean_unsw_dataset(raw_df)
    X, y, target_encoder, feature_names = preprocess_and_encode_unsw(cleaned_df)
    return X, y, target_encoder, feature_names

if __name__ == "__main__":
    run_unsw_preprocessing_pipeline()
