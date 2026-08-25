import base64
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
    create_sensor_reading,
)
from backend.services.tool_detection_service import tool_detection_service
from backend.services.tool_matching_service import tool_matching_service
from backend.services.wear_analysis_service import wear_analysis_service
from backend.services.health_prediction_service import health_prediction_service
from backend.services.face_detection_service import face_detection_service
from backend.services.person_tool_association_service import person_tool_association_service
from backend.services.rul_service import rul_service

logger = logging.getLogger(__name__)

class InspectionPipelineService:
    """
    Unified Industrial Inspection Pipeline:
    Supports 3 Input Modes:
      1. IMAGE: Optical tool image analysis
      2. LIVE CAMERA: Computer webcam snapshot analysis
      3. IMAGE + SENSOR: Multimodal vision + physical telemetry fusion

    Connects:
      Model 1: Tool Detection (YOLO11n - 640x640)
        ↓
      Tool Domain Eligibility Validation (Checks for supported cutting inserts)
        ↓
      Model 2: Wear Analysis (Phase3B Multimodal Gated Model - 384x384 + 5-dim sensor fusion)
        ↓
      Model 3: Health Prediction (ImageOnly EfficientNet-B0 + Scaler)
        ↓
      Model 6: Remaining Useful Life (XGBoost 89-Feature Model -> Cycles)
        ↓
      Model 4 & Spatial: Face Auth & Person-Tool Interaction Engine
        ↓
      Cross-Modal Synthesis & Combined Insights
        ↓
      Persistence: SQLite Database (Inspections & SensorReadings)
    """

    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.processed_dir = settings.PROCESSED_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)

    def parse_sensor_telemetry(self, raw_sensors: Optional[Any]) -> Dict[str, Any]:
        """
        Parses, validates, and normalizes manual or structured sensor telemetry.
        """
        if not raw_sensors:
            return {}
            
        if isinstance(raw_sensors, str):
            try:
                import json
                raw_sensors = json.loads(raw_sensors)
            except Exception:
                return {}

        parsed: Dict[str, Any] = {}
        
        # Vibration
        vib = raw_sensors.get("vibration", {}) if isinstance(raw_sensors.get("vibration"), dict) else {}
        vx = raw_sensors.get("vibration_x", vib.get("x"))
        vy = raw_sensors.get("vibration_y", vib.get("y"))
        vz = raw_sensors.get("vibration_z", vib.get("z"))
        v_rms = raw_sensors.get("vibration_rms", vib.get("rms"))
        v_peak = raw_sensors.get("vibration_peak", vib.get("peak"))
        
        try:
            parsed["vibration_x"] = float(vx) if vx is not None and str(vx).strip() != "" else None
        except (ValueError, TypeError):
            parsed["vibration_x"] = None
            
        try:
            parsed["vibration_y"] = float(vy) if vy is not None and str(vy).strip() != "" else None
        except (ValueError, TypeError):
            parsed["vibration_y"] = None
            
        try:
            parsed["vibration_z"] = float(vz) if vz is not None and str(vz).strip() != "" else None
        except (ValueError, TypeError):
            parsed["vibration_z"] = None
            
        if v_rms is not None and str(v_rms).strip() != "":
            try:
                parsed["vibration_rms"] = float(v_rms)
            except (ValueError, TypeError):
                parsed["vibration_rms"] = None
        elif any(v is not None for v in [parsed["vibration_x"], parsed["vibration_y"], parsed["vibration_z"]]):
            components = [v**2 for v in [parsed["vibration_x"], parsed["vibration_y"], parsed["vibration_z"]] if v is not None]
            parsed["vibration_rms"] = round(float(np.sqrt(sum(components) / max(1, len(components)))), 3)
        else:
            parsed["vibration_rms"] = None

        try:
            parsed["vibration_peak"] = float(v_peak) if v_peak is not None and str(v_peak).strip() != "" else None
        except (ValueError, TypeError):
            parsed["vibration_peak"] = None

        # Temperature
        temp_val = raw_sensors.get("temperature", {}).get("value") if isinstance(raw_sensors.get("temperature"), dict) else raw_sensors.get("temperature")
        try:
            parsed["temperature"] = float(temp_val) if temp_val is not None and str(temp_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["temperature"] = None

        # Electrical / Mechanical
        curr_val = raw_sensors.get("spindle_current", {}).get("value") if isinstance(raw_sensors.get("spindle_current"), dict) else raw_sensors.get("spindle_current")
        try:
            parsed["spindle_current"] = float(curr_val) if curr_val is not None and str(curr_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["spindle_current"] = None

        pwr_val = raw_sensors.get("spindle_power", {}).get("value") if isinstance(raw_sensors.get("spindle_power"), dict) else raw_sensors.get("spindle_power")
        try:
            parsed["spindle_power"] = float(pwr_val) if pwr_val is not None and str(pwr_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["spindle_power"] = None

        force_val = raw_sensors.get("cutting_force", {}).get("value") if isinstance(raw_sensors.get("cutting_force"), dict) else raw_sensors.get("cutting_force")
        try:
            parsed["cutting_force"] = float(force_val) if force_val is not None and str(force_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["cutting_force"] = None

        # Acoustic / Sound
        ae_val = raw_sensors.get("acoustic_emission", {}).get("value") if isinstance(raw_sensors.get("acoustic_emission"), dict) else raw_sensors.get("acoustic_emission")
        try:
            parsed["acoustic_emission"] = float(ae_val) if ae_val is not None and str(ae_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["acoustic_emission"] = None

        snd_val = raw_sensors.get("sound_level", {}).get("value") if isinstance(raw_sensors.get("sound_level"), dict) else raw_sensors.get("sound_level")
        try:
            parsed["sound_level"] = float(snd_val) if snd_val is not None and str(snd_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["sound_level"] = None

        # Process Parameters
        proc = raw_sensors.get("process_parameters", {}) if isinstance(raw_sensors.get("process_parameters"), dict) else {}
        rpm_val = raw_sensors.get("rpm", proc.get("rpm"))
        feed_val = raw_sensors.get("feed_rate", proc.get("feed_rate"))
        ap_val = raw_sensors.get("depth_of_cut", proc.get("depth_of_cut"))

        try:
            parsed["rpm"] = float(rpm_val) if rpm_val is not None and str(rpm_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["rpm"] = None

        try:
            parsed["feed_rate"] = float(feed_val) if feed_val is not None and str(feed_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["feed_rate"] = None

        try:
            parsed["depth_of_cut"] = float(ap_val) if ap_val is not None and str(ap_val).strip() != "" else None
        except (ValueError, TypeError):
            parsed["depth_of_cut"] = None

        parsed["source"] = raw_sensors.get("source", "MANUAL_ENTRY")
        return parsed

    def generate_combined_insights(
        self,
        wear_vb_mm: Optional[float],
        wear_status: str,
        health_status: str,
        sensor_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generates cross-modal insights synthesizing vision wear analysis and physical sensor metrics.
        """
        insights = []
        if not sensor_data:
            return [{
                "category": "VISION_ONLY",
                "title": "Vision-Based Assessment",
                "narrative": f"Inspection executed with optical imaging only. Tool exhibits {wear_status} flank wear ({wear_vb_mm if wear_vb_mm is not None else 0.0:.3f} mm). No active sensor stream was attached.",
                "confidence": "HIGH"
            }]

        temp = sensor_data.get("temperature")
        vib_rms = sensor_data.get("vibration_rms")
        force = sensor_data.get("cutting_force")
        current = sensor_data.get("spindle_current")

        has_high_wear = wear_status in ["MODERATE", "SEVERE"] or health_status in ["WARNING", "CRITICAL"]
        has_high_temp = temp is not None and temp > 55.0
        has_high_vib = vib_rms is not None and vib_rms > 1.8
        has_high_force = force is not None and force > 150.0

        if has_high_wear and (has_high_temp or has_high_vib or has_high_force):
            anomaly_desc = []
            if has_high_temp: anomaly_desc.append(f"elevated cutting zone thermal load ({temp:.1f}°C)")
            if has_high_vib: anomaly_desc.append(f"heightened vibration RMS ({vib_rms:.2f} m/s²)")
            if has_high_force: anomaly_desc.append(f"increased tool resistance force ({force:.1f} N)")

            insights.append({
                "category": "CROSS_MODAL_CONGRUENCE",
                "title": "Multimodal Correlation: Wear Progression Confirmed",
                "narrative": f"Vision inspection identified {wear_vb_mm if wear_vb_mm is not None else 0.0:.3f} mm ({wear_status}) flank wear band. Physical telemetry strongly corroborates degradation via {', '.join(anomaly_desc)}.",
                "confidence": "VERY_HIGH",
                "recommended_action": "Schedule tool insert indexing within the next scheduled maintenance window."
            })
        elif has_high_wear and not (has_high_temp or has_high_vib):
            insights.append({
                "category": "OPTICAL_LEAD",
                "title": "Optical Wear Detection Precedes Dynamic Load Spike",
                "narrative": f"Optical analysis detected visible flank degradation ({wear_vb_mm if wear_vb_mm is not None else 0.0:.3f} mm), while cutting dynamics (vibration & temperature) remain temporarily within safe margins.",
                "confidence": "HIGH",
                "recommended_action": "Monitor vibration trends on subsequent cutting cycles."
            })
        elif not has_high_wear and (has_high_temp or has_high_vib or has_high_force):
            insights.append({
                "category": "DYNAMIC_ANOMALY",
                "title": "Kinematic Anomaly Under Normal Tool Geometry",
                "narrative": f"Cutting edge geometry appears intact ({wear_status} wear), but elevated telemetry indicates process instability (e.g. workpiece hardness variation, chatter, or insufficient coolant flow).",
                "confidence": "HIGH",
                "recommended_action": "Inspect workpiece clamping rigidity, spindle lubrication, and coolant pressure."
            })
        else:
            insights.append({
                "category": "NOMINAL_OPERATION",
                "title": "Multimodal Congruence: Tool & Process in Nominal State",
                "narrative": f"Both vision analysis ({wear_vb_mm if wear_vb_mm is not None else 0.0:.3f} mm flank wear) and operational sensors (thermal, vibrational, and electrical load) indicate normal, stable cutting conditions.",
                "confidence": "VERY_HIGH",
                "recommended_action": "Continue scheduled production without intervention."
            })

        return insights

    def run_pipeline(
        self,
        image_bytes: bytes,
        filename: str,
        tool_id: Optional[str] = None,
        machine_id: Optional[str] = "CNC-01",
        operator_id: Optional[str] = "OP-DEFAULT",
        sensor_features: Optional[List[float]] = None,
        machining_params: Optional[Dict[str, Any]] = None,
        sensor_telemetry: Optional[Dict[str, Any]] = None,
        input_mode: str = "IMAGE",
    ) -> Dict[str, Any]:
        """
        Executes end-to-end multi-model inference pipeline with strict domain eligibility protection.
        """
        start_time = time.time()
        inspection_id = f"INSP-{int(time.time() * 1000) % 10000000:07d}"
        reading_id = f"SENS-{int(time.time() * 1000) % 10000000:07d}"
        stages_completed = []

        # 1. Decode Image from Bytes
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode uploaded image data.")

        # 2. Parse and Validate Sensor Telemetry
        parsed_sensors = self.parse_sensor_telemetry(sensor_telemetry)
        if not sensor_features and parsed_sensors:
            # Build 5-dim sensor vector for Model 2: [vib_x, vib_y, vib_z, current, temp]
            vx = parsed_sensors.get("vibration_x") or parsed_sensors.get("vibration_rms") or 0.0
            vy = parsed_sensors.get("vibration_y") or 0.0
            vz = parsed_sensors.get("vibration_z") or 0.0
            curr = parsed_sensors.get("spindle_current") or 0.0
            tmp = parsed_sensors.get("temperature") or 0.0
            sensor_features = [float(vx), float(vy), float(vz), float(curr), float(tmp)]

        if not machining_params and parsed_sensors:
            machining_params = {
                "n": parsed_sensors.get("rpm", 1200.0) or 1200.0,
                "Vf": parsed_sensors.get("feed_rate", 360.0) or 360.0,
                "Ap": parsed_sensors.get("depth_of_cut", 1.5) or 1.5,
            }

        # 3. Lookup Tool Metadata in Database
        tool_name = "Cutting Tool"
        tool_type = "Carbide Insert (CNMG)"
        if tool_id:
            with SessionLocal() as db:
                tool_record = get_tool_by_id(db, tool_id)
                if tool_record:
                    tool_name = tool_record.tool_name
                    tool_type = tool_record.tool_type

        # 4. Stage 1: Tool Detection (YOLO11)
        tool_det_res = tool_detection_service.detect(image)
        stages_completed.append("TOOL_DETECTION")

        is_detected = tool_det_res.get("detected", False)
        is_supported = tool_det_res.get("is_supported", False)
        cropped_roi_bgr = tool_det_res.get("cropped_roi_bgr")
        tool_eligibility = tool_det_res.get("tool_eligibility", "NO_TOOL" if not is_detected else ("ELIGIBLE" if is_supported else "UNSUPPORTED"))

        # Stage 4 preview: Detect Faces & Verify Operator
        face_det_res = face_detection_service.detect_faces(image)
        face_verify_res = face_detection_service.verify_operator(image)
        operator_name = face_verify_res.get("identity", operator_id)
        faces_count = face_det_res.get("faces_detected", 0)
        face_list = face_det_res.get("faces", [])
        is_face_present = faces_count > 0 or face_verify_res.get("detected", False)

        # 5. Domain Eligibility & Face Detection Handling
        if is_face_present and (not is_detected or tool_det_res.get("confidence", 0.0) < 0.70):
            # Face detected in camera view, but no cutting tool
            is_detected = False
            is_supported = False
            cropped_roi_bgr = None
            tool_eligibility = "FACE_DETECTED_NO_TOOL"
            tool_det_res["tool_eligibility"] = "FACE_DETECTED_NO_TOOL"
            tool_det_res["detected"] = False
            tool_det_res["message"] = "Tool not detected. Operator face detected in camera field of view. Please aim camera directly at the CNC cutting insert flank."
            
            wear_res = {
                "status": "SKIPPED",
                "wear_value": None,
                "wear_um": None,
                "wear_unit": "mm",
                "wear_area": None,
                "wear_status": "FACE_IN_VIEW",
                "message": "Tool not detected. Operator face detected in camera view.",
            }
            health_res = {
                "status": "FACE_DETECTED",
                "wear_um": None,
                "health_score": None,
                "health_status": "FACE_DETECTED",
                "recommended_action": "Tool not detected. Operator face detected in camera view. Point camera directly at the cutting tool insert to inspect wear.",
                "message": "Operator face detected in field of view.",
            }
            rul_res = {
                "available": False,
                "rul_value": None,
                "unit": "cycles",
                "wear_rate_um_per_cycle": None,
                "rul_status": "SKIPPED_FACE_DETECTED",
                "health_status": "FACE_DETECTED",
                "message": "Tool not detected. Operator face detected in frame.",
            }
        elif is_detected and is_supported and cropped_roi_bgr is not None:
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
                "recommended_action": "Unsupported tool domain. Use certified CNC insert." if is_detected else "No cutting tool detected. Point camera at cutting tool.",
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

        # 5b. Tool Registry Reference Matching (Few-Shot Visual Identification)
        registry_match_res = {
            "matched": False,
            "tool_id": tool_id or ("TL-001" if is_detected else "UNIDENTIFIED"),
            "tool_name": tool_name or "Cutting Tool",
            "similarity": 0.0,
            "similarity_percent": "0.0%",
            "match_status": "SKIPPED" if not is_detected else "UNKNOWN_TOOL",
            "message": "Tool detection skipped or not detected.",
        }

        if is_detected and cropped_roi_bgr is not None:
            with SessionLocal() as db_match:
                registry_match_res = tool_matching_service.match_tool_roi(
                    query_crop_bgr=cropped_roi_bgr,
                    target_tool_id=tool_id,
                    db=db_match
                )
            stages_completed.append("TOOL_REGISTRY_MATCHING")

            if registry_match_res.get("matched"):
                matched_id = registry_match_res.get("tool_id")
                if matched_id and matched_id != "UNKNOWN":
                    tool_id = matched_id
                    tool_name = registry_match_res.get("tool_name", tool_name)

        # 6. Stage 4: Person-Tool Association
        person_dets = person_tool_association_service.detect_persons(image)
        associations = person_tool_association_service.evaluate_association(
            image=image,
            tool_detections=tool_det_res.get("detections", []),
            person_detections=person_dets,
            identified_operator=operator_name,
            tool_id=tool_id or "TL-001",
        )
        stages_completed.append("PERSON_TOOL_ASSOCIATION")

        # 7. Render HUD Overlay
        annotated_img = tool_detection_service.render_hud_overlay(
            image=image,
            detection_result=tool_det_res,
            wear_vb_mm=wear_res.get("wear_value") if is_supported else None,
            health_status=health_res.get("health_status") if is_supported else None,
            face_detections=face_list if not is_detected else None,
        )

        # Encode base64 annotated data URL
        _, annot_buf = cv2.imencode(".jpg", annotated_img)
        b64_annot_img = f"data:image/jpeg;base64,{base64.b64encode(annot_buf).decode('utf-8')}"

        # 8. Cross-Modal Synthesis & Combined Insights
        combined_insights = self.generate_combined_insights(
            wear_vb_mm=wear_res.get("wear_value") if is_supported else None,
            wear_status=wear_res.get("wear_status", "UNKNOWN"),
            health_status=health_res.get("health_status", "UNKNOWN"),
            sensor_data=parsed_sensors
        )

        if is_detected and not registry_match_res.get("matched") and registry_match_res.get("match_status") == "UNKNOWN_TOOL":
            combined_insights.append({
                "title": "Unregistered Physical Tool",
                "description": "Tool detected visually, but no matching reference profile found in Tool Inventory. You can register this tool in Tool Inventory with reference photos for automated visual identification.",
                "severity": "INFO",
                "category": "TOOL_REGISTRY"
            })

        if not is_detected and is_face_present:
            combined_insights.insert(0, {
                "title": "Human Face / Operator Detected",
                "description": "Operator face recognized in camera field of view. Cutting tool was not detected. Please align the camera lens with the cutting insert flank.",
                "severity": "WARNING",
                "category": "CAMERA_ALIGNMENT"
            })

        # 9. Image Artifact Persistence
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

        # 10. Database Persistence (SQLite)
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
                "rpm": parsed_sensors.get("rpm") or (machining_params.get("n", 1200.0) if machining_params else None),
                "feed_rate": parsed_sensors.get("feed_rate") or (machining_params.get("Vf", 360.0) if machining_params else None),
                "depth_of_cut": parsed_sensors.get("depth_of_cut") or (machining_params.get("Ap", 1.5) if machining_params else None),
                "temperature": parsed_sensors.get("temperature") or (float(sensor_features[4]) if sensor_features and len(sensor_features) > 4 else None),
                "vibration": parsed_sensors.get("vibration_rms") or (float(sensor_features[0]) if sensor_features and len(sensor_features) > 0 else None),
                "original_image": f"/storage/uploaded_images/{orig_filename}",
                "annotated_image": f"/storage/processed_images/{annot_filename}",
                "cropped_roi": f"/storage/processed_images/{crop_filename}" if crop_path else None,
                "latency_ms": latency_ms,
                "device": "CPU" if not settings.DEVICE.startswith("cuda") else "CUDA",
            }
            create_inspection_record(db, insp_data)

            # Store sensor telemetry in sensor_readings table if present
            if parsed_sensors:
                sensor_record_data = {
                    "reading_id": reading_id,
                    "inspection_id": inspection_id,
                    "tool_id": tool_id or ("TL-AUTO-DETECT" if is_detected else "UNIDENTIFIED"),
                    "machine_id": machine_id or "CNC-01",
                    "vibration_x": parsed_sensors.get("vibration_x"),
                    "vibration_y": parsed_sensors.get("vibration_y"),
                    "vibration_z": parsed_sensors.get("vibration_z"),
                    "vibration_rms": parsed_sensors.get("vibration_rms"),
                    "vibration_peak": parsed_sensors.get("vibration_peak"),
                    "temperature": parsed_sensors.get("temperature"),
                    "spindle_current": parsed_sensors.get("spindle_current"),
                    "spindle_power": parsed_sensors.get("spindle_power"),
                    "cutting_force": parsed_sensors.get("cutting_force"),
                    "acoustic_emission": parsed_sensors.get("acoustic_emission"),
                    "sound_level": parsed_sensors.get("sound_level"),
                    "rpm": parsed_sensors.get("rpm"),
                    "feed_rate": parsed_sensors.get("feed_rate"),
                    "depth_of_cut": parsed_sensors.get("depth_of_cut"),
                    "source": parsed_sensors.get("source", "MANUAL_ENTRY"),
                    "status": "VALID" if any(v is not None for v in parsed_sensors.values()) else "PARTIAL",
                }
                create_sensor_reading(db, sensor_record_data)

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
            "input_mode": input_mode,
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
            "sensor_results": {
                "available": bool(parsed_sensors),
                "data": parsed_sensors,
                "source": parsed_sensors.get("source", "NONE"),
            },
            "combined_insights": combined_insights,
            "faces": face_verify_res,
            "associations": associations,
            "tool_registry_match": registry_match_res,
            "annotated_image_base64": b64_annot_img,
            "images": {
                "original": f"/storage/uploaded_images/{orig_filename}",
                "annotated": f"/storage/processed_images/{annot_filename}",
                "annotated_base64": b64_annot_img,
                "cropped_roi": f"/storage/processed_images/{crop_filename}" if crop_path else None,
            },
            "performance": {
                "latency_ms": latency_ms,
                "device": "CPU" if not settings.DEVICE.startswith("cuda") else "CUDA",
                "stages_completed": stages_completed,
            },
        }

inspection_pipeline_service = InspectionPipelineService()

