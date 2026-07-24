import os
import joblib
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_ROOT = os.path.join(BASE_DIR, "models")

class NetrIQPredictor:
    """
    Multi-model Predictor Engine for NetrIQ supporting CICIDS2017, NSL-KDD, and UNSW-NB15.
    """
    def __init__(self, dataset_name="cicids2017", models_root=MODELS_ROOT):
        self.dataset_name = dataset_name.lower()
        self.models_root = models_root
        
        # Sub-folder path (e.g. models/cicids2017, models/nsl_kdd, models/unsw)
        self.models_dir = os.path.join(self.models_root, self.dataset_name)
            
        self.model = None
        self.label_encoder = None
        self.feature_names = None
        self.is_loaded = False
        self._load_artifacts()

    def _load_artifacts(self):
        # Locate model file (*_model.pkl or netriq_model.pkl)
        model_files = [
            f"{self.dataset_name}_model.pkl",
            "netriq_model.pkl"
        ]
        
        model_path = None
        for mf in model_files:
            candidate = os.path.join(self.models_dir, mf)
            if os.path.exists(candidate):
                model_path = candidate
                break
                
        encoder_path = os.path.join(self.models_dir, "label_encoder.pkl")
        features_path = os.path.join(self.models_dir, "feature_names.pkl")

        if not (model_path and os.path.exists(encoder_path) and os.path.exists(features_path)):
            print(f"[NetrIQPredictor:{self.dataset_name}] Warning: Artifacts missing in '{self.models_dir}'. Run training script first.")
            return

        self.model = joblib.load(model_path)
        self.label_encoder = joblib.load(encoder_path)
        self.feature_names = joblib.load(features_path)
        self.is_loaded = True
        print(f"[NetrIQPredictor:{self.dataset_name}] Successfully loaded AI model ({len(self.feature_names)} features, {len(self.label_encoder.classes_)} classes).")

    def predict_flow(self, flow_features: dict) -> dict:
        """
        Predict threat level and attack type for a single network flow dictionary.
        """
        if not self.is_loaded:
            self._load_artifacts()
            if not self.is_loaded:
                raise RuntimeError(f"Model artifacts for '{self.dataset_name}' not loaded. Please run training first.")

        flow_vector = []
        for feature in self.feature_names:
            val = flow_features.get(feature, 0.0)
            if np.isnan(val) or np.isinf(val):
                val = 0.0
            flow_vector.append(float(val))

        input_df = pd.DataFrame([flow_vector], columns=self.feature_names)
        
        class_id = int(self.model.predict(input_df)[0])
        probabilities = self.model.predict_proba(input_df)[0]
        confidence = float(probabilities[class_id])
        
        attack_label = str(self.label_encoder.inverse_transform([class_id])[0])
        is_anomaly = (attack_label.upper() not in ['BENIGN', 'NORMAL'])

        return {
            "dataset": self.dataset_name,
            "prediction": attack_label,
            "is_anomaly": is_anomaly,
            "confidence": round(confidence, 4),
            "class_id": class_id,
            "threat_level": "HIGH" if is_anomaly and confidence > 0.8 else ("MEDIUM" if is_anomaly else "LOW")
        }

    def predict_batch(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Predict threat levels for a DataFrame of network flows.
        """
        if not self.is_loaded:
            self._load_artifacts()
            if not self.is_loaded:
                raise RuntimeError(f"Model artifacts for '{self.dataset_name}' not loaded. Please run training first.")

        processed_df = df.reindex(columns=self.feature_names, fill_value=0.0)
        processed_df = processed_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)

        predictions = self.model.predict(processed_df)
        probs = self.model.predict_proba(processed_df)

        confidences = [float(probs[i][pred]) for i, pred in enumerate(predictions)]
        labels = self.label_encoder.inverse_transform(predictions)

        result_df = df.copy()
        result_df['predicted_attack'] = labels
        result_df['is_anomaly'] = [str(lbl).upper() not in ['BENIGN', 'NORMAL'] for lbl in labels]
        result_df['confidence'] = [round(c, 4) for c in confidences]

        return result_df

# Global Predictor Registry
predictors = {
    "cicids2017": NetrIQPredictor("cicids2017"),
    "nsl_kdd": NetrIQPredictor("nsl_kdd"),
    "unsw": NetrIQPredictor("unsw")
}

def get_predictor(dataset_name="cicids2017"):
    return predictors.get(dataset_name.lower(), predictors["cicids2017"])

if __name__ == "__main__":
    print("Testing Multi-Model Predictor Module...")
    for ds_name, pred in predictors.items():
        if pred.is_loaded:
            dummy_flow = {feat: 0.0 for feat in pred.feature_names}
            res = pred.predict_flow(dummy_flow)
            print(f"Sample [{ds_name}] Output:", res)
        else:
            print(f"[{ds_name}] waiting for trained model artifacts.")
