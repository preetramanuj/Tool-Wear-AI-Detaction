import os
import io
import csv
import json
import base64
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import numpy as np

from backend.core.config import settings
from backend.core.database import get_db
from backend.services.inspection_pipeline_service import inspection_pipeline_service
from backend.database.crud import (
    get_inspections,
    get_inspection_by_id,
    get_sensor_reading_by_inspection_id,
    get_sensor_readings_history,
)

router = APIRouter(prefix="/inspection", tags=["Unified Inspection Pipeline"])

class Base64InspectionRequest(BaseModel):
    image_base64: str
    tool_id: Optional[str] = None
    machine_id: Optional[str] = "CNC-01"
    operator_id: Optional[str] = "OP-DEFAULT"
    sensor_data: Optional[Any] = None
    input_mode: Optional[str] = "CAMERA"

def parse_sensor_upload_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses an uploaded CSV or JSON sensor telemetry file and computes summary statistics.
    """
    if not file_bytes:
        return {}
    
    fname = filename.lower()
    if fname.endswith(".json"):
        try:
            return json.loads(file_bytes.decode("utf-8"))
        except Exception as e:
            raise ValueError(f"Invalid JSON sensor file: {e}")
            
    elif fname.endswith(".csv") or fname.endswith(".txt"):
        try:
            text = file_bytes.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            if not rows:
                return {}
            
            # Helper to extract numeric column safely
            def get_col_vals(candidates: List[str]) -> List[float]:
                for c in candidates:
                    matched = [k for k in rows[0].keys() if k.strip().lower() == c.lower()]
                    if matched:
                        col_name = matched[0]
                        vals = []
                        for r in rows:
                            try:
                                v = float(r[col_name])
                                vals.append(v)
                            except (ValueError, TypeError):
                                pass
                        if vals:
                            return vals
                return []

            vx = get_col_vals(["vibration_x", "vib_x", "acc_x", "ax", "vibrationx"])
            vy = get_col_vals(["vibration_y", "vib_y", "acc_y", "ay", "vibrationy"])
            vz = get_col_vals(["vibration_z", "vib_z", "acc_z", "az", "vibrationz"])
            temp = get_col_vals(["temperature", "temp", "temp_c", "t_cutting"])
            curr = get_col_vals(["spindle_current", "current", "current_a", "i_spindle"])
            pwr = get_col_vals(["spindle_power", "power", "power_w", "p_spindle"])
            force = get_col_vals(["cutting_force", "force", "force_n", "fz", "f_total"])
            ae = get_col_vals(["acoustic_emission", "ae", "ae_rms", "acoustic"])
            snd = get_col_vals(["sound_level", "sound", "sound_db", "noise"])
            rpm = get_col_vals(["rpm", "spindle_speed", "speed", "n"])
            feed = get_col_vals(["feed_rate", "feed", "vf", "fz"])
            ap = get_col_vals(["depth_of_cut", "depth", "ap", "doc"])

            parsed: Dict[str, Any] = {
                "source": f"CSV_UPLOAD: {os.path.basename(filename)}",
                "sample_count": len(rows),
            }

            if vx: parsed["vibration_x"] = round(float(np.mean(vx)), 3)
            if vy: parsed["vibration_y"] = round(float(np.mean(vy)), 3)
            if vz: parsed["vibration_z"] = round(float(np.mean(vz)), 3)
            
            # Compute RMS vibration
            all_vib = []
            if vx: all_vib.extend([v**2 for v in vx])
            if vy: all_vib.extend([v**2 for v in vy])
            if vz: all_vib.extend([v**2 for v in vz])
            if all_vib:
                parsed["vibration_rms"] = round(float(np.sqrt(np.mean(all_vib))), 3)
                parsed["vibration_peak"] = round(float(max([max(vx) if vx else 0, max(vy) if vy else 0, max(vz) if vz else 0])), 3)

            if temp: parsed["temperature"] = round(float(np.mean(temp)), 2)
            if curr: parsed["spindle_current"] = round(float(np.mean(curr)), 2)
            if pwr: parsed["spindle_power"] = round(float(np.mean(pwr)), 1)
            if force: parsed["cutting_force"] = round(float(np.mean(force)), 1)
            if ae: parsed["acoustic_emission"] = round(float(np.mean(ae)), 2)
            if snd: parsed["sound_level"] = round(float(np.mean(snd)), 1)
            if rpm: parsed["rpm"] = round(float(np.mean(rpm)), 0)
            if feed: parsed["feed_rate"] = round(float(np.mean(feed)), 1)
            if ap: parsed["depth_of_cut"] = round(float(np.mean(ap)), 2)

            return parsed
        except Exception as e:
            raise ValueError(f"Failed to parse CSV sensor file: {e}")
    else:
        raise ValueError("Unsupported sensor file format. Please upload .csv, .txt, or .json.")


@router.post("/analyze")
async def analyze_tool_image(
    image: UploadFile = File(...),
    tool_id: Optional[str] = Form(None),
    machine_id: Optional[str] = Form("CNC-01"),
    operator_id: Optional[str] = Form("OP-DEFAULT"),
    sensor_json: Optional[str] = Form(None),
    sensor_file: Optional[UploadFile] = File(None),
    input_mode: Optional[str] = Form("IMAGE"),
    db: Session = Depends(get_db)
):
    """
    Unified AI Multimodal Inspection Endpoint:
    Supports 3 Modes:
      1. IMAGE: Tool Detection -> Wear Analysis -> Health -> RUL -> SQLite.
      2. LIVE CAMERA: Snapshot frame inspection.
      3. IMAGE + SENSOR: Multimodal vision + physical sensor telemetry fusion.
    """
    try:
        contents = await image.read()
        
        # Parse sensor inputs from either direct JSON form string or uploaded file
        sensor_telemetry: Dict[str, Any] = {}
        if sensor_file and sensor_file.filename:
            file_bytes = await sensor_file.read()
            sensor_telemetry = parse_sensor_upload_file(file_bytes, sensor_file.filename)
            
        if sensor_json:
            try:
                manual_parsed = json.loads(sensor_json)
                if isinstance(manual_parsed, dict):
                    # Merge manual inputs on top of file inputs
                    sensor_telemetry.update(manual_parsed)
            except Exception as e:
                logger.warning(f"Could not parse sensor_json string: {e}")

        result = inspection_pipeline_service.run_pipeline(
            image_bytes=contents,
            filename=image.filename or "inspection.jpg",
            tool_id=tool_id,
            machine_id=machine_id,
            operator_id=operator_id,
            sensor_telemetry=sensor_telemetry if sensor_telemetry else None,
            input_mode=input_mode or "IMAGE",
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing error: {str(e)}")


@router.post("/analyze-base64")
async def analyze_tool_image_base64(
    payload: Base64InspectionRequest,
    db: Session = Depends(get_db)
):
    """Unified inspection via base64 encoded image string (e.g. Webcam frame snapshot)"""
    try:
        raw_b64 = payload.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        raw_bytes = base64.b64decode(raw_b64)
        
        sensor_telemetry = payload.sensor_data if isinstance(payload.sensor_data, dict) else None
        
        result = inspection_pipeline_service.run_pipeline(
            image_bytes=raw_bytes,
            filename="camera_snapshot.jpg",
            tool_id=payload.tool_id,
            machine_id=payload.machine_id or "CNC-01",
            operator_id=payload.operator_id or "OP-DEFAULT",
            sensor_telemetry=sensor_telemetry,
            input_mode=payload.input_mode or "CAMERA",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Base64 pipeline processing error: {str(e)}")


@router.get("/records")
async def list_inspection_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tool_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Fetch paginated audit history of past inspections."""
    records = get_inspections(db, skip=skip, limit=limit)
    serialized = []
    for r in records:
        if tool_id and tool_id != "ALL" and r.tool_id != tool_id:
            continue
        serialized.append({
            "inspection_id": r.inspection_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "tool_id": r.tool_id,
            "tool_name": r.tool_name,
            "tool_type": r.tool_type,
            "machine_id": r.machine_id,
            "operator_id": r.operator_id,
            "tool_detection": {
                "detected": r.tool_detected,
                "confidence": r.detection_confidence,
                "tool_eligibility": r.tool_eligibility,
            },
            "wear_analysis": {
                "wear_value": r.wear_value,
                "wear_area": r.wear_area,
                "wear_status": r.wear_status,
            },
            "health_prediction": {
                "wear_um": r.wear_um,
                "health_score": r.health_score,
                "health_status": r.health_status,
                "recommended_action": r.recommended_action,
            },
            "rul_prediction": {
                "available": r.rul_cycles is not None,
                "rul_value": r.rul_cycles,
                "wear_rate_um_per_cycle": r.rul_wear_rate,
                "rul_status": r.rul_status,
                "unit": r.rul_unit or "cycles",
                "model": r.rul_model or "xgb_rul_final",
            },
            "sensors": {
                "temperature": r.temperature,
                "vibration": r.vibration,
                "rpm": r.rpm,
                "feed_rate": r.feed_rate,
                "depth_of_cut": r.depth_of_cut,
            },
            "images": {
                "original": r.original_image,
                "annotated": r.annotated_image,
                "cropped_roi": r.cropped_roi,
            },
            "performance": {
                "latency_ms": r.latency_ms,
                "device": r.device,
            }
        })
    return {
        "success": True,
        "count": len(serialized),
        "inspections": serialized
    }


