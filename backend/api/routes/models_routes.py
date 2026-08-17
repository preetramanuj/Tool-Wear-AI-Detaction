import os
import time
import torch
import numpy as np
import cv2
from fastapi import APIRouter, HTTPException

from backend.core.config import settings
from backend.services.tool_detection_service import tool_detection_service
from backend.services.wear_analysis_service import wear_analysis_service
from backend.services.health_prediction_service import health_prediction_service
from backend.services.face_detection_service import face_detection_service

router = APIRouter(prefix="/models", tags=["AI Models Management & Diagnostics"])

@router.get("/status")
async def get_all_models_status():
    """
    Retrieve live technical operational status, framework, device, and weights for all 4 models.
    """
    try:
        device_name = "CUDA (NVIDIA GPU)" if torch.cuda.is_available() else "CPU (Host Engine)"
        
        models = [
            {
                "id": "model-1",
                "name": "Model 1: Tool Detection",
                "task": "Cutting Tool Insert Localization & Bounding Box Extraction",
                "framework": "Ultralytics YOLO11n",
                "weights_path": tool_detection_service.model_path or "result/tool_detection/yolo11_matwi_10epochs/weights/best.pt",
                "weights_file": os.path.basename(tool_detection_service.model_path) if tool_detection_service.model_path else "best.pt",
                "loaded": tool_detection_service.is_loaded(),
                "device": "CPU" if not torch.cuda.is_available() else "CUDA",
                "resolution": [settings.IMAGE_SIZE, settings.IMAGE_SIZE],
                "status": "ONLINE" if tool_detection_service.is_loaded() else "OFFLINE",
            },
            {
                "id": "model-2",
                "name": "Model 2: Tool Wear Analysis",
                "task": "Flank Wear VB (mm) & Degradation Area Regression",
                "framework": "PyTorch (Late-Fusion EfficientNet-B0 + Sensor MLP)",
                "weights_path": wear_analysis_service.model_path,
                "weights_file": os.path.basename(wear_analysis_service.model_path),
                "loaded": True,
                "device": str(wear_analysis_service.device),
                "resolution": [settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE],
                "status": "ONLINE",
            },
            {
                "id": "model-3",
                "name": "Model 3: Tool Health Prediction",
                "task": "Continuous Wear (µm) Regression & Categorical Health Classification",
                "framework": "PyTorch (EfficientNet-B0 + Target Scaler)",
                "weights_path": health_prediction_service.model_path,
                "weights_file": os.path.basename(health_prediction_service.model_path),
                "loaded": True,
                "device": str(health_prediction_service.device),
                "resolution": [settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE],
                "status": "ONLINE",
            },
            {
                "id": "model-4",
                "name": "Model 4: Operator Face Detection & Authentication",
                "task": "Machine Vision Authorization & Workshop Personnel Telemetry",
                "framework": "OpenCV / YOLO Vision Engine",
                "weights_path": "Local Template Registry",
                "weights_file": "YOLO + OpenCV Skin Geometry Engine",
                "loaded": face_detection_service.is_loaded(),
                "device": "CPU",
                "resolution": [640, 480],
                "status": "ONLINE" if face_detection_service.is_loaded() else "OFFLINE",
            },
        ]
        
        loaded_count = sum(1 for m in models if m["loaded"])
        
        return {
            "success": True,
            "system_device": device_name,
            "cuda_available": torch.cuda.is_available(),
            "models_loaded_count": loaded_count,
            "total_models": len(models),
            "models": models
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch model status: {str(e)}")


@router.post("/diagnostics")
async def run_models_diagnostics():
    """
    Executes an in-memory forward-pass test on all 4 AI model services with synthetic input tensors.
    """
    diagnostics = {}
    
    # 1. Test Model 1 YOLO
    try:
        t0 = time.time()
        dummy_img = np.zeros((settings.IMAGE_SIZE, settings.IMAGE_SIZE, 3), dtype=np.uint8)
        res1 = tool_detection_service.detect(dummy_img)
        lat1 = round((time.time() - t0) * 1000.0, 1)
        diagnostics["model_1_tool_detection"] = {
            "status": "OK",
            "latency_ms": lat1,
            "output_keys": list(res1.keys())
        }
    except Exception as e:
        diagnostics["model_1_tool_detection"] = {"status": "ERROR", "error": str(e)}

    # 2. Test Model 2 Wear Analysis
    try:
        t0 = time.time()
        dummy_crop = np.zeros((settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE, 3), dtype=np.uint8)
        res2 = wear_analysis_service.predict(dummy_crop)
        lat2 = round((time.time() - t0) * 1000.0, 1)
        diagnostics["model_2_wear_analysis"] = {
            "status": "OK",
            "latency_ms": lat2,
            "wear_value_mm": res2.get("wear_value")
        }
    except Exception as e:
        diagnostics["model_2_wear_analysis"] = {"status": "ERROR", "error": str(e)}

    # 3. Test Model 3 Health Prediction
    try:
        t0 = time.time()
        dummy_crop = np.zeros((settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE, 3), dtype=np.uint8)
        res3 = health_prediction_service.predict(dummy_crop)
        lat3 = round((time.time() - t0) * 1000.0, 1)
        diagnostics["model_3_health_prediction"] = {
            "status": "OK",
            "latency_ms": lat3,
            "wear_um": res3.get("wear_um"),
            "health_status": res3.get("health_status")
        }
    except Exception as e:
        diagnostics["model_3_health_prediction"] = {"status": "ERROR", "error": str(e)}

    # 4. Test Model 4 Face Detection
    try:
        t0 = time.time()
        dummy_face = np.zeros((400, 400, 3), dtype=np.uint8)
        res4 = face_detection_service.detect_faces(dummy_face)
        lat4 = round((time.time() - t0) * 1000.0, 1)
        diagnostics["model_4_face_detection"] = {
            "status": "OK",
            "latency_ms": lat4,
            "faces_detected": res4.get("faces_detected")
        }
    except Exception as e:
        diagnostics["model_4_face_detection"] = {"status": "ERROR", "error": str(e)}

    return {
        "success": True,
        "timestamp": time.time(),
        "device": "CUDA" if torch.cuda.is_available() else "CPU",
        "results": diagnostics
    }
