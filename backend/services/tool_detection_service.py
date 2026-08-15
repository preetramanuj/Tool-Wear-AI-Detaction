import os
import time
import base64
import logging
from typing import Dict, List, Any, Union, Optional, Tuple
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
import torch
from ultralytics import YOLO

from backend.core.config import settings
from backend.utils.model_loader import load_yolo_model, find_model_weights, get_optimal_device

logger = logging.getLogger(__name__)


class ToolDetectionService:
    """
    High-performance inference and testing service for YOLO cutting tool detection models.
    Supports PyTorch (.pt) weights stored in the result/ directory.
    """

    def __init__(self, model_path: Optional[str] = None, device: str = "auto"):
        self.model_path = find_model_weights(model_path)
        self.device = get_optimal_device(device)
        self.model = load_yolo_model(self.model_path, self.device)
        self.classes = self.model.names if hasattr(self.model, "names") else settings.CLASSES

    def predict(
        self,
        image_input: Union[str, Path, np.ndarray, Image.Image, bytes],
        conf_threshold: float = settings.DEFAULT_CONFIDENCE_THRESHOLD,
        iou_threshold: float = settings.DEFAULT_IOU_THRESHOLD,
        imgsz: int = settings.IMAGE_SIZE,
    ) -> Dict[str, Any]:
        """
        Run cutting tool detection inference on an input image.

        Args:
            image_input: File path, OpenCV numpy array (BGR), PIL Image, or image bytes.
            conf_threshold: Confidence filtering threshold (0.0 to 1.0).
            iou_threshold: Non-Maximum Suppression (NMS) IOU threshold.
            imgsz: Input resolution for inference.

        Returns:
            Dictionary containing detected tools, bounding boxes, inference latency, and metadata.
        """
        img_np, original_shape = self._preprocess_input(image_input)
        orig_h, orig_w = original_shape[:2]

        start_time = time.perf_counter()

        # Run inference through Ultralytics YOLO
        results = self.model.predict(
            source=img_np,
            conf=conf_threshold,
            iou=iou_threshold,
            imgsz=imgsz,
            device=self.device,
            verbose=False,
        )

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        detections = []
        result = results[0]

        if result.boxes is not None and len(result.boxes) > 0:
            boxes = result.boxes
            for i in range(len(boxes)):
                xyxy = boxes.xyxy[i].cpu().numpy().tolist()
                conf = float(boxes.conf[i].cpu().item())
                cls_id = int(boxes.cls[i].cpu().item())
                cls_name = self.classes.get(cls_id, f"class_{cls_id}")

                x1, y1, x2, y2 = xyxy
                width = x2 - x1
                height = y2 - y1

                # Calculate normalized coordinates
                normalized_bbox = [
                    (x1 + width / 2.0) / orig_w,
                    (y1 + height / 2.0) / orig_h,
                    width / orig_w,
                    height / orig_h,
                ]

                detections.append(
                    {
                        "detection_id": i + 1,
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "confidence": round(conf, 4),
                        "confidence_percent": f"{conf * 100.0:.2f}%",
                        "bbox_xyxy": [round(c, 2) for c in xyxy],
                        "bbox_xywh": [round(x1, 2), round(y1, 2), round(width, 2), round(height, 2)],
                        "bbox_normalized": [round(c, 4) for c in normalized_bbox],
                        "area_pixels": round(width * height, 2),
                    }
                )

        return {
            "status": "success",
            "model_used": os.path.basename(self.model_path),
            "model_path": self.model_path,
            "device": self.device,
            "image_dimensions": {"width": orig_w, "height": orig_h, "channels": 3},
            "num_detections": len(detections),
            "tool_detected": len(detections) > 0,
            "detections": detections,
            "inference_latency_ms": round(latency_ms, 2),
            "fps": round(1000.0 / latency_ms, 1) if latency_ms > 0 else 0.0,
            "thresholds": {"confidence": conf_threshold, "iou": iou_threshold},
        }

    def crop_tool_roi(
        self,
        image_input: Union[str, Path, np.ndarray, Image.Image, bytes],
        bbox_xyxy: List[float],
        padding_ratio: float = 0.05,
    ) -> np.ndarray:
        """
        Extract the cropped Region of Interest (ROI) for downstream wear classification.
        """
        img_np, original_shape = self._preprocess_input(image_input)
        h, w = original_shape[:2]

        x1, y1, x2, y2 = bbox_xyxy
        bw = x2 - x1
        bh = y2 - y1

        # Apply padding
        pad_x = bw * padding_ratio
        pad_y = bh * padding_ratio

        crop_x1 = max(0, int(x1 - pad_x))
        crop_y1 = max(0, int(y1 - pad_y))
        crop_x2 = min(w, int(x2 + pad_x))
        crop_y2 = min(h, int(y2 + pad_y))

        cropped = img_np[crop_y1:crop_y2, crop_x1:crop_x2]
        return cropped

    def draw_detections(
        self,
        image_input: Union[str, Path, np.ndarray, Image.Image, bytes],
        detections_result: Dict[str, Any],
        show_hud: bool = True,
    ) -> np.ndarray:
        """
        Render visual bounding boxes, confidence badges, and performance HUD.
        """
        img_np, _ = self._preprocess_input(image_input)
        canvas = img_np.copy()
        h, w = canvas.shape[:2]

        detections = detections_result.get("detections", [])

        # Color palette: Vibrant Cyan-Green for cutting tool ROI
        box_color = (0, 230, 115)      # BGR: Bright emerald green
        text_color = (255, 255, 255)   # White
        badge_bg = (20, 140, 60)       # Dark green

        for det in detections:
            x1, y1, x2, y2 = [int(v) for v in det["bbox_xyxy"]]
            conf_str = det["confidence_percent"]
            label_text = f"{det['class_name'].upper()}: {conf_str}"

            # Draw outer glow and bounding box
            cv2.rectangle(canvas, (x1, y1), (x2, y2), box_color, 2, cv2.LINE_AA)

            # Draw corner accents for high-tech HUD look
            corner_len = min(20, (x2 - x1) // 4, (y2 - y1) // 4)
            corner_color = (0, 255, 255)  # Yellow accents
            thickness = 3
            # Top-left
            cv2.line(canvas, (x1, y1), (x1 + corner_len, y1), corner_color, thickness)
            cv2.line(canvas, (x1, y1), (x1, y1 + corner_len), corner_color, thickness)
            # Top-right
            cv2.line(canvas, (x2, y1), (x2 - corner_len, y1), corner_color, thickness)
            cv2.line(canvas, (x2, y1), (x2, y1 + corner_len), corner_color, thickness)
            # Bottom-left
            cv2.line(canvas, (x1, y2), (x1 + corner_len, y2), corner_color, thickness)
            cv2.line(canvas, (x1, y2), (x1, y2 - corner_len), corner_color, thickness)
            # Bottom-right
            cv2.line(canvas, (x2, y2), (x2 - corner_len, y2), corner_color, thickness)
            cv2.line(canvas, (x2, y2), (x2, y2 - corner_len), corner_color, thickness)

            # Label badge
            font = cv2.FONT_HERSHEY_SIMPLEX
            scale = 0.55
            (tw, th), _ = cv2.getTextSize(label_text, font, scale, 1)
            badge_y1 = max(0, y1 - th - 10)
            badge_y2 = y1
            badge_x2 = min(w, x1 + tw + 12)

            cv2.rectangle(canvas, (x1, badge_y1), (badge_x2, badge_y2), badge_bg, -1)
            cv2.rectangle(canvas, (x1, badge_y1), (badge_x2, badge_y2), box_color, 1)
            cv2.putText(canvas, label_text, (x1 + 6, badge_y2 - 5), font, scale, text_color, 1, cv2.LINE_AA)

        if show_hud:
            # Top HUD banner
            hud_text = f"ToolGuard AI | Model: {detections_result.get('model_used')} | Latency: {detections_result.get('inference_latency_ms')} ms ({detections_result.get('fps')} FPS)"
            cv2.rectangle(canvas, (0, 0), (w, 28), (15, 15, 15), -1)
            cv2.putText(canvas, hud_text, (10, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 255), 1, cv2.LINE_AA)

        return canvas

    def encode_image_to_base64(self, image_np: np.ndarray, format: str = ".jpg") -> str:
        """
        Encode an OpenCV image to base64 JPEG/PNG string.
        """
        _, buffer = cv2.imencode(format, image_np)
        return base64.b64encode(buffer).decode("utf-8")

    def get_model_metadata(self) -> Dict[str, Any]:
        """
        Return technical metadata and state of the loaded model.
        """
        weights_size_mb = (
            os.path.getsize(self.model_path) / (1024 * 1024)
            if os.path.exists(self.model_path)
            else 0.0
        )
        return {
            "model_name": "YOLO11n Cutting Tool Detector",
            "weights_path": self.model_path,
            "weights_filename": os.path.basename(self.model_path),
            "file_size_mb": round(weights_size_mb, 2),
            "device": self.device,
            "classes": self.classes,
            "task": "detect",
            "is_cuda": "cuda" in str(self.device),
        }

    def _preprocess_input(
        self, image_input: Union[str, Path, np.ndarray, Image.Image, bytes]
    ) -> Tuple[np.ndarray, Tuple[int, int, int]]:
        """
        Convert diverse image input types into standard OpenCV BGR numpy array.
        """
        if isinstance(image_input, (str, Path)):
            path_str = str(image_input)
            if not os.path.exists(path_str):
                raise FileNotFoundError(f"Image path not found: {path_str}")
            img_bgr = cv2.imread(path_str)
            if img_bgr is None:
                raise ValueError(f"Failed to decode image from path: {path_str}")
        elif isinstance(image_input, bytes):
            nparr = np.frombuffer(image_input, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_bgr is None:
                raise ValueError("Failed to decode image from byte buffer.")
        elif isinstance(image_input, Image.Image):
            rgb_arr = np.array(image_input)
            img_bgr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, np.ndarray):
            img_bgr = image_input
        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

        return img_bgr, img_bgr.shape
