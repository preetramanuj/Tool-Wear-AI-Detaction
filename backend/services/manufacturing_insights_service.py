import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import numpy as np

from backend.database.models import Tool, InspectionRecord, Machine, AlertRecord

logger = logging.getLogger(__name__)

class ManufacturingInsightsService:
    """
    Model 5: Manufacturing Insights & Analytics Engine.
    Performs data-driven trend analysis, tool degradation rate monitoring,
    cross-machine comparisons, and automated maintenance prioritization
    based on actual SQLite inspection history.
    """

    def generate_comprehensive_insights(self, db: Session) -> Dict[str, Any]:
        """
        Generates full facility manufacturing insights report.
        """
        total_tools = db.query(Tool).count()
        total_inspections = db.query(InspectionRecord).count()
        
        if total_tools == 0 or total_inspections == 0:
            return {
                "has_sufficient_data": False,
                "summary": "Insufficient historical data to generate manufacturing insights. Perform tool inspections to begin tracking.",
                "kpis": {
                    "total_tools": total_tools,
                    "active_tools": 0,
                    "tools_requiring_inspection": 0,
                    "avg_wear_um": None,
                    "avg_health_score": None,
                    "avg_rul_cycles": None,
                },
                "insights": [],
                "maintenance_candidates": [],
                "machine_comparison": [],
                "tool_comparison": [],
                "trends": {"wear": [], "health": [], "rul": []},
            }

        # 1. Facility KPIs
        active_tools = db.query(Tool).filter(Tool.status != "RETIRED").count()
        action_required = db.query(Tool).filter(Tool.status.in_(["WARNING", "CRITICAL"])).count()
        
        avg_wear = db.query(func.avg(InspectionRecord.wear_um)).filter(InspectionRecord.wear_um.isnot(None), InspectionRecord.wear_um > 0).scalar()
        avg_health = db.query(func.avg(InspectionRecord.health_score)).filter(InspectionRecord.health_score.isnot(None)).scalar()
        avg_rul = db.query(func.avg(InspectionRecord.rul_cycles)).filter(InspectionRecord.rul_cycles.isnot(None)).scalar()

        # 2. Extract Actionable Insights
        insights: List[Dict[str, Any]] = []

        # (a) Check individual tools for increasing wear acceleration
        tools = db.query(Tool).all()
        for t in tools:
            past_records = db.query(InspectionRecord).filter(
                InspectionRecord.tool_id == t.tool_id,
                InspectionRecord.wear_um.isnot(None),
                InspectionRecord.wear_um > 0
            ).order_by(InspectionRecord.timestamp.asc()).all()

            if len(past_records) >= 3:
                wears = [r.wear_um for r in past_records]
                # Check recent wear delta
                delta_recent = wears[-1] - wears[-2]
                delta_prev = wears[-2] - wears[-3]
                
                if delta_recent > (delta_prev * 1.3) and delta_recent > 15.0:
                    insights.append({
                        "type": "WEAR_ACCELERATION",
                        "severity": "WARNING",
                        "tool_id": t.tool_id,
                        "machine_id": t.machine_id,
                        "title": f"Accelerated Wear on Tool {t.tool_id}",
                        "message": f"Tool {t.tool_id} wear accelerated (+{delta_recent:.1f} µm in last cycle vs +{delta_prev:.1f} µm prior). Check cutting parameters.",
                        "data_evidence": f"Wear sequence: {[round(w, 1) for w in wears[-3:]]} µm"
                    })
                elif wears[-1] > 220.0:
                    insights.append({
                        "type": "HIGH_WEAR_ALERT",
                        "severity": "CRITICAL",
                        "tool_id": t.tool_id,
                        "machine_id": t.machine_id,
                        "title": f"High Wear Critical Threshold Reached: {t.tool_id}",
                        "message": f"Tool {t.tool_id} reached {wears[-1]:.1f} µm (limit: 300.0 µm). Schedule insert replacement.",
                        "data_evidence": f"Current flank wear VB: {t.current_wear_vb_mm:.3f} mm"
                    })

            # Check RUL thresholds
            if t.current_rul_cycles is not None and t.current_rul_cycles <= 30.0:
                insights.append({
                    "type": "RUL_EXPIRY_WARNING",
                    "severity": "CRITICAL" if t.current_rul_cycles <= 15.0 else "WARNING",
                    "tool_id": t.tool_id,
                    "machine_id": t.machine_id,
                    "title": f"Low Remaining Useful Life: {t.tool_id}",
                    "message": f"Tool {t.tool_id} has approximately {t.current_rul_cycles:.0f} cutting cycles remaining before reaching 300 µm EOL threshold.",
                    "data_evidence": f"Estimated wear rate: {t.current_wear_rate or 0.5:.2f} µm/cycle"
                })

        # (b) Cross-machine Comparison
        machines = db.query(Machine).all()
        machine_comparison = []
        for m in machines:
            m_insps = db.query(InspectionRecord).filter(InspectionRecord.machine_id == m.machine_id).all()
            if m_insps:
                m_wears = [r.wear_um for r in m_insps if r.wear_um is not None and r.wear_um > 0]
                m_avg_wear = float(np.mean(m_wears)) if m_wears else 0.0
                m_crits = sum(1 for r in m_insps if r.health_status == "CRITICAL")
                machine_comparison.append({
                    "machine_id": m.machine_id,
                    "name": m.name,
                    "status": m.status,
                    "total_inspections": len(m_insps),
                    "avg_wear_um": round(m_avg_wear, 1),
                    "critical_alerts": m_crits,
                })
            else:
                machine_comparison.append({
                    "machine_id": m.machine_id,
                    "name": m.name,
                    "status": m.status,
                    "total_inspections": 0,
                    "avg_wear_um": 0.0,
                    "critical_alerts": 0,
                })

        if len([m for m in machine_comparison if m["total_inspections"] >= 3]) >= 2:
            valid_m = [m for m in machine_comparison if m["total_inspections"] >= 3]
            highest = max(valid_m, key=lambda x: x["avg_wear_um"])
            lowest = min(valid_m, key=lambda x: x["avg_wear_um"])
            if highest["avg_wear_um"] > (lowest["avg_wear_um"] * 1.25):
                insights.append({
                    "type": "MACHINE_VARIANCE",
                    "severity": "INFO",
                    "tool_id": None,
                    "machine_id": highest["machine_id"],
                    "title": f"Machine Wear Variance: {highest['machine_id']}",
                    "message": f"Machine {highest['machine_id']} exhibits higher average wear ({highest['avg_wear_um']:.1f} µm) compared to {lowest['machine_id']} ({lowest['avg_wear_um']:.1f} µm) across recorded inspections.",
                    "data_evidence": f"{highest['machine_id']}: {highest['total_inspections']} inspections, {lowest['machine_id']}: {lowest['total_inspections']} inspections"
                })

        # (c) Tool Comparison
        tool_comparison = []
        for t in tools:
            tool_comparison.append({
                "tool_id": t.tool_id,
                "tool_name": t.tool_name,
                "material": t.material,
                "coating": t.coating,
                "machine_id": t.machine_id,
                "current_wear_um": round(t.current_wear_um, 1),
                "current_wear_vb_mm": round(t.current_wear_vb_mm, 4),
                "rul_cycles": round(t.current_rul_cycles, 1) if t.current_rul_cycles is not None else None,
                "wear_rate": round(t.current_wear_rate, 3) if t.current_wear_rate is not None else None,
                "status": t.status,
                "total_inspections": t.total_inspections
            })

        # (d) Maintenance Candidates
        maintenance_candidates = [
            t for t in tool_comparison
            if t["status"] in ["WARNING", "CRITICAL"] or (t["rul_cycles"] is not None and t["rul_cycles"] <= 45.0)
        ]
        maintenance_candidates.sort(key=lambda x: (0 if x["status"] == "CRITICAL" else 1, x["rul_cycles"] or 999))

        # (e) Global Summary String
        if action_required > 0:
            summary = f"Facility analysis identifies {action_required} tools requiring maintenance attention across {len(machines)} active machine cells. Average wear is {avg_wear:.1f} µm with an average remaining life of {avg_rul:.0f} cycles."
        else:
            summary = f"All {total_tools} monitored cutting tools are operating within normal wear tolerances. Facility health score is {avg_health * 100:.0f}%."

        # (f) Chronological trends
        inspections = db.query(InspectionRecord).order_by(InspectionRecord.timestamp.asc()).limit(50).all()
        trend_wear = []
        trend_health = []
        trend_rul = []
        for idx, insp in enumerate(inspections):
            ts = insp.timestamp.strftime("%m/%d %H:%M") if insp.timestamp else f"T{idx+1}"
            if insp.wear_um is not None and insp.wear_um > 0:
                trend_wear.append({"timestamp": ts, "tool_id": insp.tool_id, "wear_um": round(insp.wear_um, 1)})
            if insp.health_score is not None:
                trend_health.append({"timestamp": ts, "tool_id": insp.tool_id, "health_score": round(insp.health_score, 2)})
            if insp.rul_cycles is not None:
                trend_rul.append({"timestamp": ts, "tool_id": insp.tool_id, "rul_cycles": round(insp.rul_cycles, 1)})

        return {
            "has_sufficient_data": True,
            "summary": summary,
            "kpis": {
                "total_tools": total_tools,
                "active_tools": active_tools,
                "tools_requiring_inspection": action_required,
                "avg_wear_um": round(avg_wear, 1) if avg_wear else None,
                "avg_health_score": round(avg_health, 2) if avg_health else None,
                "avg_rul_cycles": round(avg_rul, 1) if avg_rul else None,
            },
            "insights": insights,
            "maintenance_candidates": maintenance_candidates,
            "machine_comparison": machine_comparison,
            "tool_comparison": tool_comparison,
            "trends": {
                "wear": trend_wear,
                "health": trend_health,
                "rul": trend_rul
            }
        }

manufacturing_insights_service = ManufacturingInsightsService()
