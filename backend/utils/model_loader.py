import os
import logging
from pathlib import Path
from typing import Optional, List
import torch
from ultralytics import YOLO

from backend.core.config import settings

logger = logging.getLogger(__name__)

def get_optimal_device(device_setting: str = "auto") -> str:
    """
    Determine the optimal compute device (CUDA / MPS / CPU).
    Gracefully falls back to CPU if GPU is unavailable.
    """
    if device_setting.lower() == "auto":
        if torch.cuda.is_available():
            return "cuda:0"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
    return device_setting

def find_first_existing_file(candidate_paths: List[str]) -> Optional[str]:
    """Search for the first available path among candidates."""
    for path_str in candidate_paths:
        if path_str and os.path.exists(path_str):
            return os.path.abspath(path_str)
    return None

def find_model_weights(preferred_path: Optional[str] = None) -> str:
    """
    Search for YOLO PyTorch .pt tool detection weights.
    """
    if preferred_path and os.path.exists(preferred_path):
        return os.path.abspath(preferred_path)
    
    found = find_first_existing_file(settings.TOOL_DETECTION_MODEL_PATHS)
    if found:
        logger.info(f"Found YOLO tool detection model weights at: {found}")
        return found
        
    # Search recursively in result/ for any .pt file
    result_dir = settings.BASE_DIR / "result"
    if result_dir.exists():
        for pt_file in result_dir.rglob("*.pt"):
            if pt_file.is_file() and not pt_file.name.startswith("last"):
                logger.info(f"Discovered model weights via search: {pt_file}")
                return str(pt_file)
            
    raise FileNotFoundError(
        f"No YOLO tool detection weights found in candidate locations: {settings.TOOL_DETECTION_MODEL_PATHS}"
    )

def load_yolo_model(model_path: Optional[str] = None, device: str = "auto") -> YOLO:
    """
    Load YOLO model instance with device configuration.
    """
    resolved_path = find_model_weights(model_path)
    resolved_device = get_optimal_device(device)
    
    logger.info(f"Loading YOLO model from '{resolved_path}' on device '{resolved_device}'...")
    model = YOLO(resolved_path)
    return model
