import os
import sys
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from preprocessing.preprocess_unsw import run_unsw_preprocessing_pipeline

MODELS_DIR = os.path.join(PROJECT_ROOT, "models", "unsw")
MODEL_PATH = os.path.join(MODELS_DIR, "unsw_model.pkl")

def train_and_evaluate_unsw():
    X, y, label_encoder, feature_names = run_unsw_preprocessing_pipeline()
    
    print("\n" + "=" * 60)
    print("UNSW-NB15 STEP 6: TRAIN / TEST SPLIT (80% TRAIN, 20% TEST)")
    print("=" * 60)
    
    start_time = time.time()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    print(f"Training set shape : {X_train.shape[0]:,} samples, {X_train.shape[1]} features")
    print(f"Testing set shape  : {X_test.shape[0]:,} samples, {X_test.shape[1]} features")
    
    print("\n" + "=" * 60)
    print("UNSW-NB15 STEP 7: TRAINING RANDOM FOREST CLASSIFIER")
    print("=" * 60)
    print("Training Random Forest model (n_estimators=100, max_depth=25, n_jobs=-1)...")
    
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=25,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    train_start = time.time()
    rf.fit(X_train, y_train)
    train_duration = time.time() - train_start
    print(f"Model training completed in {train_duration:.2f} seconds.")
    
    print("\n" + "=" * 60)
    print("UNSW-NB15 STEP 9: EVALUATING MODEL ON UNSEEN TEST DATA")
    print("=" * 60)
    
    eval_start = time.time()
    y_pred = rf.predict(X_test)
    eval_duration = time.time() - eval_start
    print(f"Model prediction completed in {eval_duration:.2f} seconds.")
    
    accuracy = accuracy_score(y_test, y_pred)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_test, y_pred, average='macro', zero_division=0)
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)
    
    print("\n--- MODEL SUMMARY METRICS (UNSW-NB15 TEST SET) ---")
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
    print("UNSW-NB15 STEP 8 & 10: SAVING TRAINED MODEL ARTIFACT")
    print("=" * 60)
    
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(rf, MODEL_PATH)
    print(f"Successfully saved trained UNSW-NB15 model as: '{MODEL_PATH}'")
    
    total_time = time.time() - start_time
    print(f"\nTotal UNSW-NB15 pipeline runtime: {total_time / 60:.2f} minutes.")
    print("UNSW-NB15 AI Model Training Pipeline successfully completed!")

if __name__ == "__main__":
    train_and_evaluate_unsw()
