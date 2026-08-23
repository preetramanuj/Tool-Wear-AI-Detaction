import os
import io
import time
import base64
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
from ultralytics import YOLO
from backend.core.config import settings

class ToolDetectionService:
    """
    Model 1: Cutting Tool Detection Service
    Executes YOLO11n cutting tool detection, extracts bounding boxes,
    crops tool ROI for downstream wear/health analysis, and renders visual HUD overlays.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model: Optional[YOLO] = None
        self.model_path: Optional[str] = None
        self.class_names: Dict[int, str] = {0: "cutting_tool"}
        self.device: str = "cpu"
        self._load_model(preferred_path=model_path)

    def _load_model(self, preferred_path: Optional[str] = None):
        candidates = []
        if preferred_path:
            candidates.append(preferred_path)
        candidates.extend(settings.TOOL_DETECTION_MODEL_PATHS)

        for candidate_path in candidates:
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

    def get_model_metadata(self) -> Dict[str, Any]:
        """Returns technical metadata about the model."""
        return {
            "model_name": "YOLO11n-ToolDetection",
            "task": "detect",
            "classes": self.class_names,
            "device": self.device,
            "weights_path": self.model_path,
            "input_size": [settings.IMAGE_SIZE, settings.IMAGE_SIZE],
        }

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

        # Reject completely black, blank, or zero-contrast frames
        if float(np.std(image)) < 6.0 or float(np.mean(image)) < 4.0:
            return {
                "detected": False,
                "class": "None",
                "confidence": 0.0,
                "bbox": [0, 0, 0, 0],
                "num_tools_found": 0,
                "tool_eligibility": "NO_TOOL",
                "is_supported": False,
                "detections": [],
                "message": "Blank or low-contrast frame. No cutting tool present.",
            }
        
        try:
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
                
                detections.sort(key=lambda d: d["confidence"], reverse=True)
                primary = detections[0]
                
                px1, py1, px2, py2 = primary["bbox"]
                tool_roi = image[py1:py2, px1:px2].copy()
                
                is_supported = primary["class_name"] in ["cutting_tool"] and primary["confidence"] >= conf_threshold
                eligibility_status = "ELIGIBLE" if is_supported else "UNSUPPORTED"
                
                return {
                    "detected": True,
                    "class": primary["class_name"],
                    "confidence": primary["confidence"],
                    "confidence_percent": primary["confidence_percent"],
                    "bbox": primary["bbox"],
                    "bbox_normalized": primary["bbox_normalized"],
                    "area_pixels": primary["area_pixels"],
                    "num_tools_found": len(detections),
                    "tool_eligibility": eligibility_status,
                    "is_supported": is_supported,
                    "detections": detections,
                    "cropped_roi_bgr": tool_roi if is_supported else None,
                    "message": "Supported cutting tool detected." if is_supported else "Unsupported tool for current wear-analysis model."
                }
            else:
                return {
                    "detected": False,
                    "class": "None",
                    "confidence": 0.0,
                    "bbox": [0, 0, 0, 0],
                    "num_tools_found": 0,
                    "tool_eligibility": "NO_TOOL",
                    "is_supported": False,
                    "detections": [],
                    "message": "No supported cutting tool detected in image.",
                }
        except Exception as e:
            return {
                "detected": False,
                "class": "None",
                "confidence": 0.0,
                "bbox": [0, 0, 0, 0],
                "tool_eligibility": "ERROR",
                "is_supported": False,
                "detections": [],
                "error": f"YOLO Tool Detection inference failed: {str(e)}",
            }

    def predict(
        self,
        image_input: Union[np.ndarray, bytes, str],
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        include_annotated_image: bool = False,
        include_cropped_roi: bool = False,
    ) -> Dict[str, Any]:
        """
        Unified predict interface matching test_tool_detection_api / test_tool_detection_model.
        """
        start_t = time.perf_counter()
        
        # Parse image_input
        if isinstance(image_input, bytes):
            nparr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif isinstance(image_input, str):
            img = cv2.imread(image_input)
        else:
            img = image_input

        if img is None:
            return {"status": "error", "message": "Failed to decode input image"}

        h, w = img.shape[:2]
        det_res = self.detect(img, conf_threshold=conf_threshold, iou_threshold=iou_threshold)
        latency_ms = round((time.perf_counter() - start_t) * 1000, 2)
        fps = round(1000.0 / max(latency_ms, 0.001), 1)

        detections = []
        for i, d in enumerate(det_res.get("detections", [])):
            detections.append({
                "detection_id": i + 1,
                "class_id": d["class_id"],
                "class_name": d["class_name"],
                "confidence": d["confidence"],
                "confidence_percent": d["confidence_percent"],
                "bbox_xyxy": d["bbox"],
                "bbox_normalized": d["bbox_normalized"],
                "area_pixels": d["area_pixels"],
            })

        resp: Dict[str, Any] = {
            "status": "success",
            "model_used": os.path.basename(self.model_path or "best.pt"),
            "inference_latency_ms": latency_ms,
            "fps": fps,
            "tool_detected": det_res.get("detected", False),
            "num_detections": len(detections),
            "detections": detections,
            "image_dimensions": {"width": w, "height": h},
        }

        if include_annotated_image:
            annotated = self.render_hud_overlay(img, det_res)
            _, buf = cv2.imencode(".jpg", annotated)
            resp["annotated_image_base64"] = base64.b64encode(buf).decode("utf-8")

        if include_cropped_roi and det_res.get("cropped_roi_bgr") is not None:
            _, buf = cv2.imencode(".jpg", det_res["cropped_roi_bgr"])
            resp["cropped_roi_base64"] = base64.b64encode(buf).decode("utf-8")

        return resp

    def encode_image_to_base64(self, image: np.ndarray) -> str:
        """Encodes OpenCV BGR image numpy array to base64 jpeg string."""
        if image is None:
            return ""
        success, buf = cv2.imencode(".jpg", image)
        if not success:
            return ""
        return base64.b64encode(buf).decode("utf-8")

    def crop_tool_roi(
        self,
        image: Union[np.ndarray, bytes],
        bbox: List[float],
        padding_ratio: float = 0.0,
    ) -> np.ndarray:
        """Crops ROI from image with optional margin padding."""
        if isinstance(image, bytes):
            nparr = np.frombuffer(image, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            img = image

        if img is None:
            return np.zeros((10, 10, 3), dtype=np.uint8)

        h, w = img.shape[:2]
        x1, y1, x2, y2 = [int(b) for b in bbox]
        if padding_ratio > 0.0:
            bw = x2 - x1
            bh = y2 - y1
            x1 = max(0, int(x1 - bw * padding_ratio))
            y1 = max(0, int(y1 - bh * padding_ratio))
            x2 = min(w, int(x2 + bw * padding_ratio))
            y2 = min(h, int(y2 + bh * padding_ratio))
        return img[y1:y2, x1:x2].copy()

    def draw_detections(
        self,
        image: Union[np.ndarray, bytes],
        detection_result: Dict[str, Any],
        show_hud: bool = True,
    ) -> np.ndarray:
        """Draws detections onto image."""
        if isinstance(image, bytes):
            nparr = np.frombuffer(image, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            img = image

        if img is None:
            return np.zeros((10, 10, 3), dtype=np.uint8)

        det_data = {
            "detected": detection_result.get("tool_detected", len(detection_result.get("detections", [])) > 0),
            "detections": [
                {
                    "class_name": d["class_name"],
                    "confidence": float(d.get("confidence", 0.99)),
                    "confidence_percent": d.get("confidence_percent", "99.0%"),
                    "bbox": d.get("bbox_xyxy", d.get("bbox", [0, 0, 0, 0])),
                }
                for d in detection_result.get("detections", [])
            ]
        }
        return self.render_hud_overlay(img, det_data)

    def diagnostics(self, warmup_runs: int = 2, benchmark_runs: int = 5) -> Dict[str, Any]:
        """Runs diagnostics benchmark."""
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        for _ in range(warmup_runs):
            self.detect(dummy)
        
        times = []
        for _ in range(benchmark_runs):
            t0 = time.perf_counter()
            self.detect(dummy)
            times.append((time.perf_counter() - t0) * 1000)
            
        return {
            "status": "healthy" if self.is_loaded() else "degraded",
            "model_loaded": self.is_loaded(),
            "avg_latency_ms": round(float(np.mean(times)), 2),
            "p95_latency_ms": round(float(np.percentile(times, 95)), 2),
            "fps": round(1000.0 / max(float(np.mean(times)), 0.001), 1),
            "device": self.device,
        }

    def check_tool_eligibility(self, detection_result: Dict[str, Any]) -> Tuple[bool, str]:
        if not detection_result.get("detected", False):
            return False, "No cutting tool detected in image."
        if not detection_result.get("is_supported", False):
            return False, "Detected object is outside the trained CNC cutting insert domain."
        return True, "Tool is eligible for wear and health analysis."

    def render_hud_overlay(
        self,
        image: np.ndarray,
        detection_result: Dict[str, Any],
        wear_vb_mm: Optional[float] = None,
        health_status: Optional[str] = None,
        face_detections: Optional[List[Dict[str, Any]]] = None,
    ) -> np.ndarray:
        annotated = image.copy()
        h, w = annotated.shape[:2]

        tool_detected = detection_result.get("detected", len(detection_result.get("detections", [])) > 0)
        detections = detection_result.get("detections", [])

        # If faces are present and no tool is detected, render face bounding boxes and notice banner
        if not tool_detected and face_detections:
            for face in face_detections:
                bbox = face.get("bbox_xyxy", [0, 0, 0, 0])
                if isinstance(face.get("bbox"), dict):
                    fb = face["bbox"]
                    x1, y1, x2, y2 = fb["x"], fb["y"], fb["x"] + fb["w"], fb["y"] + fb["h"]
                else:
                    x1, y1, x2, y2 = bbox
                
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 165, 255), 2)
                lbl = "OPERATOR FACE DETECTED"
                cv2.rectangle(annotated, (x1, max(0, y1 - 24)), (x1 + len(lbl) * 9, y1), (20, 20, 20), -1)
                cv2.putText(annotated, lbl, (x1 + 4, max(14, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 165, 255), 1, cv2.LINE_AA)

            banner_w = min(460, w - 20)
            cv2.rectangle(annotated, (10, 10), (10 + banner_w, 70), (20, 20, 35), -1)
            cv2.rectangle(annotated, (10, 10), (10 + banner_w, 70), (0, 140, 255), 2)
            cv2.putText(annotated, "TOOLGUARD-AI: NO TOOL DETECTED", (20, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 140, 255), 1, cv2.LINE_AA)
            cv2.putText(annotated, "OPERATOR FACE IN VIEW - AIM AT INSERT FLANK", (20, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)
            return annotated

        for det in detections:
            bbox = det.get("bbox", det.get("bbox_xyxy", [0, 0, 0, 0]))
            x1, y1, x2, y2 = bbox
            conf_str = det.get("confidence_percent", f"{det.get('confidence', 0.0)*100:.1f}%")
            cls_name = det.get("class_name", "cutting_tool")

            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
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

        cv2.rectangle(annotated, (10, 10), (320, 65), (15, 20, 30), -1)
        cv2.rectangle(annotated, (10, 10), (320, 65), (212, 182, 6), 1)
        
        cv2.putText(
            annotated,
            "TOOLGUARD-AI VISION HUD",
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
