from typing import Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException
from pydantic import BaseModel

from backend.services.wear_analysis_service import WearAnalysisService
from backend.core.config import settings

router = APIRouter(prefix="/wear-analysis", tags=["Model 2: Wear Analysis"])

_wear_service: Optional[WearAnalysisService] = None

def get_wear_service() -> WearAnalysisService:
    global _wear_service
    if _wear_service is None:
        _wear_service = WearAnalysisService(device=settings.DEVICE)
    return _wear_service


@router.get("/model-info")
async def get_wear_model_info():
    """Retrieve technical metadata of Model 2 (LateFusionWearModel)"""
    try:
        service = get_wear_service()
        return {"status": "online", "metadata": service.get_model_metadata()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def predict_wear(
    file: UploadFile = File(...),
    apply_calibration: bool = Query(True)
):
    """
    Run tool wear estimation on a cropped cutting tool ROI image.
    """
    try:
        contents = await file.read()
        service = get_wear_service()
        result = service.analyze_wear(
            image_input=contents,
            apply_calibration=apply_calibration
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wear analysis inference error: {str(e)}")
