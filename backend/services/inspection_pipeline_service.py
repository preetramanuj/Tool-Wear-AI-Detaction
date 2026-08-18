import os
import cv2
import numpy as np
import time
import datetime
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path

from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.database.crud import (
    create_inspection_record,
    update_tool_wear,
    get_tool_by_id,
    create_tool_person_event,
    create_alert,
)
from backend.services.tool_detection_service import tool_detection_service
from backend.services.wear_analysis_service import wear_analysis_service
from backend.services.health_prediction_service import health_prediction_service
from backend.services.face_detection_service import face_detection_service
from backend.services.person_tool_association_service import person_tool_association_service
from backend.services.rul_service import rul_service

logger = logging.getLogger(__name__)

class InspectionPipelineService:
    """
    Unified Industrial Inspection Pipeline:
    Connects:
      Model 1: Tool Detection (YOLO11n - 640x640)
        ↓
      Tool Domain Eligibility Validation (Checks for supported cutting inserts)
        ↓
      Model 2: Wear Analysis (NEW Phase3B Multimodal Gated Model - 384x384)
        ↓
      Model 3: Health Prediction (ImageOnly EfficientNet-B0 + Scaler)
        ↓
      Model 6: Remaining Useful Life (XGBoost 89-Feature Model -> Cycles)
        ↓
      Model 4 & Spatial: Face Auth & Person-Tool Interaction Engine
        ↓
      Persistence: SQLite Database & Storage Artifacts
    """

    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.processed_dir = settings.PROCESSED_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)

    def run_pipeline(
        self,
        image_bytes: bytes,
        filename: str,
        tool_id: Optional[str] = None,
        machine_id: Optional[str] = "CNC-01",
        operator_id: Optional[str] = "OP-DEFAULT",
        sensor_features: Optional[List[float]] = None,
        machining_params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end multi-model inference pipeline with strict domain eligibility protection.
        """
        start_time = time.time()
        inspection_id = f"INSP-{int(time.time() * 1000) % 10000000:07d}"
        stages_completed = []

        # 1. Decode Image from Bytes
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode uploaded image data.")

        # 2. Lookup Tool Metadata in Database
        tool_name = "Cutting Tool"
        tool_type = "Tool type unavailable"
        if tool_id:
            with SessionLocal() as db:
                tool_record = get_tool_by_id(db, tool_id)
                if tool_record:
                    tool_name = tool_record.tool_name
                    tool_type = tool_record.tool_type

        # 3. Stage 1: Tool Detection (YOLO11)
        tool_det_res = tool_detection_service.detect(image)
        stages_completed.append("TOOL_DETECTION")

        is_detected = tool_det_res.get("detected", False)
        is_supported = tool_det_res.get("is_supported", False)
        cropped_roi_bgr = tool_det_res.get("cropped_roi_bgr")
        tool_eligibility = tool_det_res.get("tool_eligibility", "NO_TOOL" if not is_detected else ("ELIGIBLE" if is_supported else "UNSUPPORTED"))

        # 4. Out-of-domain / Unsupported Tool Handling
        if is_detected and is_supported and cropped_roi_bgr is not None:
            # Tool is supported: Execute Stage 2 & 3
            wear_res = wear_analysis_service.predict(cropped_roi_bgr, sensor_features=sensor_features)
            stages_completed.append("WEAR_ANALYSIS")

            health_res = health_prediction_service.predict(cropped_roi_bgr)
            stages_completed.append("HEALTH_PREDICTION")
            
            # Stage 3b: Model 6 RUL Prediction (XGBoost)
            rul_res = {
                "available": False,
                "rul_value": None,
                "unit": "cycles",
                "wear_rate_um_per_cycle": None,
                "rul_status": "UNAVAILABLE_MISSING_WEAR",
                "health_status": "UNKNOWN"
            }
            if health_res.get("wear_um") is not None:
                try:
                    with SessionLocal() as db_ctx:
                        rul_feature_vec = rul_service.build_feature_vector_from_context(
                            tool_id=tool_id,
                            current_wear_um=health_res.get("wear_um"),
                            db=db_ctx,
                            sensor_data=sensor_features,
                            machining_params=machining_params,
                        )
                        rul_res = rul_service.predict_rul(rul_feature_vec)
                        stages_completed.append("RUL_PREDICTION")
                except Exception as e:
                    logger.warning(f"Error computing Model 6 RUL in pipeline: {e}")
        else:
            # UNSUPPORTED or NO TOOL: Skip downstream models gracefully without fabricating numbers
            msg = "Unsupported tool for current wear-analysis model." if is_detected else "No cutting tool detected in image."
            wear_res = {
                "status": "SKIPPED",
                "wear_value": None,
                "wear_um": None,
                "wear_unit": "mm",
                "wear_area": None,
                "wear_status": "SKIPPED",
                "message": msg,
            }
            health_res = {
                "status": "SKIPPED",
                "wear_um": None,
                "health_score": None,
                "health_status": "SKIPPED",
                "recommended_action": "Unsupported tool domain. Use certified CNC insert.",
                "message": msg,
            }
            rul_res = {
                "available": False,
                "rul_value": None,
                "unit": "cycles",
                "wear_rate_um_per_cycle": None,
                "rul_status": "SKIPPED_UNSUPPORTED_TOOL" if is_detected else "SKIPPED_NO_TOOL",
                "health_status": "SKIPPED",
                "message": msg,
            }

        # 5. Stage 4: Face Verification & Person-Tool Association
        face_verify_res = face_detection_service.verify_operator(image)
        operator_name = face_verify_res.get("identity", operator_id)

        person_dets = person_tool_association_service.detect_persons(image)
        associations = person_tool_association_service.evaluate_association(
            image=image,
            tool_detections=tool_det_res.get("detections", []),
            person_detections=person_dets,
            identified_operator=operator_name,
            tool_id=tool_id or "TL-001",
        )
        stages_completed.append("PERSON_TOOL_ASSOCIATION")

        # 6. Render HUD Overlay
        annotated_img = tool_detection_service.render_hud_overlay(
            image=image,
            detection_result=tool_det_res,
            wear_vb_mm=wear_res.get("wear_value") if is_supported else None,
            health_status=health_res.get("health_status") if is_supported else None,
        )

        # 7. Image Artifact Persistence
        orig_filename = f"{inspection_id}_orig.jpg"
        annot_filename = f"{inspection_id}_annot.jpg"
        crop_filename = f"{inspection_id}_crop.jpg"

        orig_path = os.path.join(self.upload_dir, orig_filename)
        annot_path = os.path.join(self.processed_dir, annot_filename)
        crop_path = os.path.join(self.processed_dir, crop_filename)

        cv2.imwrite(orig_path, image)
        cv2.imwrite(annot_path, annotated_img)
        if cropped_roi_bgr is not None:
            cv2.imwrite(crop_path, cropped_roi_bgr)
        else:
            crop_path = None

        latency_ms = round((time.time() - start_time) * 1000.0, 1)

        # 8. Database Persistence (SQLite)
        with SessionLocal() as db:
            insp_data = {
                "inspection_id": inspection_id,
                "tool_id": tool_id or ("TL-AUTO-DETECT" if is_detected else "UNIDENTIFIED"),
                "tool_name": tool_name,
                "tool_type": tool_type,
                "machine_id": machine_id,
                "operator_id": operator_name,
                "tool_detected": is_detected,
                "tool_eligibility": tool_eligibility,
                "detection_confidence": tool_det_res.get("confidence", 0.0),
                "detection_bbox": str(tool_det_res.get("bbox", [])),
                "wear_value": wear_res.get("wear_value") or 0.0,
                "wear_area": wear_res.get("wear_area") or 0.0,
                "wear_status": wear_res.get("wear_status", "UNKNOWN"),
                "wear_model_version": wear_res.get("model_version", "Phase3B_Gated_v1.0"),
                "wear_um": health_res.get("wear_um") or 0.0,
                "health_score": health_res.get("health_score") or 0.0,
                "health_status": health_res.get("health_status", "UNKNOWN"),
                "recommended_action": health_res.get("recommended_action", "None"),
                "rul_cycles": rul_res.get("rul_value"),
                "rul_wear_rate": rul_res.get("wear_rate_um_per_cycle"),
                "rul_status": rul_res.get("rul_status", "UNAVAILABLE"),
                "rul_unit": rul_res.get("unit", "cycles"),
                "rul_model": "xgb_rul_final",
                "rpm": machining_params.get("n", 1200.0) if machining_params else None,
                "feed_rate": machining_params.get("Vf", 360.0) if machining_params else None,
                "depth_of_cut": machining_params.get("Ap", 1.5) if machining_params else None,
                "temperature": float(sensor_features[0]) if sensor_features and len(sensor_features) > 0 else None,
                "vibration": float(sensor_features[1]) if sensor_features and len(sensor_features) > 1 else None,
                "original_image": f"/storage/uploaded_images/{orig_filename}",
                "annotated_image": f"/storage/processed_images/{annot_filename}",
                "cropped_roi": f"/storage/processed_images/{crop_filename}" if crop_path else None,
                "latency_ms": latency_ms,
                "device": "CPU" if not settings.DEVICE.startswith("cuda") else "CUDA",
            }
            create_inspection_record(db, insp_data)

            # Update tool wear stats if tool exists and is eligible
            if tool_id and is_detected and is_supported:
                update_tool_wear(
                    db=db,
                    tool_id=tool_id,
                    wear_um=health_res.get("wear_um", 0.0),
                    wear_vb_mm=wear_res.get("wear_value", 0.0),
                    status=health_res.get("health_status", "HEALTHY"),
                    rul_cycles=rul_res.get("rul_value"),
                    wear_rate=rul_res.get("wear_rate_um_per_cycle"),
                )

            # Log Tool-Person Event if association detected
            if associations:
                primary_assoc = associations[0]
                event_data = {
                    "operator_id": primary_assoc.get("operator_id", "UNKNOWN"),
                    "person_label": primary_assoc.get("person", "Operator"),
                    "tool_id": primary_assoc.get("tool_id", tool_id or "UNKNOWN"),
                    "tool_name": tool_name,
                    "relationship": primary_assoc.get("relationship", "NOT_ASSOCIATED"),
                    "confidence": primary_assoc.get("confidence", 0.0),
                    "frame_url": f"/storage/processed_images/{annot_filename}",
                }
                create_tool_person_event(db, event_data)

            # Generate Alert on High Wear or Critical RUL if eligible
            if is_supported and (health_res.get("health_status") in ["WARNING", "CRITICAL"] or (rul_res.get("rul_value") is not None and rul_res.get("rul_value") <= settings.RUL_CRITICAL_THRESHOLD_CYCLES)):
                alert_sev = "CRITICAL" if (health_res.get("health_status") == "CRITICAL" or (rul_res.get("rul_value") is not None and rul_res.get("rul_value") <= settings.RUL_CRITICAL_THRESHOLD_CYCLES)) else "WARNING"
                alert_data = {
                    "alert_id": f"ALT-{int(time.time()) % 100000}",
                    "alert_type": "WEAR_THRESHOLD_EXCEEDED" if health_res.get("health_status") in ["WARNING", "CRITICAL"] else "RUL_CRITICAL",
                    "severity": alert_sev,
                    "tool_id": tool_id,
                    "machine_id": machine_id,
                    "title": f"Tool Alert [{alert_sev}]: {tool_id}",
                    "message": f"Tool {tool_id} wear is {health_res.get('wear_um', 0.0):.1f} µm (VB: {wear_res.get('wear_value', 0.0):.3f} mm). RUL: {rul_res.get('rul_value')} cycles remaining. Action: {health_res.get('recommended_action')}",
                }
                create_alert(db, alert_data)

        return {
            "success": True,
            "inspection_id": inspection_id,
            "tool_id": tool_id,
            "tool_name": tool_name,
            "tool_type": tool_type,
            "machine_id": machine_id,
            "operator_id": operator_name,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "tool_detection": {
                "detected": is_detected,
                "confidence": tool_det_res.get("confidence", 0.0),
                "confidence_percent": tool_det_res.get("confidence_percent", "0.0%"),
                "bbox": tool_det_res.get("bbox", [0, 0, 0, 0]),
                "area_pixels": tool_det_res.get("area_pixels", 0),
                "tool_eligibility": tool_eligibility,
                "is_supported": is_supported,
                "message": tool_det_res.get("message", ""),
            },
            "wear_analysis": wear_res,
            "health_prediction": health_res,
            "rul_prediction": rul_res,
            "faces": face_verify_res,
            "associations": associations,
            "images": {
                "original": f"/storage/uploaded_images/{orig_filename}",
                "annotated": f"/storage/processed_images/{annot_filename}",
                "cropped_roi": f"/storage/processed_images/{crop_filename}" if crop_path else None,
            },
            "performance": {
                "latency_ms": latency_ms,
                "device": "CPU" if not settings.DEVICE.startswith("cuda") else "CUDA",
                "stages_completed": stages_completed,
            },
        }

inspection_pipeline_service = InspectionPipelineService()