@router.get("/records/{inspection_id}")
async def get_inspection_detail(
    inspection_id: str,
    db: Session = Depends(get_db)
):
    """Get single inspection audit record by ID including sensor readings."""
    r = get_inspection_by_id(db, inspection_id)
    if not r:
        raise HTTPException(status_code=404, detail=f"Inspection record '{inspection_id}' not found")
    
    sensor_rec = get_sensor_reading_by_inspection_id(db, inspection_id)
    sensor_dict = sensor_rec.to_dict() if sensor_rec else None

    return {
        "success": True,
        "inspection": {
            "inspection_id": r.inspection_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "tool_id": r.tool_id,
            "tool_name": r.tool_name,
            "tool_type": r.tool_type,
            "machine_id": r.machine_id,
            "operator_id": r.operator_id,
            "tool_detection": {
                "detected": r.tool_detected,
                "confidence": r.detection_confidence,
                "tool_eligibility": r.tool_eligibility,
            },
            "wear_analysis": {
                "wear_value": r.wear_value,
                "wear_area": r.wear_area,
                "wear_status": r.wear_status,
            },
            "health_prediction": {
                "wear_um": r.wear_um,
                "health_score": r.health_score,
                "health_status": r.health_status,
                "recommended_action": r.recommended_action,
            },
            "rul_prediction": {
                "available": r.rul_cycles is not None,
                "rul_value": r.rul_cycles,
                "wear_rate_um_per_cycle": r.rul_wear_rate,
                "rul_status": r.rul_status,
                "unit": r.rul_unit or "cycles",
                "model": r.rul_model or "xgb_rul_final",
            },
            "sensor_readings": sensor_dict,
            "images": {
                "original": r.original_image,
                "annotated": r.annotated_image,
                "cropped_roi": r.cropped_roi,
            },
            "performance": {
                "latency_ms": r.latency_ms,
                "device": r.device,
            }
        }
    }


