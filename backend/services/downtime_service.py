import logging
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database.models import (
    Machine,
    Tool,
    DowntimeEvent,
    MaintenanceEvent,
    EconomicParameters,
)
from backend.database.crud import get_economic_parameters

logger = logging.getLogger(__name__)

class DowntimeService:
    """
    Model 8: Machine Downtime & Production Reliability Service.
    Tracks machine stoppages, planned maintenance windows, and calculates
    estimated downtime avoided by pre-empting sudden catastrophic tool failures.
    """

    def get_downtime_analytics(self, db: Session) -> Dict[str, Any]:
        """
        Computes downtime breakdown, machine-wise impact, and estimated downtime avoided.
        """
        params: EconomicParameters = get_economic_parameters(db)
        downtime_events = db.query(DowntimeEvent).order_by(DowntimeEvent.start_time.desc()).all()
        maintenance_events = db.query(MaintenanceEvent).order_by(MaintenanceEvent.start_time.desc()).all()
        machines = db.query(Machine).all()

        # 1. Stoppage Durations
        unplanned_hours = sum(d.duration_hours for d in downtime_events if d.is_unplanned)
        planned_hours = sum(d.duration_hours for d in downtime_events if not d.is_unplanned)
        total_downtime_hours = unplanned_hours + planned_hours
        
        # 2. Avoided Downtime Calculations
        # Explicitly recorded avoided hours on events
        recorded_avoided_hours = sum(d.estimated_avoided_hours for d in downtime_events)
        
        # Calculate potential avoided hours if planned replacements replaced unplanned failures
        # E.g. expected unplanned (3.0 hrs) - planned duration (0.5 hrs) = 2.5 hrs per planned replacement
        planned_replacement_count = sum(1 for m in maintenance_events if m.maintenance_type in ["TOOL_REPLACEMENT", "PREVENTIVE"])
        calculated_replacement_avoided_hours = planned_replacement_count * max(0.0, params.average_unplanned_downtime_hours - params.planned_replacement_hours)
        
        total_estimated_avoided_hours = max(recorded_avoided_hours, calculated_replacement_avoided_hours)
        
        # Financial Impact
        actual_downtime_cost = total_downtime_hours * params.downtime_cost_per_hour
        estimated_cost_avoided = total_estimated_avoided_hours * params.downtime_cost_per_hour

        # 3. Machine-Wise Downtime Breakdown
        machine_breakdown = []
        for m in machines:
            m_events = [d for d in downtime_events if d.machine_id == m.machine_id]
            m_unplanned = sum(d.duration_hours for d in m_events if d.is_unplanned)
            m_planned = sum(d.duration_hours for d in m_events if not d.is_unplanned)
            m_avoided = sum(d.estimated_avoided_hours for d in m_events)
            m_loss = (m_unplanned + m_planned) * params.downtime_cost_per_hour
            
            machine_breakdown.append({
                "machine_id": m.machine_id,
                "machine_name": m.name,
                "status": m.status,
                "location": m.location,
                "total_downtime_hours": round(m_unplanned + m_planned, 1),
                "unplanned_hours": round(m_unplanned, 1),
                "planned_hours": round(m_planned, 1),
                "estimated_avoided_hours": round(m_avoided, 1),
                "financial_loss": round(m_loss, 2),
            })

        # 4. Recent Events List
        formatted_events = []
        for d in downtime_events:
            formatted_events.append({
                "downtime_id": d.downtime_id,
                "machine_id": d.machine_id,
                "tool_id": d.tool_id or "N/A",
                "cause": d.cause,
                "is_unplanned": d.is_unplanned,
                "type_label": "UNPLANNED STOPPAGE" if d.is_unplanned else "PLANNED MAINTENANCE",
                "duration_hours": round(d.duration_hours, 1),
                "total_loss": round(d.total_loss, 2),
                "estimated_avoided_hours": round(d.estimated_avoided_hours, 1),
                "timestamp": d.start_time.strftime("%Y-%m-%d %H:%M") if d.start_time else "N/A",
            })

        return {
            "summary": {
                "total_downtime_hours": round(total_downtime_hours, 1),
                "planned_downtime_hours": round(planned_hours, 1),
                "unplanned_downtime_hours": round(unplanned_hours, 1),
                "estimated_downtime_avoided_hours": round(total_estimated_avoided_hours, 1),
                "actual_downtime_cost": round(actual_downtime_cost, 2),
                "estimated_avoided_cost": round(estimated_cost_avoided, 2),
                "total_events_count": len(downtime_events),
                "currency": params.currency_symbol,
            },
            "machine_breakdown": machine_breakdown,
            "events": formatted_events,
            "calculation_basis": {
                "downtime_cost_per_hour": params.downtime_cost_per_hour,
                "avg_unplanned_hours": params.average_unplanned_downtime_hours,
                "planned_replacement_hours": params.planned_replacement_hours,
                "label": "Estimated downtime avoided"
            }
        }

downtime_service = DowntimeService()
