from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
import io

from backend.core.database import get_db
from backend.services.reports_service import reports_service

router = APIRouter(prefix="/reports", tags=["Industrial Reports & Compliance Documentation"])

@router.get("/generate")
async def generate_report_json(
    report_type: str = Query("COMPREHENSIVE_AUDIT", description="Report template type"),
    timeframe: str = Query("ALL", description="Timeframe filter: 24H, 7D, 30D, ALL"),
    machine_id: Optional[str] = Query(None, description="Optional machine filter"),
    db: Session = Depends(get_db)
):
    """
    Generate complete industrial report data for on-screen interactive rendering.
    """
    try:
        data = reports_service.generate_report_data(
            db=db,
            report_type=report_type,
            timeframe=timeframe,
            machine_id=machine_id
        )
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


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
        report_data = reports_service.generate_report_data(
            db=db,
            report_type=report_type,
            timeframe=timeframe,
            machine_id=machine_id
        )
        pdf_bytes = reports_service.generate_pdf_report(report_data)
        
        filename = f"ToolGuard_{report_type}_{report_data['report_id']}.pdf"
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
        report_data = reports_service.generate_report_data(
            db=db,
            report_type=report_type,
            timeframe=timeframe,
            machine_id=machine_id
        )
        docx_bytes = reports_service.generate_docx_report(report_data)
        
        filename = f"ToolGuard_{report_type}_{report_data['report_id']}.docx"
        
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
        report_data = reports_service.generate_report_data(
            db=db,
            report_type=report_type,
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
