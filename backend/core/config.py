import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings

# Project Root Directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "ToolGuard AI - Predictive Tool Wear & Machine Vision System"
    VERSION: str = "2.1.0"
    API_V1_STR: str = "/api/v1"
    BASE_DIR: Path = BASE_DIR
    
    # Model 1: Tool Detection Weights
    TOOL_DETECTION_MODEL_PATHS: List[str] = [
        str(BASE_DIR / "result" / "tool_detection" / "yolo11_matwi_10epochs" / "weights" / "best.pt"),
        str(BASE_DIR / "result" / "best.pt"),
        str(BASE_DIR / "models" / "tool_detection" / "checkpoints" / "best.pt"),
    ]
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.25
    DEFAULT_IOU_THRESHOLD: float = 0.45
    IMAGE_SIZE: int = 640
    
    # Person Detection Model Weights (COCO-trained YOLO11n for detecting persons & industrial objects)
    PERSON_DETECTION_MODEL_PATHS: List[str] = [
        str(BASE_DIR / "yolo11n.pt"),
        str(BASE_DIR / "models" / "yolo11n.pt"),
    ]
    
    # Model 2: Wear Analysis Weights (NEW Phase3B Multimodal Gated Model)
    WEAR_ANALYSIS_MODEL_PATHS: List[str] = [
        str(BASE_DIR / "ai" / "wear_analysis" / "artifacts" / "final" / "wear_analysis_multimodal_final.pth"),
        str(BASE_DIR / "models" / "wear_analysis" / "final_optimized_384px.pth"),
    ]
    WEAR_SCALER_PATH: str = str(BASE_DIR / "ai" / "wear_analysis" / "artifacts" / "final" / "target_scaler.pkl")
    WEAR_METADATA_PATH: str = str(BASE_DIR / "ai" / "wear_analysis" / "artifacts" / "final" / "final_model_metadata.json")
    WEAR_CONFIG_PATH: str = str(BASE_DIR / "config" / "wear_analysis.json")
    WEAR_CALIBRATION_PATH: str = str(BASE_DIR / "ai" / "wear_analysis" / "calibration" / "output_calibration.json")
    WEAR_IMAGE_SIZE: int = 384
    
    # Model 3: Tool Health Prediction Weights & Scaler
    HEALTH_MODEL_PATHS: List[str] = [
        str(BASE_DIR / "models" / "health_prediction" / "image_only_wear" / "model.pt"),
    ]
    HEALTH_SCALER_PATH: str = str(BASE_DIR / "models" / "health_prediction" / "image_only_wear" / "target_scaler.pkl")
    HEALTH_METADATA_PATH: str = str(BASE_DIR / "models" / "health_prediction" / "image_only_wear" / "model_metadata.json")
    
    # Health Thresholds in micrometers (um)
    THRESHOLD_HEALTHY_MAX_UM: float = 150.0
    THRESHOLD_WARNING_MAX_UM: float = 250.0
    
    # Model 4: Face Detection & Verification
    FACE_MODEL_BACKEND: str = "retinaface"
    FACE_REGISTERED_DIR: str = str(BASE_DIR / "storage" / "face" / "registered")
    FACE_VERIFY_INPUT_DIR: str = str(BASE_DIR / "storage" / "face" / "verification")
    
    # Model 6: Remaining Useful Life (RUL) Prediction (XGBoost)
    RUL_MODEL_PATHS: List[str] = [
        str(BASE_DIR / "models" / "rul" / "final" / "xgb_rul_final.pkl"),
    ]
    RUL_FEATURE_SCHEMA_PATH: str = str(BASE_DIR / "models" / "rul" / "final" / "feature_schema.json")
    RUL_METADATA_PATH: str = str(BASE_DIR / "models" / "rul" / "final" / "xgb_rul_final_metadata.json")
    RUL_EOL_THRESHOLD_UM: float = 300.0
    RUL_WARNING_THRESHOLD_CYCLES: float = 50.0
    RUL_CRITICAL_THRESHOLD_CYCLES: float = 15.0

    # Person-Tool Association Parameters
    ASSOCIATION_HOLDING_DISTANCE_RATIO: float = 0.35  # Relative to person height
    ASSOCIATION_NEAR_DISTANCE_RATIO: float = 0.80     # Relative to person height

    # Storage and Artifacts
    STORAGE_DIR: str = str(BASE_DIR / "storage")
    DATA_DIR: str = str(BASE_DIR / "backend" / "data")
    UPLOAD_DIR: str = str(BASE_DIR / "storage" / "uploaded_images")
    PROCESSED_DIR: str = str(BASE_DIR / "storage" / "processed_images")
    REPORTS_DIR: str = str(BASE_DIR / "storage" / "reports")
    PREDICTIONS_DIR: str = str(BASE_DIR / "result" / "predictions")
    
    # Database Configuration (SQLite: backend/data/toolguard.db)
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'backend' / 'data' / 'toolguard.db'}"
    
    # Device Configuration ('auto', 'cuda', 'mps', or 'cpu')
    DEVICE: str = "auto"
    
    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()

# Ensure critical directories exist
for folder in [
    settings.STORAGE_DIR,
    settings.DATA_DIR,
    settings.UPLOAD_DIR,
    settings.PROCESSED_DIR,
    settings.REPORTS_DIR,
    settings.PREDICTIONS_DIR,
    settings.FACE_REGISTERED_DIR,
    settings.FACE_VERIFY_INPUT_DIR,
]:
    os.makedirs(folder, exist_ok=True)
