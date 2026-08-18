import base64
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.database import get_db
from backend.services.inspection_pipeline_service import inspection_pipeline_service
from backend.database.crud import get_inspections, get_inspection_by_id

router = APIRouter(prefix="/inspection", tags=["Unified Inspection Pipeline"])

class Base64InspectionRequest(BaseModel):
    image_base64: str
    tool_id: Optional[str] = None
    machine_id: Optional[str] = "CNC-01"
    operator_id: Optional[str] = "OP-DEFAULT"
    sensor_data: Optional[list] = None

@router.post("/analyze")
async def analyze_tool_image(
    image: UploadFile = File(...),
    tool_id: Optional[str] = Form(None),
    machine_id: Optional[str] = Form("CNC-01"),
    operator_id: Optional[str] = Form("OP-DEFAULT"),
    db: Session = Depends(get_db)
):
    """
    Unified AI Inspection Endpoint:
    Runs Tool Detection -> Crop ROI -> Wear Analysis -> Health Prediction -> Person-Tool Association -> SQLite Persistence.
    """
    try:
        contents = await image.read()
        result = inspection_pipeline_service.run_pipeline(
            image_bytes=contents,
            filename=image.filename or "inspection.jpg",
            tool_id=tool_id,
            machine_id=machine_id,
            operator_id=operator_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing error: {str(e)}")

@router.post("/analyze-base64")
async def analyze_tool_image_base64(
    payload: Base64InspectionRequest,
    db: Session = Depends(get_db)
):
    """Unified inspection via base64 encoded image string"""
    try:
        raw_b64 = payload.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        raw_bytes = base64.b64decode(raw_b64)
        
        result = inspection_pipeline_service.run_pipeline(
            image_bytes=raw_bytes,
            filename="base64_upload.jpg",
            tool_id=payload.tool_id,
            machine_id=payload.machine_id or "CNC-01",
            operator_id=payload.operator_id or "OP-DEFAULT",
            sensor_features=payload.sensor_data,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Base64 pipeline processing error: {str(e)}")

@router.get("/records")
async def list_inspection_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Fetch paginated audit history of past inspections."""
    records = get_inspections(db, skip=skip, limit=limit)
    serialized = []
    for r in records:
        serialized.append({
            "inspection_id": r.inspection_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "tool_id": r.tool_id,
            "tool_name": r.tool_name,
            "tool_type": r.tool_type,
            "machine_id": r.machine_id,
            "operator_id": r.operator_id,
            "tool_detection": {
                "detected": r.tool_detected,
                "confidence": r.detection_confidence,
            },
            "wear_analysis": {
                "wear_value": r.wear_value,
                "wear_area": r.wear_area,
                "wear_status": r.wear_status,
            },
            "health_prediction": {
                "wear_um": r.wear_um,
                "health_score": r.health_score,
                "health_status": r.health_status,
                "recommended_action": r.recommended_action,
            },
            "rul_prediction": {
                "available": r.rul_cycles is not None,
                "rul_value": r.rul_cycles,
                "wear_rate_um_per_cycle": r.rul_wear_rate,
                "rul_status": r.rul_status,
                "unit": r.rul_unit or "cycles",
                "model": r.rul_model or "xgb_rul_final",
            },
            "images": {
                "original": r.original_image,
                "annotated": r.annotated_image,
                "cropped_roi": r.cropped_roi,
            },
            "performance": {
                "latency_ms": r.latency_ms,
                "device": r.device,
            }
        })
    return {
        "success": True,
        "count": len(serialized),
        "inspections": serialized
    }

@router.get("/records/{inspection_id}")
async def get_inspection_detail(
    inspection_id: str,
    db: Session = Depends(get_db)
):
    """Get single inspection audit record by ID"""
    r = get_inspection_by_id(db, inspection_id)
    if not r:
        raise HTTPException(status_code=404, detail=f"Inspection record '{inspection_id}' not found")
    
    return {
        "success": True,
        "inspection": {
            "inspection_id": r.inspection_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "tool_id": r.tool_id,
            "tool_name": r.tool_name,
            "tool_type": r.tool_type,
            "machine_id": r.machine_id,
            "operator_id": r.operator_id,
            "tool_detection": {
                "detected": r.tool_detected,
                "confidence": r.detection_confidence,
            },
            "wear_analysis": {
                "wear_value": r.wear_value,
                "wear_area": r.wear_area,
                "wear_status": r.wear_status,
            },
            "health_prediction": {
                "wear_um": r.wear_um,
                "health_score": r.health_score,
                "health_status": r.health_status,
                "recommended_action": r.recommended_action,
            },
            "rul_prediction": {
                "available": r.rul_cycles is not None,
                "rul_value": r.rul_cycles,
                "wear_rate_um_per_cycle": r.rul_wear_rate,
                "rul_status": r.rul_status,
                "unit": r.rul_unit or "cycles",
                "model": r.rul_model or "xgb_rul_final",
            },
            "images": {
                "original": r.original_image,
                "annotated": r.annotated_image,
                "cropped_roi": r.cropped_roi,
            },
            "performance": {
                "latency_ms": r.latency_ms,
                "device": r.device,
            }
        }
    }
