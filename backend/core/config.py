import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Project Root Directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "ToolGuard AI - Predictive Tool Wear Assessment"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Model Weights Configuration
    # Candidate search paths in result directory
    DEFAULT_MODEL_PATHS: List[str] = [
        str(BASE_DIR / "result" / "tool_detection" / "yolo11_matwi_10epochs" / "weights" / "best.pt"),
        str(BASE_DIR / "result" / "best.pt"),
        str(BASE_DIR / "models" / "tool_detection" / "checkpoints" / "best.pt"),
        str(BASE_DIR / "result" / "tool_detection" / "yolo11_matwi_10epochs" / "weights" / "last.pt"),
    ]
    
    # Inference Hyperparameters
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.25
    DEFAULT_IOU_THRESHOLD: float = 0.45
    IMAGE_SIZE: int = 640
    
    # Target Class Names
    CLASSES: dict = {0: "cutting_tool"}
    
    # Output and Predictions Directory
    PREDICTIONS_DIR: str = str(BASE_DIR / "result" / "predictions")
    
    # Device Configuration ('cpu', 'cuda', 'mps', or 'auto')
    DEVICE: str = "auto"
    
    model_config = {
        "case_sensitive": True,
        "env_file": ".env"
    }

settings = Settings()

# Ensure predictions directory exists
os.makedirs(settings.PREDICTIONS_DIR, exist_ok=True)

