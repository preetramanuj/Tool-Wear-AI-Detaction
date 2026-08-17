from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

from backend.services.health_prediction_service import HealthPredictionService
from backend.core.config import settings

router = APIRouter(prefix="/health-prediction", tags=["Model 3: Tool Health Prediction"])

_health_service: Optional[HealthPredictionService] = None

def get_health_service() -> HealthPredictionService:
    global _health_service
    if _health_service is None:
        _health_service = HealthPredictionService(device=settings.DEVICE)
    return _health_service


@router.get("/model-info")
async def get_health_model_info():
    """Retrieve technical metadata of Model 3 (ImageOnlyWearModel)"""
    try:
        service = get_health_service()
        return {"status": "online", "metadata": service.get_model_metadata()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def predict_tool_health(file: UploadFile = File(...)):
    """
    Run tool health prediction on a cropped tool ROI image.
    """
    try:
        contents = await file.read()
        service = get_health_service()
        result = service.predict_health(image_input=contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health prediction error: {str(e)}")
