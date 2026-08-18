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
      Model 2: Wear Analysis (LateFusion EfficientNet-B0 - 384x384)
        ↓
      Model 3: Health Prediction (ImageOnly - 384x384 + Scaler)
        ↓
      Model 6: Remaining Useful Life (XGBoost - 89 features -> cycles)
        ↓
      Model 4 & Spatial: Face Auth & Person-Tool Interaction Engine
        ↓
      Persistence: SQLite Database & Image Storage
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
    ) -> Dict[str, Any]:
        """
        Executes end-to-end multi-model inference pipeline.
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

        cropped_roi_bgr = tool_det_res.get("cropped_roi_bgr")

        # 4. Stage 2 & 3: Wear Analysis + Health Prediction
        if tool_det_res.get("detected", False) and cropped_roi_bgr is not None:
            # Stage 2: Flank Wear VB Regression
            wear_res = wear_analysis_service.predict(cropped_roi_bgr, sensor_features=sensor_features)
            stages_completed.append("WEAR_ANALYSIS")

            # Stage 3: Tool Health Diagnostic Prediction
            health_res = health_prediction_service.predict(cropped_roi_bgr)
            stages_completed.append("HEALTH_PREDICTION")
        else:
            # Graceful isolation when no tool is detected
            wear_res = {
                "status": "Wear estimation unavailable",
                "wear_value": 0.0,
                "wear_unit": "mm",
                "wear_area": 0.0,
                "message": "Tool ROI unavailable for wear calculation.",
            }
            health_res = {
                "status": "Health assessment unavailable",
                "wear_um": 0.0,
                "health_score": 0.0,
                "health_status": "UNKNOWN",
                "recommended_action": "Ensure cutting tool is in camera field of view.",
            }

        # 5. Stage 3b: Model 6 RUL Prediction (XGBoost)
        rul_res = {
            "available": False,
            "rul_value": None,
            "unit": "cycles",
            "wear_rate_um_per_cycle": None,
            "rul_status": "UNAVAILABLE_NO_TOOL" if not tool_det_res.get("detected") else "UNAVAILABLE_MISSING_WEAR",
            "health_status": "UNKNOWN"
        }
        if tool_det_res.get("detected", False) and health_res.get("wear_um") is not None:
            try:
                with SessionLocal() as db_ctx:
                    rul_feature_vec = rul_service.build_feature_vector_from_context(
                        tool_id=tool_id,
                        current_wear_um=health_res.get("wear_um"),
                        db=db_ctx,
                        sensor_data=sensor_features
                    )
                    rul_res = rul_service.predict_rul(rul_feature_vec)
                    stages_completed.append("RUL_PREDICTION")
            except Exception as e:
                logger.warning(f"Error computing Model 6 RUL in pipeline: {e}")

        # 6. Stage 4: Face Verification & Person-Tool Association
        face_verify_res = face_detection_service.verify_operator(image)
        operator_name = face_verify_res.get("identity", operator_id)

        # Detect Persons & Evaluate Association
        person_dets = person_tool_association_service.detect_persons(image)
        associations = person_tool_association_service.evaluate_association(
            image=image,
            tool_detections=tool_det_res.get("detections", []),
            person_detections=person_dets,
            identified_operator=operator_name,
            tool_id=tool_id or "T-014",
        )
        stages_completed.append("PERSON_TOOL_ASSOCIATION")

        # 7. Render HUD Overlay
        annotated_img = tool_detection_service.render_hud_overlay(
            image=image,
            detection_result=tool_det_res,
            wear_vb_mm=wear_res.get("wear_value") if tool_det_res.get("detected") else None,
            health_status=health_res.get("health_status") if tool_det_res.get("detected") else None,
        )

        # 8. Image Artifact Persistence
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

        # 9. Database Persistence (SQLite)
        with SessionLocal() as db:
            insp_data = {
                "inspection_id": inspection_id,
                "tool_id": tool_id or "TL-AUTO-DETECT",
                "tool_name": tool_name,
                "tool_type": tool_type,
                "machine_id": machine_id,
                "operator_id": operator_name,
                "tool_detected": tool_det_res.get("detected", False),
                "detection_confidence": tool_det_res.get("confidence", 0.0),
                "detection_bbox": str(tool_det_res.get("bbox", [])),
                "wear_value": wear_res.get("wear_value", 0.0),
                "wear_area": wear_res.get("wear_area", 0.0),
                "wear_status": wear_res.get("wear_status", "UNKNOWN"),
                "wear_um": health_res.get("wear_um", 0.0),
                "health_score": health_res.get("health_score", 0.0),
                "health_status": health_res.get("health_status", "UNKNOWN"),
                "recommended_action": health_res.get("recommended_action", "None"),
                "rul_cycles": rul_res.get("rul_value"),
                "rul_wear_rate": rul_res.get("wear_rate_um_per_cycle"),
                "rul_status": rul_res.get("rul_status", "UNAVAILABLE"),
                "rul_unit": rul_res.get("unit", "cycles"),
                "rul_model": "xgb_rul_final",
                "original_image": f"/storage/uploaded_images/{orig_filename}",
                "annotated_image": f"/storage/processed_images/{annot_filename}",
                "cropped_roi": f"/storage/processed_images/{crop_filename}" if crop_path else None,
                "latency_ms": latency_ms,
                "device": "CPU" if not settings.DEVICE.startswith("cuda") else "CUDA",
            }
            create_inspection_record(db, insp_data)

            # Update tool wear stats if tool exists
            if tool_id and tool_det_res.get("detected", False):
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

            # Generate Alert on High Wear or Critical RUL
            if health_res.get("health_status") in ["WARNING", "CRITICAL"] or (rul_res.get("rul_value") is not None and rul_res.get("rul_value") <= settings.RUL_CRITICAL_THRESHOLD_CYCLES):
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
                "detected": tool_det_res.get("detected", False),
                "confidence": tool_det_res.get("confidence", 0.0),
                "confidence_percent": tool_det_res.get("confidence_percent", "0.0%"),
                "bbox": tool_det_res.get("bbox", [0, 0, 0, 0]),
                "area_pixels": tool_det_res.get("area_pixels", 0),
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
