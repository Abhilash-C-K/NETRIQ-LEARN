import numpy as np
from typing import Any, Dict
from backend.utils.logger import get_logger
from backend.utils.exceptions import FeatureEncodingError

logger = get_logger(__name__)

class FeatureEncoder:
    def __init__(self, encoder_joblib: Any):
        """
        Initializes with loaded encoders. 
        Assumes encoder_joblib is a dictionary of feature_name -> scikit-learn LabelEncoder.
        """
        self.encoders = encoder_joblib if isinstance(encoder_joblib, dict) else {}
        if not self.encoders:
            logger.warning("No categorical encoders loaded or invalid encoder format.")

    def encode(self, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Encodes incoming categorical features.
        Falls back safely (logs warning, uses default category like 0) for unseen values 
        so prediction never crashes. Returns a dictionary of purely numerical features.
        """
        encoded_features = {}
        for feature_name, value in features.items():
            if feature_name in self.encoders:
                encoder = self.encoders[feature_name]
                try:
                    # If it's a known class, encode it
                    if value in encoder.classes_:
                        encoded_features[feature_name] = float(encoder.transform([value])[0])
                    else:
                        # Unseen category fallback
                        logger.warning(
                            f"Unseen category '{value}' for feature '{feature_name}'. "
                            f"Falling back to default encoded value 0.0."
                        )
                        # We use 0.0 as a safe numerical fallback for LabelEncoders
                        encoded_features[feature_name] = 0.0
                except Exception as e:
                    logger.error(f"Error encoding feature '{feature_name}' with value '{value}': {e}")
                    encoded_features[feature_name] = 0.0
            else:
                # Numerical or pass-through feature
                try:
                    encoded_features[feature_name] = float(value)
                except ValueError:
                    logger.error(f"Failed to cast feature '{feature_name}' to float. Value: '{value}'")
                    raise FeatureEncodingError(f"Non-numeric and unencoded feature found: {feature_name}")
                    
        return encoded_features
