from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.database import get_db
from backend.services.economic_impact_service import economic_impact_service
from backend.database.crud import get_economic_parameters, update_economic_parameters

router = APIRouter(prefix="/economics", tags=["Model 7: Economic Impact"])

class EconomicParametersUpdate(BaseModel):
    tool_replacement_cost: Optional[float] = None
    machine_operating_cost_per_hour: Optional[float] = None
    downtime_cost_per_hour: Optional[float] = None
    maintenance_labor_cost_per_hour: Optional[float] = None
    average_unplanned_downtime_hours: Optional[float] = None
    planned_replacement_hours: Optional[float] = None
    production_value_per_hour: Optional[float] = None
    currency_symbol: Optional[str] = None

@router.get("/summary")
async def get_economic_impact_summary(db: Session = Depends(get_db)):
    """
    Retrieve economic breakdown: estimated downtime losses, maintenance expenditures,
    and potential cost savings with clear ACTUAL vs ESTIMATED indicators.
    """
    try:
        report = economic_impact_service.calculate_economic_impact(db)
        return {
            "success": True,
            "data": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate economic impact: {str(e)}")

@router.get("/parameters")
async def get_plant_economic_parameters(db: Session = Depends(get_db)):
    """
    Retrieve current configurable plant cost and operational rate parameters.
    """
    try:
        params = get_economic_parameters(db)
        return {
            "success": True,
            "parameters": {
                "tool_replacement_cost": params.tool_replacement_cost,
                "machine_operating_cost_per_hour": params.machine_operating_cost_per_hour,
                "downtime_cost_per_hour": params.downtime_cost_per_hour,
                "maintenance_labor_cost_per_hour": params.maintenance_labor_cost_per_hour,
                "average_unplanned_downtime_hours": params.average_unplanned_downtime_hours,
                "planned_replacement_hours": params.planned_replacement_hours,
                "production_value_per_hour": params.production_value_per_hour,
                "currency_symbol": params.currency_symbol,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get economic parameters: {str(e)}")

@router.put("/parameters")
async def update_plant_economic_parameters(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Update plant cost and operational rate parameters in SQLite database.
    """
    try:
        updated = update_economic_parameters(db, payload)
        return {
            "success": True,
            "message": "Economic parameters updated successfully.",
            "parameters": {
                "tool_replacement_cost": updated.tool_replacement_cost,
                "machine_operating_cost_per_hour": updated.machine_operating_cost_per_hour,
                "downtime_cost_per_hour": updated.downtime_cost_per_hour,
                "maintenance_labor_cost_per_hour": updated.maintenance_labor_cost_per_hour,
                "average_unplanned_downtime_hours": updated.average_unplanned_downtime_hours,
                "planned_replacement_hours": updated.planned_replacement_hours,
                "production_value_per_hour": updated.production_value_per_hour,
                "currency_symbol": updated.currency_symbol,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update economic parameters: {str(e)}")
