from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.services.downtime_service import downtime_service
from backend.database.crud import create_downtime_event

router = APIRouter(prefix="/downtime", tags=["Model 8: Machine Downtime Avoided"])

@router.get("/summary")
async def get_downtime_summary(db: Session = Depends(get_db)):
    """
    Retrieve planned vs unplanned machine downtime and estimated downtime avoided.
    """
    try:
        report = downtime_service.get_downtime_analytics(db)
        return {
            "success": True,
            "data": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate downtime analytics: {str(e)}")

@router.post("/events")
async def log_downtime_event(
    event_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Log a new planned maintenance or unplanned downtime event into SQLite database.
    """
    try:
        import time
        if "downtime_id" not in event_data:
            event_data["downtime_id"] = f"DT-{int(time.time() * 1000) % 100000}"
        ev = create_downtime_event(db, event_data)
        return {
            "success": True,
            "message": "Downtime event logged successfully.",
            "downtime_id": ev.downtime_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log downtime event: {str(e)}")
