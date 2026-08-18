from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.core.database import get_db
from backend.database.models import Tool, InspectionRecord, AlertRecord

router = APIRouter(prefix="/analytics", tags=["System Analytics & Metrics"])

@router.get("/overview")
async def get_analytics_overview(db: Session = Depends(get_db)):
    """
    Compute real-time KPI overview from actual database inspection records and tools,
    including Model 6 Remaining Useful Life (RUL in cycles).
    """
    total_tools = db.query(Tool).count()
    healthy_tools = db.query(Tool).filter(Tool.status == "HEALTHY").count()
    warning_tools = db.query(Tool).filter(Tool.status == "WARNING").count()
    critical_tools = db.query(Tool).filter(Tool.status == "CRITICAL").count()

    total_inspections = db.query(InspectionRecord).count()
    active_alerts = db.query(AlertRecord).filter(AlertRecord.is_acknowledged == False).count()

    latest_insp = db.query(InspectionRecord).order_by(InspectionRecord.timestamp.desc()).first()

    avg_wear_um = db.query(func.avg(InspectionRecord.wear_um)).scalar() or 0.0
    avg_wear_vb = db.query(func.avg(InspectionRecord.wear_value)).scalar() or 0.0
    avg_rul_cycles = db.query(func.avg(InspectionRecord.rul_cycles)).filter(InspectionRecord.rul_cycles.isnot(None)).scalar()

    # Determine real RUL string
    if latest_insp and latest_insp.rul_cycles is not None:
        predicted_rul_str = f"{round(latest_insp.rul_cycles, 1)} cycles"
        latest_rul_val = round(latest_insp.rul_cycles, 1)
    elif latest_insp and latest_insp.rul_status == "EOL_REACHED":
        predicted_rul_str = "0 cycles (EOL)"
        latest_rul_val = 0.0
    else:
        predicted_rul_str = "Not Available"
        latest_rul_val = None

    return {
        "success": True,
        "kpis": {
            "total_tools": total_tools,
            "tool_status": "RUNNING",
            "healthy_tools": healthy_tools,
            "warning_tools": warning_tools,
            "critical_tools": critical_tools,
            "total_inspections": total_inspections,
            "active_alerts": active_alerts,
            "latest_wear_vb_mm": round(latest_insp.wear_value, 4) if latest_insp and latest_insp.wear_value else 0.0,
            "latest_wear_um": round(latest_insp.wear_um, 2) if latest_insp and latest_insp.wear_um else 0.0,
            "latest_wear_area_mm2": round(latest_insp.wear_area, 3) if latest_insp and latest_insp.wear_area else 0.0,
            "latest_health_status": latest_insp.health_status if latest_insp else "UNKNOWN",
            "predicted_rul": predicted_rul_str,
            "latest_rul_cycles": latest_rul_val,
            "latest_rul_unit": "cycles",
            "avg_rul_cycles": round(avg_rul_cycles, 1) if avg_rul_cycles is not None else None,
            "avg_wear_um": round(avg_wear_um, 2),
            "avg_wear_vb_mm": round(avg_wear_vb, 4)
        }
    }


@router.get("/wear-trend")
async def get_wear_trend_data(db: Session = Depends(get_db)):
    """
    Return chronological wear progression and RUL cycles from actual inspection records.
    """
    inspections = db.query(InspectionRecord).order_by(InspectionRecord.timestamp.asc()).limit(100).all()

    trend_points = []
    for idx, r in enumerate(inspections):
        trend_points.append({
            "index": idx + 1,
            "inspection_id": r.inspection_id,
            "tool_id": r.tool_id or f"Tool-{idx+1}",
            "timestamp": r.timestamp.strftime("%m/%d %H:%M") if r.timestamp else f"T{idx+1}",
            "wear_um": round(r.wear_um, 2) if r.wear_um else 0.0,
            "wear_vb_mm": round(r.wear_value, 4) if r.wear_value else 0.0,
            "wear_area": round(r.wear_area, 3) if r.wear_area else 0.0,
            "health_score": round(r.health_score, 2) if r.health_score else 0.0,
            "rul_cycles": round(r.rul_cycles, 1) if r.rul_cycles is not None else None,
            "wear_rate": round(r.rul_wear_rate, 4) if r.rul_wear_rate is not None else None,
            "status": r.health_status
        })

    return {
        "success": True,
        "count": len(trend_points),
        "data": trend_points
    }


@router.get("/health-distribution")
async def get_health_distribution(db: Session = Depends(get_db)):
    """
    Return distribution of health states across the facility.
    """
    healthy = db.query(InspectionRecord).filter(InspectionRecord.health_status == "HEALTHY").count()
    warning = db.query(InspectionRecord).filter(InspectionRecord.health_status == "WARNING").count()
    critical = db.query(InspectionRecord).filter(InspectionRecord.health_status == "CRITICAL").count()
    unknown = db.query(InspectionRecord).filter(InspectionRecord.health_status == "UNKNOWN").count()

    total = healthy + warning + critical + unknown

    return {
        "success": True,
        "distribution": [
            {"name": "Healthy", "count": healthy, "color": "#10B981"},
            {"name": "Warning", "count": warning, "color": "#F59E0B"},
            {"name": "Critical", "count": critical, "color": "#EF4444"},
            {"name": "Unknown", "count": unknown, "color": "#94A3B8"},
        ],
        "total": total
    }
