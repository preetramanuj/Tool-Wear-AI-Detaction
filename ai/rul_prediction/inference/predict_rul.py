import numpy as np
import pandas as pd
import xgboost as xgb
import joblib

class RULModelPackage:
    """
    Self-contained RUL Inference Package.
    This class is intended to be serialized to a .pkl file.
    It contains the trained XGBoost estimator, feature schema, preprocessing mapping,
    and all physics calculations required for inference.
    """
    def __init__(self, model, schema, cat_mapping):
        self.model = model
        self.schema = schema
        self.cat_mapping = cat_mapping
        
        self.features = self.schema['numerical_features'] + self.schema['categorical_features']
        self.cat_features = self.schema['categorical_features']
        self.forbidden_cols = self.schema['EXCLUDED_LEAKAGE_COLUMNS']
        
        self.model_version = self.schema.get('model_version', '1.0')
        self.schema_version = self.schema.get('feature_schema_version', '1.0')

    def _preprocess(self, df):
        df_clean = df.copy()
        
        # 1. Categorical normalization rule
        if 'material' in df_clean.columns:
            df_clean['material'] = df_clean['material'].astype(str).replace('RVS 304', 'RVS304')
            
        # 2. Categorical encoding
        for col in self.cat_features:
            if col in df_clean.columns and col in self.cat_mapping:
                cats = self.cat_mapping[col]
                # Map to index, -1 for unknown
                mapping = {c: i for i, c in enumerate(cats)}
                df_clean[col] = df_clean[col].astype(str).map(mapping).fillna(-1)
                
        # 3. Missing numeric columns (filled with NaN, handled by XGBoost)
        for col in self.features:
            if col not in df_clean.columns:
                df_clean[col] = np.nan
                
        # 4. Strict feature ordering
        X = df_clean[self.features]
        return X

    def predict(self, df):
        # 1. Leakage Audit
        assert len(set(self.forbidden_cols).intersection(set(self.features))) == 0, "Leakage detected in feature schema!"
        
        # 2. Preprocess
        X = self._preprocess(df)
        
        # 3. XGBoost Prediction
        transformed_preds = self.model.predict(X)
        
        # 4. Inverse Transformation (expm1)
        wear_rates = np.expm1(transformed_preds)
        
        results = []
        for i in range(len(df)):
            current_wear = df['wear'].iloc[i] if 'wear' in df.columns else (df['current_wear'].iloc[i] if 'current_wear' in df.columns else np.nan)
            rate = wear_rates[i]
            
            # 5. Physics logic & Safety bounds
            if pd.isna(current_wear):
                rul = None
                status = "UNAVAILABLE_MISSING_WEAR"
            elif current_wear >= 300:
                rul = 0.0
                status = "EOL_REACHED"
            elif pd.isna(rate) or rate <= 0:
                rul = None
                status = "UNRELIABLE_NON_POSITIVE_WEAR_RATE"
            elif rate < 0.1:
                rul = None
                status = "UNRELIABLE_NEAR_ZERO_WEAR_RATE"
            else:
                rul = max(0.0, float((300.0 - current_wear) / rate))
                status = "VALID"
                
            results.append({
                "predicted_rul_cycles": rul,
                "predicted_wear_rate_um_per_cycle": float(rate),
                "current_wear_um": float(current_wear) if not pd.isna(current_wear) else None,
                "rul_status": status,
                "model_version": self.model_version,
                "feature_schema_version": self.schema_version
            })
            
        return results

def predict_rul(features_df, model_path='models/rul/final/xgb_rul_final.pkl'):
    """
    Authoritative inference loader.
    """
    package = joblib.load(model_path)
    return package.predict(features_df)