@router.get("/{inspection_id}/sensors")
async def get_inspection_sensors(
    inspection_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve full physical telemetry reading for an inspection."""
    sensor_rec = get_sensor_reading_by_inspection_id(db, inspection_id)
    if not sensor_rec:
        raise HTTPException(status_code=404, detail=f"No sensor telemetry found for inspection '{inspection_id}'")
    
    return {
        "success": True,
        "inspection_id": inspection_id,
        "sensor_reading": sensor_rec.to_dict()
    }


@router.get("/sensors/history")
async def get_sensors_telemetry_history(
    tool_id: Optional[str] = Query(None, description="Optional tool ID filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve historical sensor readings across inspections."""
    readings = get_sensor_readings_history(db, skip=skip, limit=limit, tool_id=tool_id)
    return {
        "success": True,
        "count": len(readings),
        "sensors": [r.to_dict() for r in readings]
    }


@router.get("/image")
async def get_inspection_image_by_path(path: str = Query(..., description="Image path or filename")):
    """
    Serve raw or annotated inspection images safely to browser.
    Resolves relative, storage, and processed image paths.
    """
    clean_path = path.lstrip("/").replace("\\", "/")
    
    if clean_path.startswith("storage/"):
        rel_sub = clean_path[len("storage/"):]
        target_file = os.path.join(settings.STORAGE_DIR, rel_sub)
    else:
        target_file = os.path.join(settings.STORAGE_DIR, clean_path)
    
    if not os.path.exists(target_file):
        direct_proc = os.path.join(settings.PROCESSED_DIR, os.path.basename(clean_path))
        direct_upl = os.path.join(settings.UPLOAD_DIR, os.path.basename(clean_path))
        if os.path.exists(direct_proc):
            target_file = direct_proc
        elif os.path.exists(direct_upl):
            target_file = direct_upl
        elif os.path.exists(path):
            target_file = path
        else:
            raise HTTPException(status_code=404, detail=f"Inspection image not found: '{path}'")
    
    media_type = "image/png" if target_file.lower().endswith(".png") else "image/jpeg"
    return FileResponse(target_file, media_type=media_type)


@router.get("/{inspection_id}/image")
async def get_inspection_image_by_id(
    inspection_id: str,
    type: str = Query("annotated", description="Image type: 'annotated', 'original', or 'cropped_roi'"),
    db: Session = Depends(get_db)
):
    """Serve the inspection image directly by inspection ID"""
    r = get_inspection_by_id(db, inspection_id)
    if not r:
        raise HTTPException(status_code=404, detail=f"Inspection record '{inspection_id}' not found")
    
    target_path = r.annotated_image
    if type == "original" and r.original_image:
        target_path = r.original_image
    elif type == "cropped_roi" and r.cropped_roi:
        target_path = r.cropped_roi
    
    if not target_path:
        raise HTTPException(status_code=404, detail=f"Image type '{type}' not available for '{inspection_id}'")
    
    return await get_inspection_image_by_path(target_path)
