import os
import json
import time
import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Union
from pathlib import Path

from backend.core.config import settings

logger = logging.getLogger(__name__)

class RULService:
    """
    Model 6: Remaining Useful Life (RUL) Prediction Service.
    Uses trained XGBoost model (`models/rul/final/xgb_rul_final.pkl`) to predict tool wear rate (µm/cycle)
    and compute remaining useful life in cutting cycles until the 300 µm EOL threshold.
    """

    def __init__(self, model_path: Optional[str] = None, schema_path: Optional[str] = None):
        self.model_path = self._resolve_model_path(model_path)
        self.schema_path = schema_path or settings.RUL_FEATURE_SCHEMA_PATH
        self.metadata_path = settings.RUL_METADATA_PATH
        
        self.package = None
        self.schema = {}
        self.metadata = {}
        self.features: List[str] = []
        self.cat_features: List[str] = []
        self.numerical_features: List[str] = []
        self.cat_mapping: Dict[str, List[str]] = {}
        self.eol_threshold_um: float = settings.RUL_EOL_THRESHOLD_UM
        
        self._load_schema_and_metadata()
        self._load_model()

    def _resolve_model_path(self, model_path: Optional[str]) -> str:
        if model_path and os.path.exists(model_path):
            return os.path.abspath(model_path)
        for p in settings.RUL_MODEL_PATHS:
            if os.path.exists(p):
                return os.path.abspath(p)
        default_p = os.path.join(settings.BASE_DIR, "models", "rul", "final", "xgb_rul_final.pkl")
        return os.path.abspath(default_p)

    def _load_schema_and_metadata(self):
        if os.path.exists(self.schema_path):
            try:
                with open(self.schema_path, "r") as f:
                    self.schema = json.load(f)
                    self.features = self.schema.get("APPROVED_FEATURE_COLUMNS", [])
                    self.cat_features = self.schema.get("categorical_features", [])
                    self.numerical_features = self.schema.get("numerical_features", [])
            except Exception as e:
                logger.warning(f"Could not load RUL feature schema from '{self.schema_path}': {e}")
                
        if os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, "r") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load RUL metadata from '{self.metadata_path}': {e}")

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                # Ensure src.rul_prediction.inference.predict_rul is accessible for pickle unpickling
                import sys
                src_path = str(Path(settings.BASE_DIR))
                if src_path not in sys.path:
                    sys.path.insert(0, src_path)

                self.package = joblib.load(self.model_path)
                logger.info(f"✓ Model 6 (XGBoost RUL) loaded successfully from: {self.model_path}")
                
                # Sync features and mapping from package if present
                if hasattr(self.package, "features") and self.package.features:
                    self.features = self.package.features
                if hasattr(self.package, "cat_mapping") and self.package.cat_mapping:
                    self.cat_mapping = self.package.cat_mapping
                if hasattr(self.package, "cat_features") and self.package.cat_features:
                    self.cat_features = self.package.cat_features
            except Exception as e:
                logger.error(f"Failed to load RUL model from '{self.model_path}': {e}")
                self.package = None
        else:
            logger.warning(f"RUL model artifact not found at: {self.model_path}")
            self.package = None

    def is_loaded(self) -> bool:
        return self.package is not None

    def get_model_metadata(self) -> Dict[str, Any]:
        """Returns technical specifications of Model 6."""
        return {
            "model_id": "model_6_rul_xgboost",
            "name": "Remaining Useful Life (RUL) Prediction Engine",
            "task": "Degradation Rate (µm/cycle) & Remaining Cutting Cycles to EOL",
            "framework": "XGBoost (XGBRegressor + Physics Transform)",
            "model_weights": os.path.basename(self.model_path),
            "weights_path": self.model_path,
            "status": "ONLINE" if self.is_loaded() else "OFFLINE",
            "feature_count": len(self.features),
            "target_variable": "robust_causal_slope (µm/cycle)",
            "target_transform": "Log1p_Positive / expm1",
            "target_unit": "cycles",
            "eol_threshold_um": self.eol_threshold_um,
            "training_metrics": self.metadata.get("training_diagnostics", {
                "mae": 0.379,
                "rmse": 3.169,
                "r2": 0.595
            }),
            "warning_threshold_cycles": settings.RUL_WARNING_THRESHOLD_CYCLES,
            "critical_threshold_cycles": settings.RUL_CRITICAL_THRESHOLD_CYCLES,
        }

    def _preprocess(self, df: pd.DataFrame) -> pd.DataFrame:
        """Applies exact categorical normalization and encoding used in training."""
        df_clean = df.copy()

        # 1. Categorical normalization rule (e.g. 'RVS 304' -> 'RVS304')
        if "material" in df_clean.columns:
            df_clean["material"] = df_clean["material"].astype(str).replace("RVS 304", "RVS304")

        # 2. Categorical integer/float encoding
        for col in self.cat_features:
            if col in df_clean.columns:
                cats = self.cat_mapping.get(col, [])
                mapping = {str(c): float(i) for i, c in enumerate(cats)}
                df_clean[col] = df_clean[col].astype(str).map(mapping).fillna(-1.0).astype(float)
            else:
                df_clean[col] = -1.0

        # 3. Ensure all numerical features are clean floats (fill missing with np.nan for XGBoost)
        for col in self.features:
            if col not in self.cat_features:
                if col not in df_clean.columns:
                    df_clean[col] = np.nan
                else:
                    df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce").astype(float)

        # 4. Strict feature ordering with clean float dtypes
        return df_clean[self.features].astype(float)

    def predict_rul(
        self,
        features: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Runs XGBoost RUL inference on input feature vector.
        
        Returns:
            Structured dictionary with predicted RUL (cycles), wear rate, and operational status.
        """
        start_time = time.perf_counter()

        if not self.is_loaded():
            return {
                "available": False,
                "error": "RUL model is not loaded",
                "rul_value": None,
                "unit": "cycles",
                "rul_status": "MODEL_OFFLINE",
                "latency_ms": 0.0,
            }

        # Convert input to DataFrame
        if isinstance(features, dict):
            df = pd.DataFrame([features])
        elif isinstance(features, list):
            df = pd.DataFrame(features)
        elif isinstance(features, pd.DataFrame):
            df = features.copy()
        else:
            return {
                "available": False,
                "error": f"Invalid input features type: {type(features)}",
                "rul_value": None,
                "unit": "cycles",
                "rul_status": "INVALID_INPUT_TYPE",
                "latency_ms": 0.0,
            }

        if df.empty:
            return {
                "available": False,
                "error": "Input features DataFrame is empty",
                "rul_value": None,
                "unit": "cycles",
                "rul_status": "EMPTY_INPUT",
                "latency_ms": 0.0,
            }

        try:
            # 1. Preprocess input according to model schema
            X = self._preprocess(df)

            # 2. Underlying XGBoost forward pass
            underlying_model = self.package.model if hasattr(self.package, "model") else self.package
            transformed_preds = underlying_model.predict(X)

            # 3. Inverse transformation: predicted wear rate in um/cycle
            wear_rates = np.expm1(transformed_preds)

            results = []
            for i in range(len(df)):
                current_wear = df["wear"].iloc[i] if "wear" in df.columns else (
                    df["current_wear"].iloc[i] if "current_wear" in df.columns else (
                        df["current_wear_um"].iloc[i] if "current_wear_um" in df.columns else np.nan
                    )
                )
                rate = float(wear_rates[i])

                # 4. Physics and safety bounds
                if pd.isna(current_wear) or current_wear is None:
                    rul = None
                    status = "UNAVAILABLE_MISSING_WEAR"
                    health_status = "UNKNOWN"
                elif float(current_wear) >= self.eol_threshold_um:
                    rul = 0.0
                    status = "EOL_REACHED"
                    health_status = "CRITICAL"
                elif pd.isna(rate) or rate <= 0:
                    rul = None
                    status = "UNRELIABLE_NON_POSITIVE_WEAR_RATE"
                    health_status = "UNKNOWN"
                elif rate < 0.05:
                    rul = None
                    status = "UNRELIABLE_NEAR_ZERO_WEAR_RATE"
                    health_status = "UNKNOWN"
                else:
                    rul = max(0.0, float((self.eol_threshold_um - float(current_wear)) / rate))
                    status = "VALID"
                    
                    if rul <= settings.RUL_CRITICAL_THRESHOLD_CYCLES:
                        health_status = "CRITICAL"
                    elif rul <= settings.RUL_WARNING_THRESHOLD_CYCLES:
                        health_status = "WARNING"
                    else:
                        health_status = "HEALTHY"

                results.append({
                    "available": status in ["VALID", "EOL_REACHED"],
                    "rul_value": round(rul, 1) if rul is not None else None,
                    "unit": "cycles",
                    "wear_rate_um_per_cycle": round(rate, 4),
                    "current_wear_um": round(float(current_wear), 2) if not pd.isna(current_wear) and current_wear is not None else None,
                    "eol_threshold_um": self.eol_threshold_um,
                    "rul_status": status,
                    "health_status": health_status,
                })

            latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

            # Return single dictionary if input was a single row
            if len(results) == 1:
                res = results[0]
                res["model"] = "xgb_rul_final"
                res["latency_ms"] = latency_ms
                return res

            return {
                "available": True,
                "count": len(results),
                "predictions": results,
                "model": "xgb_rul_final",
                "latency_ms": latency_ms,
            }

        except Exception as e:
            logger.error(f"RUL inference calculation error: {e}", exc_info=True)
            return {
                "available": False,
                "error": str(e),
                "rul_value": None,
                "unit": "cycles",
                "rul_status": "INFERENCE_ERROR",
                "latency_ms": round((time.perf_counter() - start_time) * 1000.0, 2),
            }

    def build_feature_vector_from_context(
        self,
        tool_id: Optional[str],
        current_wear_um: Optional[float],
        db = None,
        sensor_data: Optional[List[float]] = None,
        machining_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds the 89-feature schema dictionary using actual SQLite inspection history,
        tool metadata, current wear measurement, and optional sensors.
        """
        feature_dict = {}

        # 1. Base wear feature
        wear_val = float(current_wear_um) if current_wear_um is not None else np.nan
        feature_dict["wear"] = wear_val

        # 2. Historical features from SQLite database
        prev_wear = np.nan
        wear_delta = np.nan
        rolling_mean_3 = np.nan
        rolling_std_3 = np.nan
        rolling_mean_5 = np.nan
        rolling_std_5 = np.nan
        recent_wear_rate = np.nan
        cycle_idx = 1.0

        material_str = "CK45"
        coating_str = "other"

        if db and tool_id:
            try:
                from backend.database.models import Tool, InspectionRecord
                tool_record = db.query(Tool).filter(Tool.tool_id == tool_id).first()
                if tool_record:
                    if "304" in str(tool_record.material):
                        material_str = "RVS304"
                    elif "CK45" in str(tool_record.material):
                        material_str = "CK45"
                    
                    if tool_record.coating:
                        coating_str = "other" if tool_record.coating != "MISSING_CATEGORY" else "MISSING_CATEGORY"

                # Past inspections for this tool
                past_insps = db.query(InspectionRecord).filter(
                    InspectionRecord.tool_id == tool_id,
                    InspectionRecord.wear_um.isnot(None)
                ).order_by(InspectionRecord.timestamp.asc()).all()

                cycle_idx = float(len(past_insps) + 1)

                if past_insps:
                    past_wears = [r.wear_um for r in past_insps if r.wear_um is not None]
                    if past_wears:
                        prev_wear = float(past_wears[-1])
                        if not pd.isna(wear_val):
                            wear_delta = float(wear_val - prev_wear)

                        # Rolling stats
                        all_wears = past_wears + ([wear_val] if not pd.isna(wear_val) else [])
                        if len(all_wears) >= 3:
                            rolling_mean_3 = float(np.mean(all_wears[-3:]))
                            rolling_std_3 = float(np.std(all_wears[-3:]))
                        if len(all_wears) >= 5:
                            rolling_mean_5 = float(np.mean(all_wears[-5:]))
                            rolling_std_5 = float(np.std(all_wears[-5:]))
                        if len(all_wears) >= 2:
                            recent_wear_rate = float(all_wears[-1] - all_wears[-2])
            except Exception as e:
                logger.warning(f"Error querying SQLite for RUL feature context: {e}")

        feature_dict["cycle_index"] = cycle_idx
        feature_dict["prev_wear"] = prev_wear
        feature_dict["wear_delta"] = wear_delta
        feature_dict["rolling_mean_3"] = rolling_mean_3
        feature_dict["rolling_std_3"] = rolling_std_3
        feature_dict["rolling_mean_5"] = rolling_mean_5
        feature_dict["rolling_std_5"] = rolling_std_5
        feature_dict["recent_wear_rate"] = recent_wear_rate

        # 3. Cutting parameters (defaults from standard turning/milling setup if unspecified)
        params = machining_params or {}
        feature_dict["Vc"] = params.get("Vc", 180.0)
        feature_dict["n"] = params.get("n", 1200.0)
        feature_dict["fz"] = params.get("fz", 0.15)
        feature_dict["Vf"] = params.get("Vf", 360.0)
        feature_dict["Ae"] = params.get("Ae", 2.0)
        feature_dict["Ap"] = params.get("Ap", 1.5)
        feature_dict["z"] = params.get("z", 4.0)

        # 4. Categoricals
        feature_dict["material"] = material_str
        feature_dict["crop"] = "1150, 670, 1750, 1070"
        feature_dict["Coating"] = coating_str

        # 5. Sensor telemetry features if provided
        if sensor_data and len(sensor_data) >= 5:
            # Map available 5 sensor channels (e.g. Acc, Acoustic, Fx, Fy, Fz RMS)
            feature_dict["Acc_rms"] = float(sensor_data[0])
            feature_dict["Acoustic_rms"] = float(sensor_data[1])
            feature_dict["Fx_rms"] = float(sensor_data[2])
            feature_dict["Fy_rms"] = float(sensor_data[3])
            feature_dict["Fz_rms"] = float(sensor_data[4])

        return feature_dict

rul_service = RULService()
