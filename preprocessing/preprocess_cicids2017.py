import os
import sys
import glob
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib

# Ensure UTF-8 output encoding for Windows terminal output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DATASET_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "netriq CORRECT DATASET",
    "MachineLearningCSV",
    "MachineLearningCVE"
)

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "cicids2017"
)

def load_and_merge_datasets(dataset_dir=DATASET_DIR):
    """
    Step 1 & Step 2: Load all 8 CSV files and merge into one DataFrame.
    """
    print("=" * 60)
    print("STEP 1 & 2: LOADING AND MERGING ALL CSV FILES")
    print("=" * 60)
    
    csv_files = glob.glob(os.path.join(dataset_dir, "*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in: {dataset_dir}")
        
    print(f"Found {len(csv_files)} CSV file(s) in: {dataset_dir}\n")
    
    dataframes = []
    total_raw_rows = 0
    
    for filepath in sorted(csv_files):
        filename = os.path.basename(filepath)
        print(f"Loading {filename}...", end=" ", flush=True)
        df = pd.read_csv(filepath)
        
        # Clean column names (strip leading/trailing whitespace)
        df.columns = df.columns.str.strip()
        
        rows, cols = df.shape
        total_raw_rows += rows
        print(f"({rows:,} rows, {cols} columns)")
        dataframes.append(df)
        
    merged_df = pd.concat(dataframes, ignore_index=True)
    
    # Clean non-ASCII / corrupted characters in label strings
    if 'Label' in merged_df.columns:
        merged_df['Label'] = (
            merged_df['Label']
            .astype(str)
            .str.replace('\ufffd', ' ', regex=False)
            .str.replace(r'[^\x00-\x7F]+', ' ', regex=True)
            .str.strip()
        )
        
    print("-" * 60)
    print(f"Merged Dataset Raw Total: {len(merged_df):,} rows, {merged_df.shape[1]} columns")
    print("-" * 60)
    return merged_df

def verify_dataset(df):
    """
    Verify columns, missing values, infinite values, and label distribution.
    """
    print("\n" + "=" * 60)
    print("STEP 2 (VERIFICATION): DATASET INSPECTION")
    print("=" * 60)
    
    print(f"Total Rows: {len(df):,}")
    print(f"Total Columns: {len(df.columns)}")
    
    if 'Label' not in df.columns:
        raise ValueError("Dataset does not contain 'Label' column!")
        
    print("\nAttack Label Distribution (Raw Data):")
    label_counts = df['Label'].value_counts()
    for label, count in label_counts.items():
        percentage = (count / len(df)) * 100
        print(f"  - {label:<35}: {count:>10,} ({percentage:>6.2f}%)")
        
    null_count = df.isnull().sum().sum()
    inf_count = np.isinf(df.select_dtypes(include=[np.number])).sum().sum()
    
    print(f"\nNull / NaN Values Count: {null_count:,}")
    print(f"Infinite Values Count : {inf_count:,}")
    
def clean_dataset(df):
    """
    Step 3 & Step 4: Remove duplicates, NaN, and Infinity values.
    """
    print("\n" + "=" * 60)
    print("STEP 3 & 4: CLEANING DATASET (DUPLICATES, NaN, INFINITY)")
    print("=" * 60)
    
    initial_rows = len(df)
    
    # Step 3: Remove duplicate rows
    print("Removing duplicate rows...", end=" ", flush=True)
    df = df.drop_duplicates()
    duplicates_removed = initial_rows - len(df)
    print(f"Removed {duplicates_removed:,} duplicates (Remaining: {len(df):,})")
    
    # Step 4: Handle Infinity and NaN values
    print("Cleaning Infinity and NaN values...", end=" ", flush=True)
    # Replace Infinity with NaN
    df = df.replace([np.inf, -np.inf], np.nan)
    
    # Drop rows containing NaN
    rows_before_nan_drop = len(df)
    df = df.dropna()
    nan_removed = rows_before_nan_drop - len(df)
    print(f"Removed {nan_removed:,} invalid rows (Remaining: {len(df):,})")
    
    print("-" * 60)
    print(f"Cleaned Dataset Final Total: {len(df):,} rows ({initial_rows - len(df):,} rows dropped in total)")
    print("-" * 60)
    return df

def preprocess_and_encode(df):
    """
    Step 5: Encode Attack Labels and separate Features (X) & Target (y).
    """
    print("\n" + "=" * 60)
    print("STEP 5: LABEL ENCODING & FEATURE SEPARATION")
    print("=" * 60)
    
    # Drop non-feature metadata columns if present
    metadata_cols = ['Flow ID', 'Source IP', 'Source Port', 'Destination IP', 'Destination Port', 'Protocol', 'Timestamp']
    cols_to_drop = [c for c in metadata_cols if c in df.columns]
    
    if cols_to_drop:
        print(f"Dropping non-feature metadata columns: {cols_to_drop}")
        df = df.drop(columns=cols_to_drop)
        
    X = df.drop(columns=['Label'])
    y_raw = df['Label']
    
    # Ensure all feature columns are numeric
    X = X.apply(pd.to_numeric, errors='coerce')
    # Drop any leftover NaNs created during conversion
    nan_mask = X.isnull().any(axis=1)
    if nan_mask.sum() > 0:
        print(f"Dropping {nan_mask.sum():,} rows containing non-numeric feature values...")
        X = X[~nan_mask]
        y_raw = y_raw[~nan_mask]
        
    # Encode target labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)
    
    print("\nLabel Encoding Mapping:")
    for index, label in enumerate(label_encoder.classes_):
        count = (y == index).sum()
        print(f"  [{index}] {label:<35}: {count:>10,} samples")
        
    feature_names = list(X.columns)
    print(f"\nFinal Feature Count (X): {X.shape[1]} features")
    print(f"Final Target Samples (y): {len(y):,} samples")
    
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    # Save label encoder and feature names for backend inference
    joblib.dump(label_encoder, os.path.join(MODELS_DIR, "label_encoder.pkl"))
    joblib.dump(feature_names, os.path.join(MODELS_DIR, "feature_names.pkl"))
    print(f"\nSaved 'label_encoder.pkl' and 'feature_names.pkl' to {MODELS_DIR}")
    
    return X, y, label_encoder, feature_names

def run_preprocessing_pipeline():
    merged_df = load_and_merge_datasets()
    verify_dataset(merged_df)
    cleaned_df = clean_dataset(merged_df)
    X, y, label_encoder, feature_names = preprocess_and_encode(cleaned_df)
    return X, y, label_encoder, feature_names

if __name__ == "__main__":
    run_preprocessing_pipeline()
