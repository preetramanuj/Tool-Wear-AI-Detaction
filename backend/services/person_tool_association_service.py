import os
import cv2
import math
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from ultralytics import YOLO
from backend.core.config import settings
from backend.services.tool_detection_service import tool_detection_service
from backend.services.face_detection_service import face_detection_service

class PersonToolAssociationService:
    """
    Person + Tool Spatial Association Engine.
    Detects person, tool, evaluates geometric/proximity relationships (HOLDING, NEAR, NOT_ASSOCIATED),
    binds operator identity from face recognition, and evaluates industrial PPE presence.
    """

    def __init__(self):
        self.person_detector: Optional[YOLO] = None
        self._load_person_detector()

    def _load_person_detector(self):
        # Load standard COCO YOLO model for person/object detection
        for p in settings.PERSON_DETECTION_MODEL_PATHS:
            if os.path.exists(p):
                try:
                    self.person_detector = YOLO(p)
                    print(f"✓ Person Detection YOLO loaded from: {p}")
                    return
                except Exception as e:
                    print(f"⚠ Person detector load failed from {p}: {e}")

        try:
            # Attempt default yolo11n
            self.person_detector = YOLO("yolo11n.pt")
            print("✓ Person Detection loaded standard yolo11n.pt")
        except Exception as e:
            print(f"⚠ Could not initialize YOLO person detector: {e}")

    def detect_persons(self, image: np.ndarray, conf_thresh: float = 0.35) -> List[Dict[str, Any]]:
        """Detects all persons in the input image."""
        if self.person_detector is None or image is None or image.size == 0:
            return []

        h, w = image.shape[:2]
        try:
            results = self.person_detector.predict(
                source=image,
                conf=conf_thresh,
                classes=[0],  # Class 0 in COCO is 'person'
                verbose=False,
            )
            persons = []
            if results and len(results) > 0 and len(results[0].boxes) > 0:
                for box in results[0].boxes:
                    xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                    conf = float(box.conf[0].cpu().numpy())
                    x1, y1, x2, y2 = xyxy
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(w, x2), min(h, y2)
                    persons.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": round(conf, 3),
                        "width": x2 - x1,
                        "height": y2 - y1,
                        "center": [(x1 + x2) / 2.0, (y1 + y2) / 2.0],
                    })
            return persons
        except Exception as e:
            print(f"Person detection error: {e}")
            return []

    def evaluate_association(
        self,
        image: np.ndarray,
        tool_detections: List[Dict[str, Any]],
        person_detections: List[Dict[str, Any]],
        identified_operator: Optional[str] = None,
        tool_id: str = "T-014",
    ) -> List[Dict[str, Any]]:
        """
        Evaluates visual spatial relationships between detected persons and tools.
        Relationships: HOLDING, NEAR, NOT_ASSOCIATED.
        """
        associations = []

        if not person_detections and not tool_detections:
            return []

        if not person_detections:
            for t in tool_detections:
                associations.append({
                    "person": "Not associated",
                    "operator_id": "NONE",
                    "tool_id": tool_id,
                    "relationship": "NOT_ASSOCIATED",
                    "confidence": 0.0,
                    "evidence": "No person detected in frame",
                })
            return associations

        if not tool_detections:
            for p in person_detections:
                person_name = identified_operator if identified_operator and identified_operator != "No Face Detected" else "Operator"
                associations.append({
                    "person": person_name,
                    "operator_id": "UNKNOWN",
                    "tool_id": "None",
                    "relationship": "NOT_ASSOCIATED",
                    "confidence": 0.0,
                    "evidence": "No cutting tool detected in workspace",
                })
            return associations

        # Perform Pairwise Geometric Analysis
        for p in person_detections:
            px1, py1, px2, py2 = p["bbox"]
            pw, ph = p["width"], p["height"]
            
            # Hand zone: bottom 60% of person box
            hand_y_min = py1 + 0.40 * ph
            hand_y_max = py2 + 0.15 * ph
            hand_x_min = px1 - 0.20 * pw
            hand_x_max = px2 + 0.20 * pw

            person_name = identified_operator if identified_operator and "Unknown" not in identified_operator and "No Face" not in identified_operator else "Operator"

            best_rel = "NOT_ASSOCIATED"
            best_conf = 0.0
            matched_tool = None

            for t in tool_detections:
                tx1, ty1, tx2, ty2 = t["bbox"]
                tcx, tcy = (tx1 + tx2) / 2.0, (ty1 + ty2) / 2.0
                
                # Distance between tool center and person center normalized by person height
                pcx, pcy = p["center"]
                dist = math.sqrt((tcx - pcx) ** 2 + (tcy - pcy) ** 2) / max(1.0, ph)

                # Check if tool is within hand/lower body zone
                is_in_hand_zone = (hand_x_min <= tcx <= hand_x_max) and (hand_y_min <= tcy <= hand_y_max)
                
                # Check bounding box overlap
                overlap_x = max(0, min(px2, tx2) - max(px1, tx1))
                overlap_y = max(0, min(py2, ty2) - max(py1, ty1))
                has_bbox_overlap = (overlap_x * overlap_y) > 0

                if is_in_hand_zone or (has_bbox_overlap and dist < settings.ASSOCIATION_HOLDING_DISTANCE_RATIO):
                    best_rel = "HOLDING"
                    best_conf = min(0.96, max(0.75, 0.90 - dist * 0.3))
                    matched_tool = t
                    break
                elif dist < settings.ASSOCIATION_NEAR_DISTANCE_RATIO:
                    best_rel = "NEAR"
                    best_conf = min(0.85, max(0.60, 0.80 - dist * 0.2))
                    matched_tool = t

            associations.append({
                "person": person_name,
                "operator_id": "OP-001" if person_name != "Operator" and person_name != "Not associated" else "UNKNOWN",
                "tool_id": tool_id if matched_tool else "Not associated",
                "relationship": best_rel,
                "confidence": round(best_conf, 2),
                "person_bbox": p["bbox"],
                "tool_bbox": matched_tool["bbox"] if matched_tool else None,
                "evidence": f"Spatial proximity: {best_rel} based on bounding box geometry",
            })

        return associations

    def get_ppe_status(self) -> Dict[str, Any]:
        """
        Controlled industrial PPE status report.
        Reports status accurately without fabricating labels when a model is not installed.
        """
        return {
            "ppe_inspection_enabled": True,
            "items": [
                {"name": "Safety Helmet", "status": "MODEL_UNAVAILABLE", "detected": None, "note": "Dedicated PPE checkpoint required"},
                {"name": "Safety Glasses", "status": "MODEL_UNAVAILABLE", "detected": None, "note": "Dedicated PPE checkpoint required"},
                {"name": "Industrial Gloves", "status": "MODEL_UNAVAILABLE", "detected": None, "note": "Dedicated PPE checkpoint required"},
                {"name": "High-Vis Vest", "status": "MODEL_UNAVAILABLE", "detected": None, "note": "Dedicated PPE checkpoint required"},
            ],
            "compliance_status": "MONITORING",
        }

    def process_full_frame(
        self,
        image: np.ndarray,
        tool_id: str = "T-014",
    ) -> Dict[str, Any]:
        """
        Comprehensive unified frame analyzer for Live Webcam & Person View:
        Tool Detection + Person Detection + Face Verification + Person-Tool Association.
        """
        # 1. Detect Tool
        tool_res = tool_detection_service.detect(image, conf_threshold=0.25)
        tool_dets = tool_res.get("detections", [])

        # 2. Detect Persons
        persons = self.detect_persons(image, conf_thresh=0.30)

        # 3. Detect & Verify Faces
        face_res = face_detection_service.verify_operator(image)
        identified_person = face_res.get("identity")

        # 4. Association
        associations = self.evaluate_association(
            image=image,
            tool_detections=tool_dets,
            person_detections=persons,
            identified_operator=identified_person,
            tool_id=tool_id,
        )

        # 5. PPE Status
        ppe_status = self.get_ppe_status()

        return {
            "success": True,
            "tool_detected": tool_res.get("detected", False),
            "tool_detections": tool_dets,
            "persons_detected": len(persons),
            "persons": persons,
            "faces_detected": face_res.get("detected", False),
            "operator_identity": identified_person,
            "operator_confidence": face_res.get("confidence", 0.0),
            "associations": associations,
            "ppe": ppe_status,
        }

person_tool_association_service = PersonToolAssociationService()
