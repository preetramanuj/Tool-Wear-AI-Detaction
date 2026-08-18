import os
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, Union, Optional, List

import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as T
import joblib

from backend.core.config import settings
from backend.utils.model_loader import get_optimal_device, find_first_existing_file
from ai.wear_analysis.models.phase3b_gated_model import Phase3BGatedModel

logger = logging.getLogger(__name__)

class WearAnalysisService:
    """
    Model 2: Multimodal Tool Wear Analysis Service.
    Loads and runs inference with `Phase3BGatedModel` from `ai/wear_analysis/artifacts/final/wear_analysis_multimodal_final.pth`
    and `target_scaler.pkl`.
    Applies image preprocessing (384x384, ImageNet normalization) and multimodal gating.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        scaler_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
        device: str = "auto"
    ):
        self.device = get_optimal_device(device)
        self.model_path = self._resolve_model_path(model_path)
        self.scaler_path = self._resolve_scaler_path(scaler_path)
        self.metadata_path = self._resolve_metadata_path(metadata_path)
        
        self.target_scaler = self._load_scaler()
        self.metadata = self._load_metadata()
        self.model = self._load_model()
        
        # Standard preprocessing pipeline as trained (384x384, ImageNet normalization)
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
        default_path = os.path.join(settings.BASE_DIR, "ai", "wear_analysis", "artifacts", "final", "wear_analysis_multimodal_final.pth")
        if os.path.exists(default_path):
            return os.path.abspath(default_path)
        raise FileNotFoundError(f"Wear analysis model weights not found in: {settings.WEAR_ANALYSIS_MODEL_PATHS}")

    def _resolve_scaler_path(self, scaler_path: Optional[str]) -> Optional[str]:
        if scaler_path and os.path.exists(scaler_path):
            return os.path.abspath(scaler_path)
        if hasattr(settings, "WEAR_SCALER_PATH") and os.path.exists(settings.WEAR_SCALER_PATH):
            return os.path.abspath(settings.WEAR_SCALER_PATH)
        cand = os.path.join(settings.BASE_DIR, "ai", "wear_analysis", "artifacts", "final", "target_scaler.pkl")
        if os.path.exists(cand):
            return os.path.abspath(cand)
        return None

    def _resolve_metadata_path(self, metadata_path: Optional[str]) -> Optional[str]:
        if metadata_path and os.path.exists(metadata_path):
            return os.path.abspath(metadata_path)
        if hasattr(settings, "WEAR_METADATA_PATH") and os.path.exists(settings.WEAR_METADATA_PATH):
            return os.path.abspath(settings.WEAR_METADATA_PATH)
        cand = os.path.join(settings.BASE_DIR, "ai", "wear_analysis", "artifacts", "final", "final_model_metadata.json")
        if os.path.exists(cand):
            return os.path.abspath(cand)
        return None

    def _load_scaler(self):
        if self.scaler_path and os.path.exists(self.scaler_path):
            try:
                scaler = joblib.load(self.scaler_path)
                logger.info(f"✓ Wear Analysis TargetScaler loaded from {self.scaler_path}")
                return scaler
            except Exception as e:
                logger.warning(f"Could not load wear target scaler: {e}")
        return None

    def _load_metadata(self) -> Dict[str, Any]:
        if self.metadata_path and os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not parse wear model metadata JSON: {e}")
        return {}

    def _load_model(self) -> Phase3BGatedModel:
        logger.info(f"Loading Model 2 (Wear Analysis Phase3BGatedModel) from '{self.model_path}' on '{self.device}'...")
        try:
            model = Phase3BGatedModel(target_scaler=self.target_scaler, sensor_dim=5, embedding_dim=256)
            checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
            
            # Extract state dict from dictionary checkpoint if present
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
                if self.target_scaler is None and "target_scaler" in checkpoint:
                    self.target_scaler = checkpoint["target_scaler"]
                    model.target_scaler = self.target_scaler
            else:
                state_dict = checkpoint
                
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()
            logger.info("✓ Model 2 (Wear Analysis) weights loaded successfully.")
            return model
        except Exception as e:
            logger.error(f"Failed loading Wear Analysis model: {e}")
            raise e

    def analyze_wear(
        self,
        image_input: Union[str, Path, np.ndarray, Image.Image, bytes],
        sensor_data: Optional[Union[List[float], np.ndarray]] = None,
        apply_calibration: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze tool wear on cropped tool ROI image and optional sensor RMS features.
        
        Returns:
            Dict containing:
                - wear_um: Flank wear in micrometers (µm)
                - wear_value: Flank wear VB in millimeters (mm)
                - wear_area: Estimated wear area (mm²)
                - wear_status: NORMAL / MODERATE / SEVERE
                - input_modalities: "IMAGE ONLY" or "IMAGE + SENSOR"
                - model_name, device, latency_ms
        """
        start_time = time.perf_counter()
        
        # 1. Preprocess Image
        pil_img = self._to_pil_rgb(image_input)
        img_tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        
        # 2. Sensor RMS features
        sensor_tensor = None
        mode_str = "IMAGE ONLY"
        if sensor_data is not None:
            s_arr = np.array(sensor_data, dtype=np.float32).flatten()
            if len(s_arr) > 0 and not np.all(s_arr == 0):
                padded = np.zeros(5, dtype=np.float32)
                cols = min(len(s_arr), 5)
                padded[:cols] = s_arr[:cols]
                sensor_tensor = torch.tensor(padded, dtype=torch.float32).unsqueeze(0).to(self.device)
                mode_str = "IMAGE + SENSOR"
                
        # 3. Model Forward Pass
        with torch.no_grad():
            pred_dict = self.model.predict(img_tensor, sensor_tensor)
            wear_um_raw = pred_dict.get("predicted_wear_um", 0.0)
            
        # Ensure wear is a non-negative float
        wear_um = max(0.0, float(wear_um_raw))
        wear_vb_mm = round(wear_um / 1000.0, 4)
        
        # Estimate wear area (mm²) based on flank wear band geometry ~ VB * approx contact length (1.25mm)
        wear_area_mm2 = max(0.0, round(wear_vb_mm * 1.25 + 0.02 * (wear_vb_mm ** 1.5), 3))
        
        # Wear condition status categorization
        if wear_um < 150.0:
            wear_status = "NORMAL"
        elif wear_um < 250.0:
            wear_status = "MODERATE"
        else:
            wear_status = "SEVERE"
            
        latency_ms = (time.perf_counter() - start_time) * 1000.0
        
        return {
            "status": "success",
            "model_name": "Phase3BGatedModel (EfficientNet-B0 + Sensor MLP Gated Fusion)",
            "model_version": pred_dict.get("model_version", "ToolGuard-AI-WearAnalysis-Phase3B-Final-v1.0"),
            "model_weights": os.path.basename(self.model_path),
            "model_source": "ai/wear_analysis/artifacts/final",
            "wear_um": round(wear_um, 2),
            "wear_value": wear_vb_mm,
            "wear_unit": "mm",
            "wear_area": wear_area_mm2,
            "wear_area_unit": "mm²",
            "wear_status": wear_status,
            "input_modalities": mode_str,
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
            "model_id": "model_2_wear_analysis",
            "model_name": "ToolGuard Multimodal Wear Analysis (Phase3B Gated Model)",
            "weights_path": "ai/wear_analysis/artifacts/final/wear_analysis_multimodal_final.pth",
            "weights_filename": os.path.basename(self.model_path),
            "file_size_mb": round(size_mb, 2),
            "device": str(self.device),
            "architecture": "EfficientNet-B0 + Sensor MLP (Fusion dim 514, Gating Network)",
            "resolution": [settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE],
            "target": "Flank Wear (µm)",
            "scaler_loaded": self.target_scaler is not None,
            "status": "ONLINE" if self.is_loaded() else "OFFLINE",
        }

wear_analysis_service = WearAnalysisService()
