import os
import time
import torch
import numpy as np
import cv2
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pathlib import Path

from backend.core.config import settings
from backend.services.tool_detection_service import tool_detection_service
from backend.services.wear_analysis_service import wear_analysis_service
from backend.services.health_prediction_service import health_prediction_service
from backend.services.face_detection_service import face_detection_service
from backend.services.rul_service import rul_service
from backend.services.process_optimization_service import process_optimization_service

router = APIRouter(prefix="/models", tags=["AI Models Management & Diagnostics"])

@router.get("/status")
async def get_all_models_status():
    """
    Retrieve live technical operational status, framework, device, and weights for all AI models.
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
                "classes": list(tool_detection_service.class_names.values()) if hasattr(tool_detection_service, "class_names") else ["cutting_tool"],
                "status": "ONLINE" if tool_detection_service.is_loaded() else "OFFLINE",
            },
            {
                "id": "model-2",
                "name": "Model 2: Tool Wear Analysis",
                "task": "Flank Wear VB (mm) & Degradation Area Gated Multimodal Regression",
                "framework": "PyTorch (Phase3BGatedModel: EfficientNet-B0 + Sensor MLP + Gating)",
                "weights_path": "ai/wear_analysis/artifacts/final/wear_analysis_multimodal_final.pth",
                "weights_file": os.path.basename(wear_analysis_service.model_path),
                "loaded": wear_analysis_service.is_loaded(),
                "device": str(wear_analysis_service.device),
                "resolution": [settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE],
                "target": "Flank Wear (µm) via target_scaler.pkl",
                "status": "ONLINE" if wear_analysis_service.is_loaded() else "OFFLINE",
            },
            {
                "id": "model-3",
                "name": "Model 3: Tool Health Prediction",
                "task": "Continuous Wear (µm) Regression & Categorical Health Classification",
                "framework": "PyTorch (EfficientNet-B0 + Target Scaler)",
                "weights_path": health_prediction_service.model_path,
                "weights_file": os.path.basename(health_prediction_service.model_path),
                "loaded": health_prediction_service.is_loaded(),
                "device": str(health_prediction_service.device),
                "resolution": [settings.WEAR_IMAGE_SIZE, settings.WEAR_IMAGE_SIZE],
                "status": "ONLINE" if health_prediction_service.is_loaded() else "OFFLINE",
            },
            {
                "id": "model-6",
                "name": "Model 6: Remaining Useful Life (RUL)",
                "task": "Wear Degradation Rate (µm/cycle) & Remaining Cycles to EOL (300 µm)",
                "framework": "XGBoost (XGBRegressor + Physics Transform)",
                "weights_path": rul_service.model_path,
                "weights_file": os.path.basename(rul_service.model_path),
                "loaded": rul_service.is_loaded(),
                "device": "CPU / GPU",
                "resolution": [89, 1],
                "status": "ONLINE" if rul_service.is_loaded() else "OFFLINE",
            },
            {
                "id": "model-10",
                "name": "Model 10: Automatic Process Parameter Optimization",
                "task": "Constrained Process Parameter Optimization & Cutting Regime Recommendation",
                "framework": "Empirical Scoring Engine (Normalized Wear-Productivity Tradeoff)",
                "weights_path": process_optimization_service.model_path,
                "weights_file": os.path.basename(process_optimization_service.model_path),
                "loaded": process_optimization_service.is_loaded(),
                "device": "CPU",
                "resolution": [3, 1],
                "status": "ONLINE" if process_optimization_service.is_loaded() else "OFFLINE",
            },
            {
                "id": "model-4",
                "name": "Model 4: Operator Face Detection & Authentication",
                "task": "Machine Vision Authorization & Workshop Personnel Telemetry",
                "framework": "OpenCV / YOLO Vision Engine",
                "weights_path": "storage/face/registered",
                "weights_file": "YOLO + Template Vision Engine",
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
    Executes an in-memory forward-pass test on all AI model services with synthetic input tensors.
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
            "wear_um": res2.get("wear_um"),
            "wear_value_mm": res2.get("wear_value"),
            "model_version": res2.get("model_version")
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

    # 4. Test Model 6 RUL Prediction
    try:
        t0 = time.time()
        dummy_features = {"wear": 50.0, "cycle_index": 1.0, "material": "CK45"}
        res6 = rul_service.predict_rul(dummy_features)
        lat6 = round((time.time() - t0) * 1000.0, 1)
        diagnostics["model_6_rul_prediction"] = {
            "status": "OK",
            "latency_ms": lat6,
            "rul_cycles": res6.get("rul_value"),
            "unit": res6.get("unit"),
            "rul_status": res6.get("rul_status")
        }
    except Exception as e:
        diagnostics["model_6_rul_prediction"] = {"status": "ERROR", "error": str(e)}

    # 5. Test Model 4 Face Detection
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


@router.post("/pipeline-test")
async def test_full_ai_pipeline(
    file: Optional[UploadFile] = File(None),
    tool_id: str = Form("TL-CNMG-120408"),
):
    """
    Executes a complete synchronous multi-model pipeline test:
    Model 1 (Tool Detection) -> Tool Eligibility -> Model 2 (Wear Analysis) -> Model 3 (Health) -> Model 6 (RUL)
    """
    t_start = time.time()
    pipeline_results = {}
    
    # Load image
    if file:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    else:
        sample_path = Path(settings.BASE_DIR) / "datasets" / "sample_cutting_tool.jpg"
        if sample_path.exists():
            img = cv2.imread(str(sample_path))
        else:
            img = np.zeros((640, 640, 3), dtype=np.uint8)
            cv2.rectangle(img, (150, 150), (450, 450), (160, 160, 160), -1)

    if img is None:
        raise HTTPException(status_code=400, detail="Failed to decode test image.")

    # 1. Model 1
    t1 = time.time()
    m1_out = tool_detection_service.detect(img)
    lat1 = round((time.time() - t1) * 1000.0, 1)
    
    is_supported = m1_out.get("is_supported", False)
    roi = m1_out.get("cropped_roi_bgr")
    if roi is None or not is_supported:
        roi = img

    # 2. Model 2
    t2 = time.time()
    m2_out = wear_analysis_service.predict(roi) if is_supported else {"status": "SKIPPED", "wear_um": None, "wear_value": None}
    lat2 = round((time.time() - t2) * 1000.0, 1)

    # 3. Model 3
    t3 = time.time()
    m3_out = health_prediction_service.predict(roi) if is_supported else {"status": "SKIPPED", "health_score": None, "health_status": "SKIPPED"}
    lat3 = round((time.time() - t3) * 1000.0, 1)

    # 4. Model 6
    t6 = time.time()
    wear_for_rul = m3_out.get("wear_um", 50.0) if is_supported else 50.0
    m6_features = {"wear": wear_for_rul, "cycle_index": 1.0, "material": "CK45"}
    m6_out = rul_service.predict_rul(m6_features) if is_supported else {"available": False, "rul_status": "SKIPPED_UNSUPPORTED"}
    lat6 = round((time.time() - t6) * 1000.0, 1)

    total_latency = round((time.time() - t_start) * 1000.0, 1)

    return {
        "success": True,
        "pipeline": "Model 1 -> Tool Eligibility -> Model 2 -> Model 3 -> Model 6",
        "tool_id": tool_id,
        "tool_eligibility": m1_out.get("tool_eligibility", "UNKNOWN"),
        "total_latency_ms": total_latency,
        "stages": {
            "model_1_tool_detection": {
                "detected": m1_out.get("detected"),
                "class_name": m1_out.get("class"),
                "confidence": m1_out.get("confidence"),
                "is_supported": is_supported,
                "latency_ms": lat1,
            },
            "model_2_wear_analysis": {
                "status": m2_out.get("status"),
                "wear_um": m2_out.get("wear_um"),
                "wear_value_mm": m2_out.get("wear_value"),
                "wear_status": m2_out.get("wear_status"),
                "latency_ms": lat2,
            },
            "model_3_health_prediction": {
                "status": m3_out.get("status"),
                "health_score": m3_out.get("health_score"),
                "health_status": m3_out.get("health_status"),
                "recommended_action": m3_out.get("recommended_action"),
                "latency_ms": lat3,
            },
            "model_6_rul_prediction": {
                "rul_cycles": m6_out.get("rul_value"),
                "wear_rate": m6_out.get("wear_rate_um_per_cycle"),
                "rul_status": m6_out.get("rul_status"),
                "latency_ms": lat6,
            }
        }
    }
