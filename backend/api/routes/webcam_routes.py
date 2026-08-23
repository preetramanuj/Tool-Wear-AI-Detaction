import time
import cv2
import base64
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from backend.services.tool_detection_service import tool_detection_service
from backend.services.face_detection_service import face_detection_service
from backend.services.person_tool_association_service import person_tool_association_service
from backend.services.wear_analysis_service import wear_analysis_service
from backend.services.health_prediction_service import health_prediction_service

router = APIRouter(prefix="/webcam", tags=["Live Webcam"])

@router.post("/frame")
async def analyze_webcam_frame(
    file: Optional[UploadFile] = File(None),
    base64_image: Optional[str] = Form(None),
    tool_id: Optional[str] = Form("TL-CNMG-120408"),
    run_deep_wear: Optional[bool] = Form(True),
):
    """
    High-efficiency real-time live webcam frame analysis endpoint.
    Processes live browser video stream frames and returns Person, Tool, Face,
    and Person-Tool association telemetry.
    """
    start_time = time.time()
    
    if file:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif base64_image:
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]
        decoded = base64.b64decode(base64_image)
        nparr = np.frombuffer(decoded, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    else:
        raise HTTPException(status_code=400, detail="Must provide either multipart 'file' or 'base64_image'")

    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image frame")

    # 1. Tool Detection
    tool_res = tool_detection_service.detect(image, conf_threshold=0.25)
    tool_dets = tool_res.get("detections", [])

    # 2. Person Detection
    persons = person_tool_association_service.detect_persons(image, conf_thresh=0.30)

    # 3. Face Detection & Operator Verification
    face_det_res = face_detection_service.detect_faces(image)
    face_res = face_detection_service.verify_operator(image)
    operator_name = face_res.get("identity")
    is_face_detected = face_det_res.get("faces_detected", 0) > 0 or face_res.get("detected", False)

    is_tool_detected = tool_res.get("detected", False)
    if is_face_detected and (not is_tool_detected or tool_res.get("confidence", 0.0) < 0.70):
        is_tool_detected = False

    # 4. Person-Tool Spatial Association
    associations = person_tool_association_service.evaluate_association(
        image=image,
        tool_detections=tool_dets if is_tool_detected else [],
        person_detections=persons,
        identified_operator=operator_name,
        tool_id=tool_id or "TL-CNMG-120408",
    )

    # 5. Fast Wear & Health Assessment on Tool ROI
    wear_data = {"status": "Wear estimation unavailable", "wear_value": 0.0, "wear_unit": "mm", "wear_area": 0.0}
    health_data = {
        "status": "FACE_DETECTED" if is_face_detected and not is_tool_detected else "Health assessment unavailable",
        "wear_um": 0.0,
        "health_score": 0.0,
        "health_status": "FACE_DETECTED" if is_face_detected and not is_tool_detected else "UNKNOWN",
        "recommended_action": "Operator face detected in camera view. Point camera at cutting tool insert to perform inspection." if is_face_detected and not is_tool_detected else "Tool out of focus"
    }

    if is_tool_detected and run_deep_wear and tool_res.get("cropped_roi_bgr") is not None:
        crop_roi = tool_res["cropped_roi_bgr"]
        try:
            wear_data = wear_analysis_service.predict(crop_roi)
            health_data = health_prediction_service.predict(crop_roi)
        except Exception as e:
            print(f"Webcam wear prediction error: {e}")

    # PPE status
    ppe_data = person_tool_association_service.get_ppe_status()

    latency_ms = round((time.time() - start_time) * 1000.0, 1)

    return {
        "success": True,
        "tool_detected": is_tool_detected,
        "tool": {
            "name": "Cutting Tool",
            "type": "Carbide Insert" if is_tool_detected else "Tool type unavailable",
            "confidence": tool_res.get("confidence", 0.0) if is_tool_detected else 0.0,
            "bbox": tool_res.get("bbox", [0, 0, 0, 0]) if is_tool_detected else [0, 0, 0, 0],
            "detections": tool_dets if is_tool_detected else [],
            "message": "Operator face detected in camera view. Tool not detected." if is_face_detected and not is_tool_detected else tool_res.get("message", ""),
        },
        "persons": persons,
        "faces": face_det_res.get("faces", []),
        "face_detected": is_face_detected,
        "operator": {
            "detected": is_face_detected,
            "matched": face_res.get("match_found", False),
            "identity": operator_name,
            "confidence": face_res.get("confidence", 0.0),
        },
        "associations": associations,
        "wear": wear_data,
        "health": health_data,
        "ppe": ppe_data,
        "latency_ms": latency_ms,
        "fps_estimate": round(1000.0 / max(1.0, latency_ms), 1),
    }
