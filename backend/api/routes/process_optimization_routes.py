from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.services.process_optimization_service import process_optimization_service

router = APIRouter(prefix="/process-optimization", tags=["Model 10: Process Parameter Optimization"])

class OptimizeParametersRequest(BaseModel):
    tool_id: str = Field(..., description="Target Cutting Tool ID (e.g. TL-CNMG-120408)")
    machine_id: Optional[str] = Field("CNC-LATHE-01", description="CNC Machine Station")
    material: Optional[str] = Field("CK45 / Alloy Steel", description="Workpiece Material")
    objective: Optional[str] = Field("MAXIMIZE_TOOL_LIFE", description="Optimization Objective: MAXIMIZE_TOOL_LIFE, MAXIMIZE_PRODUCTIVITY, BALANCED")
    parameters: Optional[Dict[str, float]] = Field(
        default_factory=lambda: {"n": 3184.0, "fz": 0.050, "Ap": 1.0},
        description="Current machining parameter set (n: Spindle RPM, fz: Feed mm/tooth, Ap: Depth of Cut mm)"
    )
    constraints: Optional[Dict[str, float]] = Field(
        None,
        description="Custom operational constraints (e.g. max_wear_um: 250.0)"
    )

class ApprovalRequest(BaseModel):
    approved: bool = Field(True, description="Whether the engineer approves or rejects the recommendation")

@router.post("/optimize")
async def optimize_process_parameters(
    payload: OptimizeParametersRequest,
    db: Session = Depends(get_db)
):
    """
    Run Model 10 Automatic Process Parameter Optimization.
    Recommends optimal cutting regime (n, fz, Ap) respecting ISO wear limits and engineer safety.
    """
    try:
        result = process_optimization_service.optimize_parameters(
            db=db,
            tool_id=payload.tool_id,
            machine_id=payload.machine_id or "CNC-LATHE-01",
            material=payload.material or "CK45 / Alloy Steel",
            objective=payload.objective or "MAXIMIZE_TOOL_LIFE",
            current_parameters=payload.parameters,
            custom_constraints=payload.constraints,
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization execution error: {str(e)}")

@router.get("/constraints")
async def get_operating_constraints():
    """
    Retrieve valid parameter operating bounds, supported objectives, and material matrices.
    """
    return {
        "success": True,
        "constraints": process_optimization_service.get_supported_constraints()
    }

@router.get("/history")
async def list_optimization_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tool_id: Optional[str] = Query(None, description="Optional filter by tool ID"),
    db: Session = Depends(get_db)
):
    """
    Fetch paginated audit ledger of generated process parameter optimizations.
    """
    history = process_optimization_service.get_history(db=db, skip=skip, limit=limit, tool_id=tool_id)
    return {
        "success": True,
        "count": len(history),
        "optimizations": history
    }

@router.post("/{optimization_id}/approve")
async def approve_recommendation(
    optimization_id: str,
    payload: ApprovalRequest,
    db: Session = Depends(get_db)
):
    """
    Record human engineer approval or rejection for an optimization recommendation.
    """
    try:
        updated = process_optimization_service.approve_recommendation(
            db=db, optimization_id=optimization_id, approved=payload.approved
        )
        return {
            "success": True,
            "message": "Optimization recommendation status updated successfully.",
            "record": updated
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
