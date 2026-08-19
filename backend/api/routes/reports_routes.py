from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.services.reports_service import reports_service

router = APIRouter(prefix="/reports", tags=["Industrial Reports & Compliance Documentation"])

class GenerateReportRequest(BaseModel):
    report_type: Optional[str] = Field("daily", description="Report type: daily, lifecycle, trend, executive, sustainability, COMPREHENSIVE_AUDIT")
    tool_id: Optional[str] = Field(None, description="Optional target tool ID")
    machine_id: Optional[str] = Field(None, description="Optional machine station filter")
    timeframe: Optional[str] = Field("ALL", description="Timeframe filter: 24H, 7D, 30D, ALL")
    format: Optional[str] = Field("json", description="Requested output format: json, pdf, docx, csv")

def normalize_report_type(raw_type: str) -> str:
    mapping = {
        "daily": "DAILY_INSPECTIONS",
        "daily_inspections": "DAILY_INSPECTIONS",
        "DAILY_INSPECTIONS": "DAILY_INSPECTIONS",
        "lifecycle": "COMPREHENSIVE_AUDIT",
        "tool_performance": "COMPREHENSIVE_AUDIT",
        "trend": "DEGRADATION_TRENDS",
        "wear_summary": "DEGRADATION_TRENDS",
        "degradation_trends": "DEGRADATION_TRENDS",
        "DEGRADATION_TRENDS": "DEGRADATION_TRENDS",
        "executive": "ECONOMIC_RELIABILITY",
        "maintenance_report": "ECONOMIC_RELIABILITY",
        "economic_reliability": "ECONOMIC_RELIABILITY",
        "ECONOMIC_RELIABILITY": "ECONOMIC_RELIABILITY",
        "sustainability": "ECONOMIC_RELIABILITY",
        "comprehensive_audit": "COMPREHENSIVE_AUDIT",
        "COMPREHENSIVE_AUDIT": "COMPREHENSIVE_AUDIT",
    }
    return mapping.get(raw_type, "COMPREHENSIVE_AUDIT")

@router.get("/generate")
async def generate_report_get(
    report_type: str = Query("COMPREHENSIVE_AUDIT", description="Report template type"),
    timeframe: str = Query("ALL", description="Timeframe filter: 24H, 7D, 30D, ALL"),
    machine_id: Optional[str] = Query(None, description="Optional machine filter"),
    tool_id: Optional[str] = Query(None, description="Optional tool filter"),
    db: Session = Depends(get_db)
):
    """
    Generate complete industrial report data for on-screen interactive rendering (GET).
    """
    try:
        norm_type = normalize_report_type(report_type)
        data = reports_service.generate_report_data(
            db=db,
            report_type=norm_type,
            timeframe=timeframe,
            machine_id=machine_id
        )
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.post("/generate")
async def generate_report_post(
    payload: GenerateReportRequest,
    db: Session = Depends(get_db)
):
    """
    Generate complete industrial report data for on-screen interactive rendering (POST).
    """
    try:
        norm_type = normalize_report_type(payload.report_type or "daily")
        data = reports_service.generate_report_data(
            db=db,
            report_type=norm_type,
            timeframe=payload.timeframe or "ALL",
            machine_id=payload.machine_id
        )
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/export")
async def export_report_universal(
    report_type: str = Query("daily"),
    format: str = Query("pdf", description="Export format: pdf, docx, word, csv"),
    timeframe: str = Query("ALL"),
    machine_id: Optional[str] = Query(None),
    tool_id: Optional[str] = Query(None),
    download: bool = Query(True),
    db: Session = Depends(get_db)
):
    """
    Universal export endpoint supporting format query parameter (pdf, docx, word, csv).
    """
    fmt = format.lower()
    norm_type = normalize_report_type(report_type)
    
    if fmt == "pdf":
        return await export_report_pdf(report_type=norm_type, timeframe=timeframe, machine_id=machine_id, download=download, db=db)
    elif fmt in ["docx", "word"]:
        return await export_report_docx(report_type=norm_type, timeframe=timeframe, machine_id=machine_id, db=db)
    elif fmt == "csv":
        return await export_report_csv(report_type=norm_type, timeframe=timeframe, machine_id=machine_id, db=db)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{format}'. Use pdf, docx, or csv.")

@router.get("/export/pdf")
async def export_report_pdf(
    report_type: str = Query("COMPREHENSIVE_AUDIT"),
    timeframe: str = Query("ALL"),
    machine_id: Optional[str] = Query(None),
    download: bool = Query(True, description="True to trigger file download, False to view inline"),
    db: Session = Depends(get_db)
):
    """
    Generate and export clean, executive-ready PDF report document.
    """
    try:
        norm_type = normalize_report_type(report_type)
        report_data = reports_service.generate_report_data(
            db=db,
            report_type=norm_type,
            timeframe=timeframe,
            machine_id=machine_id
        )
        pdf_bytes = reports_service.generate_pdf_report(report_data)
        
        filename = f"ToolGuard_{norm_type}_{report_data['report_id']}.pdf"
        disposition = "attachment" if download else "inline"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'{disposition}; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.get("/export/docx")
@router.get("/export/word")
async def export_report_docx(
    report_type: str = Query("COMPREHENSIVE_AUDIT"),
    timeframe: str = Query("ALL"),
    machine_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Generate and export editable Microsoft Word (.docx) report document.
    """
    try:
        norm_type = normalize_report_type(report_type)
        report_data = reports_service.generate_report_data(
            db=db,
            report_type=norm_type,
            timeframe=timeframe,
            machine_id=machine_id
        )
        docx_bytes = reports_service.generate_docx_report(report_data)
        
        filename = f"ToolGuard_{norm_type}_{report_data['report_id']}.docx"
        
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate DOCX: {str(e)}")

@router.get("/export/csv")
async def export_report_csv(
    report_type: str = Query("COMPREHENSIVE_AUDIT"),
    timeframe: str = Query("ALL"),
    machine_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Export raw inspection and tool telemetry data in standard CSV format.
    """
    try:
        norm_type = normalize_report_type(report_type)
        report_data = reports_service.generate_report_data(
            db=db,
            report_type=norm_type,
            timeframe=timeframe,
            machine_id=machine_id
        )
        csv_str = reports_service.generate_csv_report(report_data)
        filename = f"ToolGuard_Inspections_{report_data['report_id']}.csv"
        
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")
