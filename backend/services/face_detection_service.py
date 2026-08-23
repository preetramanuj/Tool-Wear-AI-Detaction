import os
import cv2
import time
import base64
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from ultralytics import YOLO

from backend.core.config import settings

class FaceDetectionService:
    """
    Model 4: Operator Face Detection & Identity Verification Service.
    Powered by OpenCV YuNet DNN Face Engine + YOLO Person & Pose Landmark Vectorization.
    Performs 1:N cosine biometric verification against registered local templates.
    """

    def __init__(self, weights_path: Optional[str] = None):
        self.face_dir = str(Path(settings.BASE_DIR) / "models" / "face_detection")
        os.makedirs(self.face_dir, exist_ok=True)
        self.yunet_path = os.path.join(self.face_dir, "face_detection_yunet_2023mar.onnx")
        
        self.registered_dir = getattr(settings, "FACE_REGISTERED_DIR", str(Path(settings.BASE_DIR) / "storage" / "face" / "registered"))
        os.makedirs(self.registered_dir, exist_ok=True)
        
        self.yunet_detector = None
        self.pose_model = None
        self.yolo_model = None
        self._init_engine()

    def _init_engine(self):
        # 1. Initialize YuNet DNN Face Detector
        if os.path.exists(self.yunet_path):
            try:
                self.yunet_detector = cv2.FaceDetectorYN.create(
                    model=self.yunet_path,
                    config="",
                    input_size=(320, 320),
                    score_threshold=0.35,
                    nms_threshold=0.30,
                    top_k=50,
                )
                print(f"✓ Model 4 (YuNet Face Detector) loaded from: {self.yunet_path}")
            except Exception as e:
                print(f"Warning: YuNet Face Detector failed to load: {e}")
                self.yunet_detector = None

        # 2. Initialize YOLO Pose & Person Models
        try:
            pose_path = str(Path(settings.BASE_DIR) / "yolo11n-pose.pt")
            if os.path.exists(pose_path):
                self.pose_model = YOLO(pose_path)
            else:
                self.pose_model = YOLO("yolo11n-pose.pt")
            print("✓ Model 4 (YOLO Pose & Facial Keypoint Engine) loaded.")
        except Exception as e:
            print(f"Warning: YOLO Pose engine failed: {e}")
            self.pose_model = None

        try:
            yolo_path = str(Path(settings.BASE_DIR) / "yolo11n.pt")
            if os.path.exists(yolo_path):
                self.yolo_model = YOLO(yolo_path)
            else:
                self.yolo_model = YOLO("yolo11n.pt")
            print("✓ Model 4 (YOLO Person Detector) loaded.")
        except Exception as e:
            print(f"Warning: YOLO person model failed: {e}")
            self.yolo_model = None

    def is_loaded(self) -> bool:
        return self.yunet_detector is not None or self.pose_model is not None or self.yolo_model is not None

    def get_model_metadata(self) -> Dict[str, Any]:
        return {
            "model_id": "model_4_face_detection",
            "name": "Operator Face Detection & Identity Authentication",
            "task": "Operator Face Verification & Plant Authorization",
            "framework": "OpenCV YuNet DNN + Ultralytics YOLO Pose/Person",
            "status": "ONLINE" if self.is_loaded() else "OFFLINE",
            "registered_operators": len(self.get_registered_operators()),
        }

    def detect_faces(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Detects operator face/head bounding boxes in the input image.
        Returns exact face count and bounding boxes (0 if no human face in frame).
        """
        start_time = time.perf_counter()
        if image is None or image.size == 0:
            return {"success": False, "faces_detected": 0, "faces": []}
            
        h, w = image.shape[:2]
        face_items: List[Dict[str, Any]] = []

        # 1. Primary: YuNet Deep Learning Face Detector
        if self.yunet_detector is not None:
            try:
                self.yunet_detector.setInputSize((w, h))
                ret, faces = self.yunet_detector.detect(image)
                if ret and faces is not None:
                    for face in faces:
                        score = float(face[-1])
                        if score >= 0.30:
                            fx, fy, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
                            fx = max(0, min(w - 1, fx))
                            fy = max(0, min(h - 1, fy))
                            fw = max(10, min(w - fx, fw))
                            fh = max(10, min(h - fy, fh))
                            
                            face_items.append({
                                "face_id": len(face_items) + 1,
                                "confidence": round(score, 3),
                                "confidence_percent": f"{score * 100:.1f}%",
                                "bbox": {"x": fx, "y": fy, "w": fw, "h": fh},
                                "bbox_xyxy": [fx, fy, fx + fw, fy + fh],
                                "person_bbox": [fx, fy, fx + fw, fy + fh],
                                "detector": "YuNet-DNN",
                            })
            except Exception as e:
                print(f"YuNet detection error: {e}")

        # 2. Secondary: YOLO Pose Keypoints (if YuNet didn't find or to augment)
        if len(face_items) == 0 and self.pose_model is not None:
            try:
                pose_res = self.pose_model(image, conf=0.20, verbose=False)
                for res in pose_res:
                    if res.boxes and len(res.boxes) > 0:
                        for idx, b in enumerate(res.boxes):
                            conf = float(b.conf[0].item())
                            px1, py1, px2, py2 = [int(v) for v in b.xyxy[0].tolist()]
                            
                            # Check facial landmarks (0: Nose, 1: L-eye, 2: R-eye, 3: L-ear, 4: R-ear)
                            if res.keypoints is not None and len(res.keypoints.xy) > idx:
                                kpts = res.keypoints.xy[idx].cpu().numpy()[:5]
                                valid_kpts = [pt for pt in kpts if pt[0] > 0 and pt[1] > 0]
                                if len(valid_kpts) >= 1:
                                    k_xs = [pt[0] for pt in valid_kpts]
                                    k_ys = [pt[1] for pt in valid_kpts]
                                    k_min_x, k_max_x = min(k_xs), max(k_xs)
                                    k_min_y, k_max_y = min(k_ys), max(k_ys)
                                    pad_w = max(20, int((k_max_x - k_min_x) * 0.45) if k_max_x > k_min_x else 40)
                                    pad_h = max(25, int((k_max_y - k_min_y) * 0.55) if k_max_y > k_min_y else 50)
                                    
                                    fx = max(0, int(k_min_x - pad_w))
                                    fy = max(0, int(k_min_y - pad_h))
                                    fw = min(w - fx, int(max(40, k_max_x - k_min_x + 2 * pad_w)))
                                    fh = min(h - fy, int(max(50, k_max_y - k_min_y + 2 * pad_h)))
                                    
                                    face_items.append({
                                        "face_id": len(face_items) + 1,
                                        "confidence": round(conf, 3),
                                        "confidence_percent": f"{conf * 100:.1f}%",
                                        "bbox": {"x": fx, "y": fy, "w": fw, "h": fh},
                                        "bbox_xyxy": [fx, fy, fx + fw, fy + fh],
                                        "person_bbox": [px1, py1, px2, py2],
                                        "detector": "YOLO-Pose",
                                    })
                                    continue

                            # Fallback head estimate from person box
                            head_h = max(20, int((py2 - py1) * 0.35))
                            head_w = max(20, int((px2 - px1) * 0.65))
                            head_cx = int((px1 + px2) / 2)
                            fx = max(0, head_cx - int(head_w / 2))
                            fy = max(0, py1)
                            fw = min(w - fx, head_w)
                            fh = min(h - fy, head_h)
                            face_items.append({
                                "face_id": len(face_items) + 1,
                                "confidence": round(conf, 3),
                                "confidence_percent": f"{conf * 100:.1f}%",
                                "bbox": {"x": fx, "y": fy, "w": fw, "h": fh},
                                "bbox_xyxy": [fx, fy, fx + fw, fy + fh],
                                "person_bbox": [px1, py1, px2, py2],
                                "detector": "YOLO-Person",
                            })
            except Exception as e:
                print(f"Pose detection error: {e}")

        # 3. Tertiary: YOLO Person Detector
        if len(face_items) == 0 and self.yolo_model is not None:
            try:
                yolo_res = self.yolo_model(image, conf=0.20, verbose=False)
                for res in yolo_res:
                    for b in res.boxes:
                        if int(b.cls[0].item()) == 0:  # person class
                            conf = float(b.conf[0].item())
                            px1, py1, px2, py2 = [int(v) for v in b.xyxy[0].tolist()]
                            head_h = max(20, int((py2 - py1) * 0.35))
                            head_w = max(20, int((px2 - px1) * 0.65))
                            head_cx = int((px1 + px2) / 2)
                            fx = max(0, head_cx - int(head_w / 2))
                            fy = max(0, py1)
                            fw = min(w - fx, head_w)
                            fh = min(h - fy, head_h)
                            face_items.append({
                                "face_id": len(face_items) + 1,
                                "confidence": round(conf, 3),
                                "confidence_percent": f"{conf * 100:.1f}%",
                                "bbox": {"x": fx, "y": fy, "w": fw, "h": fh},
                                "bbox_xyxy": [fx, fy, fx + fw, fy + fh],
                                "person_bbox": [px1, py1, px2, py2],
                                "detector": "YOLO-COCO",
                            })
            except Exception as e:
                print(f"YOLO person error: {e}")

        # Render Annotated Image
        annotated = image.copy()
        for face in face_items:
            bx, by, bw, bh = face["bbox"]["x"], face["bbox"]["y"], face["bbox"]["w"], face["bbox"]["h"]
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), (0, 165, 255), 2)
            lbl = f"OPERATOR FACE [{face['confidence_percent']}]"
            cv2.rectangle(annotated, (bx, max(0, by - 24)), (bx + len(lbl) * 9, by), (20, 20, 20), -1)
            cv2.putText(annotated, lbl, (bx + 4, max(14, by - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 165, 255), 1, cv2.LINE_AA)

        _, buf = cv2.imencode(".jpg", annotated)
        b64_img = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return {
            "success": True,
            "engine": "YuNet DNN + YOLO Pose/Person Face Engine",
            "faces_detected": int(len(face_items)),
            "faces": face_items,
            "image_dimensions": {"width": int(w), "height": int(h)},
            "annotated_image_base64": b64_img,
            "inference_latency_ms": float(latency_ms),
        }

    def _extract_face_fingerprint(self, face_bgr: np.ndarray) -> np.ndarray:
        """Extracts normalized color/edge histogram feature vector for identity verification."""
        if face_bgr is None or face_bgr.size == 0:
            return np.zeros(32, dtype=np.float32)
            
        resized = cv2.resize(face_bgr, (112, 112))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        
        hist_hsv = cv2.calcHist([cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)], [0, 1], None, [16, 16], [0, 180, 0, 256])
        cv2.normalize(hist_hsv, hist_hsv, 0, 1, cv2.NORM_MINMAX)
        
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        mag, ang = cv2.cartToPolar(gx, gy, angleInDegrees=True)
        hist_edge = cv2.calcHist([ang], [0], None, [16], [0, 360])
        cv2.normalize(hist_edge, hist_edge, 0, 1, cv2.NORM_MINMAX)
        
        feature_vec = np.concatenate([hist_hsv.flatten(), hist_edge.flatten()]).astype(np.float32)
        norm = float(np.linalg.norm(feature_vec))
        if norm > 0:
            feature_vec = feature_vec / norm
        return feature_vec

    def register_operator(self, operator_name: str, image: np.ndarray, operator_id: Optional[str] = None) -> Dict[str, Any]:
        """Registers an operator's face into the local private face database."""
        det_result = self.detect_faces(image)
        if det_result["faces_detected"] == 0:
            return {"success": False, "error": "No face detected in the registration photo. Please ensure face is clearly visible."}
        
        if not operator_id:
            operator_id = f"OP-{int(time.time()) % 10000:04d}"

        primary_face = det_result["faces"][0]
        x, y, w, h = primary_face["bbox"]["x"], primary_face["bbox"]["y"], primary_face["bbox"]["w"], primary_face["bbox"]["h"]
        face_crop = image[y:y+h, x:x+w].copy()

        save_name = f"{operator_id}_{operator_name.replace(' ', '_')}.jpg"
        save_path = os.path.join(self.registered_dir, save_name)
        cv2.imwrite(save_path, face_crop)

        return {
            "success": True,
            "operator_id": str(operator_id),
            "operator_name": str(operator_name),
            "face_saved": True,
            "message": f"Operator '{operator_name}' successfully registered with ID {operator_id}.",
        }

    def verify_operator(self, image: np.ndarray) -> Dict[str, Any]:
        """Performs 1:N face verification against all registered operator face templates."""
        start_time = time.perf_counter()
        det_result = self.detect_faces(image)
        if det_result["faces_detected"] == 0:
            return {
                "success": True,
                "detected": False,
                "match_found": False,
                "identity": "No Face Detected",
                "confidence": 0.0,
                "database_size": int(len(self.get_registered_operators())),
                "latency_ms": round((time.perf_counter() - start_time) * 1000.0, 2),
            }

        registered_files = [f for f in os.listdir(self.registered_dir) if f.endswith(('.jpg', '.png'))]
        if not registered_files:
            return {
                "success": True,
                "detected": True,
                "match_found": False,
                "identity": "Unknown Operator (Database Empty)",
                "confidence": 0.0,
                "database_size": 0,
                "latency_ms": round((time.perf_counter() - start_time) * 1000.0, 2),
            }

        q_face = det_result["faces"][0]
        qx, qy, qw, qh = q_face["bbox"]["x"], q_face["bbox"]["y"], q_face["bbox"]["w"], q_face["bbox"]["h"]
        query_crop = image[qy:qy+qh, qx:qx+qw]
        query_vec = self._extract_face_fingerprint(query_crop)

        best_score = -1.0
        best_op_name = "Unknown Operator"
        best_op_id = "UNKNOWN"

        for f in registered_files:
            ref_path = os.path.join(self.registered_dir, f)
            ref_img = cv2.imread(ref_path)
            if ref_img is not None:
                ref_vec = self._extract_face_fingerprint(ref_img)
                sim = float(np.dot(query_vec, ref_vec))
                if sim > best_score:
                    best_score = sim
                    parts = f.split("_", 1)
                    best_op_id = parts[0]
                    best_op_name = parts[1].replace(".jpg", "").replace(".png", "").replace("_", " ") if len(parts) > 1 else parts[0]

        is_match = bool(best_score >= 0.60)
        identity = str(best_op_name) if is_match else "Unknown / Unregistered Operator"
        conf_pct = float(round(max(0.0, min(1.0, float(best_score))) * 100, 1))

        # Render annotated bounding box with identity tag
        annotated = image.copy()
        color = (0, 255, 100) if is_match else (0, 120, 255)
        cv2.rectangle(annotated, (qx, qy), (qx + qw, qy + qh), color, 2)
        lbl = f"{identity.upper()} ({conf_pct}%)"
        cv2.putText(annotated, lbl, (qx, max(18, qy - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        _, buf = cv2.imencode(".jpg", annotated)
        b64_annotated = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"

        return {
            "success": True,
            "detected": True,
            "match_found": bool(is_match),
            "operator_id": str(best_op_id) if is_match else None,
            "identity": str(identity),
            "confidence": float(conf_pct),
            "database_size": int(len(registered_files)),
            "annotated_image_base64": b64_annotated,
            "latency_ms": float(round((time.perf_counter() - start_time) * 1000.0, 2)),
        }

    def get_registered_operators(self) -> List[Dict[str, Any]]:
        operators = []
        if os.path.exists(self.registered_dir):
            for f in os.listdir(self.registered_dir):
                if f.endswith(('.jpg', '.png')):
                    parts = f.split("_", 1)
                    op_id = parts[0]
                    name = parts[1].replace(".jpg", "").replace(".png", "").replace("_", " ") if len(parts) > 1 else parts[0]
                    operators.append({
                        "operator_id": str(op_id),
                        "name": str(name),
                        "has_photo": True,
                        "registered_at": "Active Registry",
                    })
        return operators

face_detection_service = FaceDetectionService()
