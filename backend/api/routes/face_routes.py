import base64
import cv2
import numpy as np
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel

from backend.services.face_detection_service import face_detection_service

router = APIRouter(prefix="/face", tags=["Model 4: Operator Face Detection & Auth"])

class Base64FaceRequest(BaseModel):
    image_base64: str

@router.get("/model-info")
async def get_face_model_info():
    """Retrieve technical status of Model 4 Face Engine"""
    return {
        "engine": "YOLO + Multi-Scale Face Detection Engine",
        "loaded": face_detection_service.is_loaded(),
        "registered_operators": len(face_detection_service.get_registered_operators())
    }

@router.post("/detect")
async def detect_faces(file: UploadFile = File(...)):
    """
    Detect faces in uploaded operator image and return bounding boxes + confidence.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not decode image")
        return face_detection_service.detect_faces(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face detection error: {str(e)}")

@router.post("/detect-base64")
async def detect_faces_base64(payload: Base64FaceRequest):
    """Detect faces from base64 image string."""
    try:
        raw_b64 = payload.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        raw_bytes = base64.b64decode(raw_b64)
        nparr = np.frombuffer(raw_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not decode base64 image")
        return face_detection_service.detect_faces(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Base64 face detection error: {str(e)}")

@router.post("/register")
async def register_operator_face(
    operator_name: str = Form(...),
    operator_id: Optional[str] = Form(None),
    image: UploadFile = File(...)
):
    """Register operator face in local private database."""
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image uploaded")
        res = face_detection_service.register_operator(operator_name, img, operator_id)
        if not res.get("success"):
            raise HTTPException(status_code=400, detail=res.get("error", "Registration failed"))
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Operator registration failed: {str(e)}")

@router.post("/verify")
async def verify_operator_face(file: UploadFile = File(...)):
    """1:N Face verification against registered templates."""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Could not decode image")
        return face_detection_service.verify_operator(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face verification error: {str(e)}")

@router.get("/operators")
async def get_operators_list():
    """List registered operators in database."""
    try:
        ops = face_detection_service.get_registered_operators()
        return {"success": True, "count": len(ops), "operators": ops}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
