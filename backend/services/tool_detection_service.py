import os
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from ultralytics import YOLO
from backend.core.config import settings

class ToolDetectionService:
    """
    Model 1: Cutting Tool Detection Service
    Executes YOLO11n cutting tool detection, extracts bounding boxes,
    crops tool ROI for downstream wear/health analysis, and renders visual HUD overlays.
    """
    
    def __init__(self):
        self.model: Optional[YOLO] = None
        self.model_path: Optional[str] = None
        self.class_names: Dict[int, str] = {0: "cutting_tool"}
        self.device: str = "cpu"
        self._load_model()

    def _load_model(self):
        for candidate_path in settings.TOOL_DETECTION_MODEL_PATHS:
            if candidate_path and os.path.exists(candidate_path):
                try:
                    self.model = YOLO(candidate_path)
                    self.model_path = candidate_path
                    if hasattr(self.model, "names") and isinstance(self.model.names, dict):
                        self.class_names = self.model.names
                    print(f"✓ Model 1 (Tool Detection) loaded successfully from: {candidate_path}")
                    print(f"  Available Classes: {self.class_names}")
                    return
                except Exception as e:
                    print(f"⚠ Failed loading YOLO model from {candidate_path}: {e}")

        # Fallback to general best.pt if needed
        fallback = os.path.join(settings.BASE_DIR, "result", "best.pt")
        if os.path.exists(fallback):
            try:
                self.model = YOLO(fallback)
                self.model_path = fallback
                if hasattr(self.model, "names") and isinstance(self.model.names, dict):
                    self.class_names = self.model.names
                print(f"✓ Model 1 (Tool Detection) fallback loaded from: {fallback}")
                return
            except Exception as e:
                print(f"⚠ Fallback load failed: {e}")

        print("⚠ Model 1 weights not found in standard paths.")

    def is_loaded(self) -> bool:
        return self.model is not None

    def detect(
        self,
        image: np.ndarray,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45,
    ) -> Dict[str, Any]:
        """
        Runs YOLO11n inference on an input image (BGR numpy array).
        Returns bounding boxes, detection confidence, true class name, and tool ROI crop.
        """
        if not self.is_loaded():
            return {
                "detected": False,
                "class": "None",
                "confidence": 0.0,
                "bbox": [0, 0, 0, 0],
                "detections": [],
                "error": "Tool Detection Model weights are not loaded.",
            }

        orig_h, orig_w = image.shape[:2]
        
        try:
            # Run YOLO prediction
            results = self.model.predict(
                source=image,
                conf=conf_threshold,
                iou=iou_threshold,
                imgsz=settings.IMAGE_SIZE,
                verbose=False,
            )
            
            detections: List[Dict[str, Any]] = []
            
            if results and len(results) > 0 and len(results[0].boxes) > 0:
                boxes = results[0].boxes
                for box in boxes:
                    xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                    conf = float(box.conf[0].cpu().numpy())
                    cls_id = int(box.cls[0].cpu().numpy())
                    cls_name = self.class_names.get(cls_id, "cutting_tool")
                    
                    x1, y1, x2, y2 = xyxy
                    x1 = max(0, min(orig_w - 1, x1))
                    y1 = max(0, min(orig_h - 1, y1))
                    x2 = max(x1 + 1, min(orig_w, x2))
                    y2 = max(y1 + 1, min(orig_h, y2))
                    
                    detections.append({
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "confidence": round(conf, 4),
                        "confidence_percent": f"{conf * 100:.1f}%",
                        "bbox": [x1, y1, x2, y2],
                        "bbox_normalized": [
                            round(x1 / orig_w, 4),
                            round(y1 / orig_h, 4),
                            round(x2 / orig_w, 4),
                            round(y2 / orig_h, 4),
                        ],
                        "area_pixels": (x2 - x1) * (y2 - y1),
                    })
                
                # Sort detections by confidence descending
                detections.sort(key=lambda d: d["confidence"], reverse=True)
                primary = detections[0]
                
                # Extract Tool ROI Crop
                px1, py1, px2, py2 = primary["bbox"]
                tool_roi = image[py1:py2, px1:px2].copy()
                
                return {
                    "detected": True,
                    "class": primary["class_name"],
                    "confidence": primary["confidence"],
                    "confidence_percent": primary["confidence_percent"],
                    "bbox": primary["bbox"],
                    "bbox_normalized": primary["bbox_normalized"],
                    "area_pixels": primary["area_pixels"],
                    "num_tools_found": len(detections),
                    "detections": detections,
                    "cropped_roi_bgr": tool_roi,
                }
            else:
                return {
                    "detected": False,
                    "class": "None",
                    "confidence": 0.0,
                    "bbox": [0, 0, 0, 0],
                    "num_tools_found": 0,
                    "detections": [],
                    "message": "No cutting tool detected at current confidence threshold.",
                }
        except Exception as e:
            return {
                "detected": False,
                "class": "None",
                "confidence": 0.0,
                "bbox": [0, 0, 0, 0],
                "detections": [],
                "error": f"YOLO Tool Detection inference failed: {str(e)}",
            }

    def render_hud_overlay(
        self,
        image: np.ndarray,
        detection_result: Dict[str, Any],
        wear_vb_mm: Optional[float] = None,
        health_status: Optional[str] = None,
    ) -> np.ndarray:
        """
        Draws high-tech industrial HUD visual overlay with bounding boxes,
        detection confidence, wear measurement, and health condition badge.
        """
        annotated = image.copy()
        
        if not detection_result.get("detected", False):
            cv2.putText(
                annotated,
                "STATUS: NO TOOL DETECTED",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2,
                cv2.LINE_AA,
            )
            return annotated

        for det in detection_result.get("detections", []):
            x1, y1, x2, y2 = det["bbox"]
            conf_str = det.get("confidence_percent", "")
            cls_name = det.get("class_name", "cutting_tool")
            
            # Draw industrial bounding box (Cyan #06B6D4)
            box_color = (212, 182, 6) # BGR for cyan
            cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, 2)
            
            # Draw corner reticles
            line_len = min(20, (x2 - x1) // 4, (y2 - y1) // 4)
            cv2.line(annotated, (x1, y1), (x1 + line_len, y1), (0, 255, 255), 3)
            cv2.line(annotated, (x1, y1), (x1, y1 + line_len), (0, 255, 255), 3)
            cv2.line(annotated, (x2, y1), (x2 - line_len, y1), (0, 255, 255), 3)
            cv2.line(annotated, (x2, y1), (x2, y1 + line_len), (0, 255, 255), 3)
            cv2.line(annotated, (x1, y2), (x1 + line_len, y2), (0, 255, 255), 3)
            cv2.line(annotated, (x1, y2), (x1, y2 - line_len), (0, 255, 255), 3)
            cv2.line(annotated, (x2, y2), (x2 - line_len, y2), (0, 255, 255), 3)
            cv2.line(annotated, (x2, y2), (x2, y2 - line_len), (0, 255, 255), 3)
            
            # Label tag
            label = f"{cls_name.upper()} [{conf_str}]"
            cv2.rectangle(annotated, (x1, max(0, y1 - 24)), (x1 + len(label) * 9, y1), (20, 20, 20), -1)
            cv2.putText(
                annotated,
                label,
                (x1 + 4, max(14, y1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 255, 255),
                1,
                cv2.LINE_AA,
            )

        # Draw Global HUD Telemetry Header
        cv2.rectangle(annotated, (10, 10), (320, 65), (15, 20, 30), -1)
        cv2.rectangle(annotated, (10, 10), (320, 65), (212, 182, 6), 1)
        
        cv2.putText(
            annotated,
            f"TOOLGUARD-AI VISION HUD",
            (20, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 255, 255),
            1,
            cv2.LINE_AA,
        )
        
        telemetry_txt = f"WEAR VB: {wear_vb_mm:.3f}mm" if wear_vb_mm is not None else "WEAR: ASSESSING..."
        if health_status:
            telemetry_txt += f" | {health_status}"
            
        cv2.putText(
            annotated,
            telemetry_txt,
            (20, 52),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

        return annotated

tool_detection_service = ToolDetectionService()
