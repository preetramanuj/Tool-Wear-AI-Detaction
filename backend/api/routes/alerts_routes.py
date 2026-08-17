from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.database.crud import get_alerts, acknowledge_alert

router = APIRouter(prefix="/alerts", tags=["System & Wear Alerts"])

@router.get("")
async def list_alerts(
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve list of industrial alerts"""
    alerts = get_alerts(db, acknowledged=acknowledged, limit=limit)
    return {
        "success": True,
        "count": len(alerts),
        "alerts": [a.to_dict() for a in alerts]
    }


@router.post("/{alert_id}/acknowledge")
async def ack_alert(
    alert_id: str,
    db: Session = Depends(get_db)
):
    """Acknowledge an alert"""
    res = acknowledge_alert(db, alert_id)
    if not res:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "success": True,
        "alert": res.to_dict(),
        "message": f"Alert '{alert_id}' marked as acknowledged."
    }
