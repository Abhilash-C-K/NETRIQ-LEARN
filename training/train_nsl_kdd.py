import os
import sys
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from preprocessing.preprocess_nsl_kdd import load_and_preprocess_nsl_kdd

MODELS_DIR = os.path.join(PROJECT_ROOT, "models", "nsl_kdd")
MODEL_PATH = os.path.join(MODELS_DIR, "nsl_kdd_model.pkl")

def train_and_evaluate_nsl_kdd():
    X_train, y_train, X_test, y_test, label_encoder, feature_names = load_and_preprocess_nsl_kdd()
    
    print("\n" + "=" * 60)
    print("NSL-KDD STEP 7: TRAINING RANDOM FOREST CLASSIFIER")
    print("=" * 60)
    print(f"Train Shape: {X_train.shape[0]:,} samples, {X_train.shape[1]} features")
    print(f"Test Shape : {X_test.shape[0]:,} samples, {X_test.shape[1]} features")
    print("Training Random Forest model (n_estimators=100, max_depth=25, n_jobs=-1)...")
    
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=25,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    start_time = time.time()
    rf.fit(X_train, y_train)
    train_duration = time.time() - start_time
    print(f"Model training completed in {train_duration:.2f} seconds.")
    
    print("\n" + "=" * 60)
    print("NSL-KDD STEP 9: EVALUATING MODEL ON NSL-KDD TEST SET")
    print("=" * 60)
    
    y_pred = rf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_test, y_pred, average='macro', zero_division=0)
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)
    
    print("\n--- MODEL SUMMARY METRICS (NSL-KDD TEST SET) ---")
    print(f"Accuracy         : {accuracy * 100:.4f}%")
    print(f"Macro Precision  : {macro_p * 100:.4f}%")
    print(f"Macro Recall     : {macro_r * 100:.4f}%")
    print(f"Macro F1-Score   : {macro_f1 * 100:.4f}%")
    print(f"Weighted F1-Score: {weighted_f1 * 100:.4f}%")
    
    print("\n--- DETAILED CLASSIFICATION REPORT ---")
    target_names = [str(c) for c in label_encoder.classes_]
    report = classification_report(y_test, y_pred, target_names=target_names, zero_division=0, digits=4)
    print(report)
    
    print("\n" + "=" * 60)
    print("NSL-KDD STEP 8 & 10: SAVING TRAINED MODEL ARTIFACT")
    print("=" * 60)
    
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(rf, MODEL_PATH)
    print(f"Successfully saved trained NSL-KDD model as: '{MODEL_PATH}'")
    print("NSL-KDD AI Model Training Pipeline successfully completed!")

if __name__ == "__main__":
    train_and_evaluate_nsl_kdd()
