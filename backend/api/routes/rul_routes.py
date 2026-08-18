from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.core.database import get_db
from backend.services.rul_service import rul_service

router = APIRouter(prefix="/rul", tags=["Model 6: Remaining Useful Life (RUL) Prediction"])

class RULPredictRequest(BaseModel):
    tool_id: Optional[str] = Field(None, description="Optional registered Tool ID to retrieve historical wear and metadata")
    current_wear_um: Optional[float] = Field(None, description="Current wear measurement in micrometers (um)")
    wear: Optional[float] = Field(None, description="Direct alias for current wear in micrometers (um)")
    cycle_index: Optional[float] = Field(None, description="Current machining cycle index")
    material: Optional[str] = Field(None, description="Workpiece material ('CK45' or 'RVS304')")
    Coating: Optional[str] = Field(None, description="Tool coating category ('other' or 'MISSING_CATEGORY')")
    machining_parameters: Optional[Dict[str, float]] = Field(None, description="Optional cutting parameters (Vc, n, fz, Vf, Ae, Ap, z)")
    sensor_features: Optional[List[float]] = Field(None, description="Optional sensor telemetry values (RMS Acc, Acoustic, Fx, Fy, Fz)")
    features: Optional[Dict[str, Any]] = Field(None, description="Optional full 89-feature vector dictionary")

@router.get("/status")
async def get_rul_model_status():
    """Retrieve technical status and metadata for Model 6 (XGBoost RUL)."""
    return rul_service.get_model_metadata()

@router.get("/schema")
async def get_rul_feature_schema():
    """Retrieve the authoritative 89-feature schema, expected order, and category definitions."""
    return {
        "success": True,
        "feature_count": len(rul_service.features),
        "features": rul_service.features,
        "categorical_features": rul_service.cat_features,
        "numerical_features": rul_service.numerical_features,
        "category_mapping": rul_service.cat_mapping,
        "target": "robust_causal_slope (um/cycle)",
        "target_unit": "cycles",
        "eol_threshold_um": rul_service.eol_threshold_um,
    }

@router.post("/predict")
async def predict_rul_endpoint(
    payload: RULPredictRequest,
    db: Session = Depends(get_db)
):
    """
    Execute Model 6 Remaining Useful Life (RUL) prediction.
    Accepts either direct wear measurements + context or full 89-feature vectors.
    """
    try:
        # 1. If a full feature dictionary is provided directly
        if payload.features and isinstance(payload.features, dict):
            feature_dict = payload.features
        else:
            # 2. Extract current wear
            wear_val = payload.wear if payload.wear is not None else payload.current_wear_um
            
            # 3. Build features using database history if tool_id is present
            feature_dict = rul_service.build_feature_vector_from_context(
                tool_id=payload.tool_id,
                current_wear_um=wear_val,
                db=db,
                sensor_data=payload.sensor_features,
                machining_params=payload.machining_parameters
            )
            
            # Override explicitly provided fields
            if payload.cycle_index is not None:
                feature_dict["cycle_index"] = payload.cycle_index
            if payload.material:
                feature_dict["material"] = payload.material
            if payload.Coating:
                feature_dict["Coating"] = payload.Coating

        # 4. Execute RUL Prediction
        result = rul_service.predict_rul(feature_dict)
        return {
            "success": True,
            "rul": {
                "value": result.get("rul_value"),
                "unit": result.get("unit", "cycles"),
                "wear_rate_um_per_cycle": result.get("wear_rate_um_per_cycle"),
                "current_wear_um": result.get("current_wear_um"),
                "eol_threshold_um": result.get("eol_threshold_um", 300.0),
                "rul_status": result.get("rul_status"),
                "health_status": result.get("health_status"),
            },
            "model": {
                "name": "xgb_rul_final",
                "type": "XGBoost (XGBRegressor + Physics RUL Transform)",
                "latency_ms": result.get("latency_ms", 0.0),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RUL prediction error: {str(e)}")
