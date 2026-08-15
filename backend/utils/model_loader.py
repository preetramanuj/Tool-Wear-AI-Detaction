import os
import logging
from pathlib import Path
from typing import Optional
import torch
from ultralytics import YOLO

from backend.core.config import settings

logger = logging.getLogger(__name__)

def find_model_weights(preferred_path: Optional[str] = None) -> str:
    """
    Search for the PyTorch .pt model weights in candidate directories,
    prioritizing result/ folder locations.
    """
    if preferred_path and os.path.exists(preferred_path):
        return os.path.abspath(preferred_path)
    
    for candidate in settings.DEFAULT_MODEL_PATHS:
        if os.path.exists(candidate):
            logger.info(f"Found model weights at: {candidate}")
            return os.path.abspath(candidate)
            
    # Search recursively in result/ for any .pt file
    result_dir = Path(settings.PREDICTIONS_DIR).parent
    for pt_file in result_dir.rglob("*.pt"):
        if pt_file.is_file():
            logger.info(f"Discovered model weights via search: {pt_file}")
            return str(pt_file)
            
    raise FileNotFoundError(
        f"No model weights (.pt) found in candidate locations: {settings.DEFAULT_MODEL_PATHS}"
    )

def get_optimal_device(device_setting: str = "auto") -> str:
    """
    Determine the optimal compute device (CUDA / MPS / CPU).
    """
    if device_setting.lower() == "auto":
        if torch.cuda.is_available():
            return "cuda:0"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
    return device_setting

def load_yolo_model(model_path: Optional[str] = None, device: str = "auto") -> YOLO:
    """
    Load YOLO model instance with device configuration.
    """
    resolved_path = find_model_weights(model_path)
    resolved_device = get_optimal_device(device)
    
    logger.info(f"Loading YOLO model from '{resolved_path}' on device '{resolved_device}'...")
    model = YOLO(resolved_path)
    
    return model
