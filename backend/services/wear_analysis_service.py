import os
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, Union, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as T

from backend.core.config import settings
from backend.utils.model_loader import get_optimal_device, find_first_existing_file
from ai.wear_analysis.wear_measurement.model import LateFusionWearModel

logger = logging.getLogger(__name__)

class WearAnalysisService:
    """
    Model 2: Multimodal Tool Wear Analysis Service.
    Loads and runs inference with `LateFusionWearModel` from `models/wear_analysis/final_optimized_384px.pth`.
    Applies image preprocessing (384x384, ImageNet normalization) and linear calibration.
    """

    def __init__(self, model_path: Optional[str] = None, device: str = "auto"):
        self.device = get_optimal_device(device)
        self.model_path = self._resolve_model_path(model_path)
        self.calibration_params = self._load_calibration_params()
        self.model = self._load_model()
        
        # Standard preprocessing pipeline as trained
        self.transform = T.Compose([
            T.Resize((settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def is_loaded(self) -> bool:
        return self.model is not None

    def _resolve_model_path(self, model_path: Optional[str]) -> str:
        if model_path and os.path.exists(model_path):
            return os.path.abspath(model_path)
        found = find_first_existing_file(settings.WEAR_ANALYSIS_MODEL_PATHS)
        if found:
            return found
        raise FileNotFoundError(f"Wear analysis model weights not found in: {settings.WEAR_ANALYSIS_MODEL_PATHS}")

    def _load_calibration_params(self) -> Dict[str, Any]:
        if os.path.exists(settings.WEAR_CALIBRATION_PATH):
            try:
                with open(settings.WEAR_CALIBRATION_PATH, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not parse calibration JSON: {e}")
        return {"linear": {"slope": 1.2554, "intercept": -0.5844}}

    def _load_model(self) -> LateFusionWearModel:
        logger.info(f"Loading Wear Analysis Model from '{self.model_path}' on device '{self.device}'...")
        model = LateFusionWearModel(sensor_dim=5, embedding_dim=256)
        state_dict = torch.load(self.model_path, map_location=self.device, weights_only=False)
        model.load_state_dict(state_dict)
        model.to(self.device)
        model.eval()
        return model

    def analyze_wear(
        self,
        image_input: Union[str, Path, np.ndarray, Image.Image, bytes],
        sensor_data: Optional[Union[List[float], np.ndarray]] = None,
        apply_calibration: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze tool wear on cropped tool ROI image and optional sensor RMS features.
        
        Returns:
            Dict containing wear_value (VB in mm), wear_area (mm²), status, latency.
        """
        start_time = time.perf_counter()
        
        # 1. Preprocess Image
        pil_img = self._to_pil_rgb(image_input)
        img_tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        
        # 2. Sensor RMS features (defaults to zero vector if purely vision-based)
        if sensor_data is not None:
            sensor_arr = np.array(sensor_data, dtype=np.float32).reshape(1, -1)
            if sensor_arr.shape[1] != 5:
                # pad or slice to 5 dim
                sensor_padded = np.zeros((1, 5), dtype=np.float32)
                cols = min(sensor_arr.shape[1], 5)
                sensor_padded[0, :cols] = sensor_arr[0, :cols]
                sensor_arr = sensor_padded
        else:
            sensor_arr = np.zeros((1, 5), dtype=np.float32)
            
        sensor_tensor = torch.tensor(sensor_arr, dtype=torch.float32, device=self.device)
        
        # 3. Model Forward Pass
        with torch.no_grad():
            raw_pred = self.model(img_tensor, sensor_tensor)
            raw_wear_value = float(raw_pred.cpu().item())
            
        # 4. Calibration & Postprocessing
        calibrated_wear = raw_wear_value
        if apply_calibration and "linear" in self.calibration_params:
            slope = self.calibration_params["linear"].get("slope", 1.0)
            intercept = self.calibration_params["linear"].get("intercept", 0.0)
            calibrated_wear = slope * raw_wear_value + intercept
            
        # Physical constraints: wear cannot be negative
        final_wear_vb_mm = max(0.0, float(calibrated_wear))
        
        # Estimate wear area (mm²) based on flank wear band geometry ~ VB * approx contact length (1.2mm)
        wear_area_mm2 = max(0.0, round(final_wear_vb_mm * 1.25 + 0.02 * (final_wear_vb_mm ** 1.5), 3))
        
        # Wear condition status
        if final_wear_vb_mm < 0.15:
            wear_status = "NORMAL"
        elif final_wear_vb_mm < 0.30:
            wear_status = "MODERATE"
        else:
            wear_status = "SEVERE"
            
        latency_ms = (time.perf_counter() - start_time) * 1000.0
        
        return {
            "status": "success",
            "model_name": "LateFusionWearModel (EfficientNet-B0 + Sensor RMS)",
            "model_weights": os.path.basename(self.model_path),
            "wear_value": round(final_wear_vb_mm, 4),
            "wear_unit": "mm",
            "wear_area": round(wear_area_mm2, 3),
            "wear_area_unit": "mm²",
            "wear_status": wear_status,
            "raw_prediction": round(raw_wear_value, 4),
            "calibrated": apply_calibration,
            "device": str(self.device),
            "inference_latency_ms": round(latency_ms, 2)
        }

    def predict(
        self,
        image_input: Union[str, Path, np.ndarray, Image.Image, bytes],
        sensor_features: Optional[Union[List[float], np.ndarray]] = None,
        sensor_data: Optional[Union[List[float], np.ndarray]] = None,
    ) -> Dict[str, Any]:
        """Alias for analyze_wear"""
        data = sensor_features if sensor_features is not None else sensor_data
        return self.analyze_wear(image_input, sensor_data=data)

    def _to_pil_rgb(self, image_input: Union[str, Path, np.ndarray, Image.Image, bytes]) -> Image.Image:
        if isinstance(image_input, Image.Image):
            return image_input.convert("RGB")
        elif isinstance(image_input, (str, Path)):
            return Image.open(str(image_input)).convert("RGB")
        elif isinstance(image_input, bytes):
            import io
            return Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            if len(image_input.shape) == 2:
                return Image.fromarray(image_input).convert("RGB")
            # Assume BGR if coming from OpenCV
            rgb_arr = cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
            return Image.fromarray(rgb_arr)
        else:
            raise TypeError(f"Unsupported image format: {type(image_input)}")

    def get_model_metadata(self) -> Dict[str, Any]:
        size_mb = os.path.getsize(self.model_path) / (1024 * 1024) if os.path.exists(self.model_path) else 0.0
        return {
            "model_name": "ToolGuard Wear Analysis (Late-Fusion EffNet-B0)",
            "weights_path": self.model_path,
            "weights_filename": os.path.basename(self.model_path),
            "file_size_mb": round(size_mb, 2),
            "device": str(self.device),
            "resolution": [settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE],
            "calibrated": True
        }

wear_analysis_service = WearAnalysisService()

