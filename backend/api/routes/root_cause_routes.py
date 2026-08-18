from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.services.root_cause_service import root_cause_service

router = APIRouter(prefix="/root-cause", tags=["Model 9: Root Cause Analysis"])

@router.get("/analyze")
async def analyze_tool_root_cause(
    tool_id: str = Query(..., description="Target tool ID e.g. TL-CNMG-120408"),
    inspection_id: Optional[str] = Query(None, description="Optional specific inspection record ID"),
    db: Session = Depends(get_db)
):
    """
    Perform statistical feature contribution ranking to identify the top process parameters
    associated with tool degradation for a given tool or inspection.
    """
    try:
        report = root_cause_service.analyze_tool_root_cause(
            tool_id=tool_id,
            db=db,
            inspection_id=inspection_id
        )
        if not report.get("success", False):
            raise HTTPException(status_code=404, detail=report.get("error", "Analysis failed"))
        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute root cause analysis: {str(e)}")
