from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.services.manufacturing_insights_service import manufacturing_insights_service

router = APIRouter(prefix="/insights", tags=["Model 5: Manufacturing Insights"])

@router.get("/summary")
async def get_manufacturing_insights_summary(db: Session = Depends(get_db)):
    """
    Retrieve comprehensive manufacturing insights, wear trends, cross-machine comparisons,
    and prioritized maintenance candidates.
    """
    try:
        report = manufacturing_insights_service.generate_comprehensive_insights(db)
        return {
            "success": True,
            "data": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate manufacturing insights: {str(e)}")

@router.get("/candidates")
async def get_maintenance_candidates(db: Session = Depends(get_db)):
    """
    Retrieve cutting tools identified as active maintenance candidates due to high wear or low RUL.
    """
    try:
        report = manufacturing_insights_service.generate_comprehensive_insights(db)
        return {
            "success": True,
            "count": len(report.get("maintenance_candidates", [])),
            "candidates": report.get("maintenance_candidates", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch maintenance candidates: {str(e)}")
