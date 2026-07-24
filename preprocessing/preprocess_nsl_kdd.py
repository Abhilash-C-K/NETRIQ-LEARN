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
    "NSL KDD"
)

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "nsl_kdd"
)

NSL_KDD_COLUMNS = [
    'duration', 'protocol_type', 'service', 'flag', 'src_bytes', 'dst_bytes',
    'land', 'wrong_fragment', 'urgent', 'hot', 'num_failed_logins', 'logged_in',
    'num_compromised', 'root_shell', 'su_attempted', 'num_root', 'num_file_creations',
    'num_shells', 'num_access_files', 'num_outbound_cmds', 'is_host_login',
    'is_guest_login', 'count', 'srv_count', 'serror_rate', 'srv_serror_rate',
    'rerror_rate', 'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate',
    'srv_diff_host_rate', 'dst_host_count', 'dst_host_srv_count',
    'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate',
    'dst_host_serror_rate', 'dst_host_srv_serror_rate',
    'dst_host_rerror_rate', 'dst_host_srv_rerror_rate', 'label', 'difficulty'
]

# Standard NSL-KDD 5-Category Attack Mapping
NSL_KDD_ATTACK_MAP = {
    'normal': 'Normal',
    
    # DoS Attacks
    'neptune': 'DoS', 'back': 'DoS', 'land': 'DoS', 'pod': 'DoS',
    'smurf': 'DoS', 'teardrop': 'DoS', 'mailbomb': 'DoS', 'apache2': 'DoS',
    'processtable': 'DoS', 'udpstorm': 'DoS', 'worm': 'DoS',
    
    # Probe Attacks
    'ipsweep': 'Probe', 'nmap': 'Probe', 'portsweep': 'Probe',
    'satan': 'Probe', 'mscan': 'Probe', 'saint': 'Probe',
    
    # R2L (Remote to Local) Attacks
    'guess_passwd': 'R2L', 'ftp_write': 'R2L', 'imap': 'R2L',
    'multihop': 'R2L', 'phf': 'R2L', 'spy': 'R2L',
    'warezclient': 'R2L', 'warezmaster': 'R2L', 'sendmail': 'R2L',
    'named': 'R2L', 'snmpgetattack': 'R2L', 'snmpguess': 'R2L',
    'xlock': 'R2L', 'xsnoop': 'R2L', 'httptunnel': 'R2L',
    
    # U2R (User to Root) Attacks
    'buffer_overflow': 'U2R', 'loadmodule': 'U2R', 'perl': 'U2R',
    'rootkit': 'U2R', 'ps': 'U2R', 'sqlattack': 'U2R', 'xterm': 'U2R'
}

def locate_nsl_files(dataset_dir=DATASET_DIR):
    all_files = glob.glob(os.path.join(dataset_dir, "**", "*.txt"), recursive=True)
    train_files = [f for f in all_files if os.path.isfile(f) and os.path.basename(f).lower() == 'kddtrain+.txt']
    test_files = [f for f in all_files if os.path.isfile(f) and os.path.basename(f).lower() == 'kddtest+.txt']
    
    if not train_files or not test_files:
        raise FileNotFoundError(f"Could not locate KDDTrain+.txt and KDDTest+.txt files inside: {dataset_dir}")
        
    return train_files[0], test_files[0]

def load_and_preprocess_nsl_kdd():
    print("=" * 60)
    print("NSL-KDD STEP 1 & 2: LOADING DATASETS")
    print("=" * 60)
    
    train_path, test_path = locate_nsl_files()
    print(f"Loading Training File: {train_path}...", end=" ", flush=True)
    df_train = pd.read_csv(train_path, header=None, names=NSL_KDD_COLUMNS)
    print(f"({len(df_train):,} rows)")
    
    print(f"Loading Testing File : {test_path}...", end=" ", flush=True)
    df_test = pd.read_csv(test_path, header=None, names=NSL_KDD_COLUMNS)
    print(f"({len(df_test):,} rows)")
    
    print("\n" + "=" * 60)
    print("NSL-KDD STEP 3 & 4: CLEANING DATASET & HANDLING NaN/INF")
    print("=" * 60)
    
    # Drop difficulty column
    df_train = df_train.drop(columns=['difficulty'], errors='ignore').drop_duplicates()
    df_test = df_test.drop(columns=['difficulty'], errors='ignore').drop_duplicates()
    
    # Map sub-attack names to 5 major cybersecurity categories
    df_train['label'] = df_train['label'].astype(str).str.strip().map(lambda x: NSL_KDD_ATTACK_MAP.get(x, 'Other'))
    df_test['label'] = df_test['label'].astype(str).str.strip().map(lambda x: NSL_KDD_ATTACK_MAP.get(x, 'Other'))
    
    print(f"Clean Training Set: {len(df_train):,} samples")
    print(f"Clean Testing Set : {len(df_test):,} samples")
    
    print("\n" + "=" * 60)
    print("NSL-KDD STEP 5: CATEGORICAL & LABEL ENCODING")
    print("=" * 60)
    
    categorical_cols = ['protocol_type', 'service', 'flag']
    
    # Combine data temporarily for consistent categorical feature encoding
    df_combined = pd.concat([df_train, df_test], ignore_index=True)
    
    for col in categorical_cols:
        le = LabelEncoder()
        df_combined[col] = le.fit_transform(df_combined[col].astype(str))
        
    # Split back into train and test
    df_train_encoded = df_combined.iloc[:len(df_train)].copy()
    df_test_encoded = df_combined.iloc[len(df_train):].copy()
    
    X_train = df_train_encoded.drop(columns=['label'])
    y_train_raw = df_train_encoded['label']
    
    X_test = df_test_encoded.drop(columns=['label'])
    y_test_raw = df_test_encoded['label']
    
    # Target label encoder
    target_encoder = LabelEncoder()
    target_encoder.fit(pd.concat([y_train_raw, y_test_raw], ignore_index=True))
    
    y_train = target_encoder.transform(y_train_raw)
    y_test = target_encoder.transform(y_test_raw)
    
    feature_names = list(X_train.columns)
    
    print("\nNSL-KDD 5-Category Label Encoding Mapping:")
    for index, label in enumerate(target_encoder.classes_):
        train_count = (y_train == index).sum()
        test_count = (y_test == index).sum()
        print(f"  [{index}] {label:<15}: Train ({train_count:>6,}) | Test ({test_count:>6,})")
        
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    joblib.dump(target_encoder, os.path.join(MODELS_DIR, "label_encoder.pkl"))
    joblib.dump(feature_names, os.path.join(MODELS_DIR, "feature_names.pkl"))
    print(f"\nSaved 'label_encoder.pkl' and 'feature_names.pkl' to: {MODELS_DIR}")
    
    return X_train, y_train, X_test, y_test, target_encoder, feature_names

if __name__ == "__main__":
    load_and_preprocess_nsl_kdd()
