from typing import Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services.tool_detection_service import ToolDetectionService
from backend.core.config import settings

router = APIRouter(prefix="/tool-detection", tags=["Cutting Tool Detection"])

# Shared singleton service instance
_service: Optional[ToolDetectionService] = None

def get_service() -> ToolDetectionService:
    global _service
    if _service is None:
        _service = ToolDetectionService()
    return _service


class Base64PredictRequest(BaseModel):
    image_base64: str
    conf_threshold: Optional[float] = settings.DEFAULT_CONFIDENCE_THRESHOLD
    iou_threshold: Optional[float] = settings.DEFAULT_IOU_THRESHOLD
    include_annotated_image: Optional[bool] = False
    include_cropped_roi: Optional[bool] = False


@router.get("/model-info")
async def get_model_info():
    """
    Retrieve technical metadata and state of the loaded PyTorch .pt model.
    """
    try:
        service = get_service()
        return {
            "status": "online",
            "metadata": service.get_model_metadata()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model metadata: {str(e)}")


@router.post("/predict")
async def predict_tool(
    file: UploadFile = File(...),
    conf_threshold: float = Query(default=settings.DEFAULT_CONFIDENCE_THRESHOLD, ge=0.01, le=1.0),
    iou_threshold: float = Query(default=settings.DEFAULT_IOU_THRESHOLD, ge=0.01, le=1.0),
    include_annotated_image: bool = Query(default=False),
    include_cropped_roi: bool = Query(default=False),
):
    """
    Detect cutting tool insert in an uploaded image using the trained YOLO11n .pt model.
    """
    try:
        contents = await file.read()
        service = get_service()
        
        # Run inference
        result = service.predict(
            image_input=contents,
            conf_threshold=conf_threshold,
            iou_threshold=iou_threshold
        )
        
        # Optionally attach annotated base64 image
        if include_annotated_image:
            annotated_bgr = service.draw_detections(contents, result, show_hud=True)
            result["annotated_image_base64"] = service.encode_image_to_base64(annotated_bgr)
            
        # Optionally attach cropped tool ROI
        if include_cropped_roi and result["detections"]:
            primary_bbox = result["detections"][0]["bbox_xyxy"]
            cropped_roi = service.crop_tool_roi(contents, primary_bbox)
            result["cropped_roi_base64"] = service.encode_image_to_base64(cropped_roi)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.post("/predict-base64")
async def predict_tool_base64(payload: Base64PredictRequest):
    """
    Detect cutting tool from base64 encoded image string.
    """
    import base64
    try:
        raw_bytes = base64.b64decode(payload.image_base64)
        service = get_service()
        
        result = service.predict(
            image_input=raw_bytes,
            conf_threshold=payload.conf_threshold,
            iou_threshold=payload.iou_threshold
        )
        
        if payload.include_annotated_image:
            annotated_bgr = service.draw_detections(raw_bytes, result, show_hud=True)
            result["annotated_image_base64"] = service.encode_image_to_base64(annotated_bgr)
            
        if payload.include_cropped_roi and result["detections"]:
            primary_bbox = result["detections"][0]["bbox_xyxy"]
            cropped_roi = service.crop_tool_roi(raw_bytes, primary_bbox)
            result["cropped_roi_base64"] = service.encode_image_to_base64(cropped_roi)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Base64 inference error: {str(e)}")


@router.post("/diagnostics")
async def run_diagnostics():
    """
    Execute backend self-test on the PyTorch model weights stored in result/.
    """
    import numpy as np
    import cv2
    try:
        service = get_service()
        test_canvas = np.zeros((640, 640, 3), dtype=np.uint8)
        cv2.rectangle(test_canvas, (200, 200), (440, 440), (50, 180, 220), -1)
        
        res = service.predict(test_canvas, conf_threshold=0.01)
        return {
            "status": "healthy",
            "model_path": service.model_path,
            "device": service.device,
            "test_latency_ms": res["inference_latency_ms"],
            "test_fps": res["fps"],
            "checks": {
                "weights_found": True,
                "model_instantiated": True,
                "forward_pass": True
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )
