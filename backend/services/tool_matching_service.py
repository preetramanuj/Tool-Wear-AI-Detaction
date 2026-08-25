import os
import cv2
import time
import numpy as np
import torch
import torch.nn as nn
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
from torchvision import transforms

from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.database.crud import (
    get_tool_by_id,
    create_tool_reference_image,
    get_tool_reference_images,
    delete_tool_reference_image,
    save_tool_embedding_record,
    get_tool_embedding_record,
    get_all_tool_embeddings,
)
from backend.services.tool_detection_service import tool_detection_service

class ToolMatchingService:
    """
    Model Extension: Registered Tool Reference & Few-Shot Visual Matching System.
    
    Two-Layer Architecture:
      1. Global YOLO Detector finds the tool insert ROI in the image.
      2. Tool Registry Matching extracts a 576-dim L2-normalized visual feature embedding
         and performs cosine similarity comparison against factory-registered physical tool references.
         
    ZERO YOLO RETRAINING: Adding tools to inventory adds reference embeddings without altering best.pt.
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() and settings.DEVICE != "cpu" else "cpu")
        self.embedding_dim = 576  # 512 deep CNN features + 32 HSV color + 32 Sobel edge profile
        self.match_threshold = settings.TOOL_MATCH_THRESHOLD
        
        # Load lightweight MobileNetV3 feature backbone
        try:
            weights = MobileNet_V3_Small_Weights.DEFAULT
            base_model = mobilenet_v3_small(weights=weights)
            # Remove final classifier to get 576-dim pooled feature representation
            self.backbone = nn.Sequential(
                base_model.features,
                base_model.avgpool,
                nn.Flatten(),
            ).to(self.device).eval()
            self.model_loaded = True
            print("✓ Tool Visual Matching Backbone (MobileNetV3 576-dim) loaded successfully.")
        except Exception as e:
            print(f"⚠ Warning loading MobileNetV3 backbone: {e}. Using multi-descriptor fallback.")
            self.backbone = None
            self.model_loaded = False

        # Preprocessing transform
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        # In-memory embedding cache: { tool_id: np.ndarray of shape (N, 576) }
        self._registry_cache: Dict[str, np.ndarray] = {}
        self._load_all_registered_embeddings()

    def _load_all_registered_embeddings(self):
        """Loads all tool embeddings from storage/tools/<tool_id>/embeddings.npy into memory."""
        tools_dir = settings.TOOL_STORAGE_DIR
        if not os.path.exists(tools_dir):
            return

        for tool_id in os.listdir(tools_dir):
            emb_path = os.path.join(tools_dir, tool_id, "embeddings.npy")
            if os.path.exists(emb_path):
                try:
                    embs = np.load(emb_path)
                    if isinstance(embs, np.ndarray) and embs.size > 0:
                        self._registry_cache[tool_id] = embs
                except Exception as e:
                    print(f"⚠ Error loading embeddings for {tool_id}: {e}")

    def extract_embedding(self, image_crop_bgr: np.ndarray) -> np.ndarray:
        """
        Extracts a robust 576-dim L2-normalized visual embedding vector from a tool ROI crop.
        Combines deep CNN features (512-dim) with HSV color histogram (32-dim) and edge gradient profile (32-dim).
        """
        if image_crop_bgr is None or image_crop_bgr.size == 0:
            return np.zeros((self.embedding_dim,), dtype=np.float32)

        # 1. Deep Feature Vector (512 or 576 dim)
        if self.backbone is not None:
            try:
                rgb = cv2.cvtColor(image_crop_bgr, cv2.COLOR_BGR2RGB)
                tensor = self.transform(rgb).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    deep_feats = self.backbone(tensor).cpu().numpy().flatten()
                # Take first 512 dimensions
                deep_part = deep_feats[:512]
                if len(deep_part) < 512:
                    deep_part = np.pad(deep_part, (0, 512 - len(deep_part)))
            except Exception:
                deep_part = np.zeros((512,), dtype=np.float32)
        else:
            deep_part = np.zeros((512,), dtype=np.float32)

        # 2. Color Descriptor (32-dim HSV Histogram)
        hsv = cv2.cvtColor(image_crop_bgr, cv2.COLOR_BGR2HSV)
        h_hist = cv2.calcHist([hsv], [0], None, [16], [0, 180]).flatten()
        s_hist = cv2.calcHist([hsv], [1], None, [8], [0, 256]).flatten()
        v_hist = cv2.calcHist([hsv], [2], None, [8], [0, 256]).flatten()
        color_feats = np.concatenate([h_hist, s_hist, v_hist])
        color_norm = np.linalg.norm(color_feats) + 1e-7
        color_feats = color_feats / color_norm

        # 3. Texture / Edge Orientation Descriptor (32-dim Sobel Gradient Histogram)
        gray = cv2.cvtColor(image_crop_bgr, cv2.COLOR_BGR2GRAY)
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        mag, angle = cv2.cartToPolar(gx, gy, angleInDegrees=True)
        edge_hist, _ = np.histogram(angle, bins=32, range=(0, 360), weights=mag)
        edge_norm = np.linalg.norm(edge_hist) + 1e-7
        edge_feats = edge_hist.astype(np.float32) / edge_norm

        # 4. Concatenate & L2-Normalize
        combined = np.concatenate([deep_part, color_feats, edge_feats]).astype(np.float32)
        norm = np.linalg.norm(combined) + 1e-7
        return combined / norm

    def validate_reference_photo(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Validates an uploaded reference photo:
        1. Checks resolution and contrast.
        2. Runs global tool detection.
        3. Returns validation status and cropped tool ROI.
        """
        if image is None or image.size == 0:
            return {"is_valid": False, "reason": "Empty or unreadable image file."}

        h, w = image.shape[:2]
        if w < 100 or h < 100:
            return {"is_valid": False, "reason": f"Image resolution ({w}x{h}) is too low for reference modeling."}

        det_res = tool_detection_service.detect(image, conf_threshold=0.20)
        is_detected = det_res.get("detected", False)
        
        if not is_detected:
            return {
                "is_valid": False,
                "detected": False,
                "confidence": 0.0,
                "reason": "No supported cutting tool insert detected in photo. Please frame the cutting insert clearly.",
            }

        primary_bbox = det_res.get("bbox", [0, 0, w, h])
        cropped_roi = tool_detection_service.crop_tool_roi(image, primary_bbox, padding_ratio=0.04)

        return {
            "is_valid": True,
            "detected": True,
            "confidence": det_res.get("confidence", 0.95),
            "confidence_percent": det_res.get("confidence_percent", "95.0%"),
            "bbox": primary_bbox,
            "cropped_roi_bgr": cropped_roi,
            "reason": "Valid cutting tool insert detected.",
        }

    def register_tool_references(
        self,
        tool_id: str,
        images_bgr: List[np.ndarray],
        filenames: List[str],
        angle_tags: Optional[List[str]] = None,
        db: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Registers multiple reference photos for a physical tool:
        1. Validates each image.
        2. Stores valid reference crops under storage/tools/<tool_id>/references/.
        3. Extracts and aggregates 576-dim visual embeddings to storage/tools/<tool_id>/embeddings.npy.
        4. Updates database records.
        """
        tool_dir = os.path.join(settings.TOOL_STORAGE_DIR, tool_id)
        refs_dir = os.path.join(tool_dir, "references")
        os.makedirs(refs_dir, exist_ok=True)

        embeddings_list = []
        validated_refs = []
        rejection_count = 0

        for i, img in enumerate(images_bgr):
            fname = filenames[i] if i < len(filenames) else f"reference_{i+1:03d}.jpg"
            angle = angle_tags[i] if angle_tags and i < len(angle_tags) else "Angle Reference"
            
            val_res = self.validate_reference_photo(img)
            if not val_res["is_valid"]:
                rejection_count += 1
                validated_refs.append({
                    "file_name": fname,
                    "is_valid": False,
                    "reason": val_res.get("reason", "Validation failed"),
                })
                continue

            crop = val_res.get("cropped_roi_bgr")
            if crop is None or crop.size == 0:
                crop = img

            # Save reference photo
            ref_save_name = f"ref_{i+1:03d}_{int(time.time()*1000)%10000}.jpg"
            ref_save_path = os.path.join(refs_dir, ref_save_name)
            cv2.imwrite(ref_save_path, crop)

            # Extract 576-dim embedding
            emb = self.extract_embedding(crop)
            embeddings_list.append(emb)

            rel_path = f"/storage/tools/{tool_id}/references/{ref_save_name}"
            validated_refs.append({
                "file_name": fname,
                "saved_path": rel_path,
                "is_valid": True,
                "confidence": val_res.get("confidence", 0.95),
                "angle_tag": angle,
            })

            # Record in SQLite if DB session passed
            if db:
                create_tool_reference_image(db, {
                    "tool_id": tool_id,
                    "file_name": fname,
                    "image_path": rel_path,
                    "angle_tag": angle,
                    "detection_bbox": str(val_res.get("bbox", [])),
                    "is_valid": True,
                })

        if embeddings_list:
            new_embs_array = np.vstack(embeddings_list)
            # Combine with existing embeddings if already present
            existing_emb_path = os.path.join(tool_dir, "embeddings.npy")
            if os.path.exists(existing_emb_path):
                try:
                    old_embs = np.load(existing_emb_path)
                    all_embs = np.vstack([old_embs, new_embs_array])
                except Exception:
                    all_embs = new_embs_array
            else:
                all_embs = new_embs_array

            np.save(existing_emb_path, all_embs)
            self._registry_cache[tool_id] = all_embs

            if db:
                save_tool_embedding_record(
                    db=db,
                    tool_id=tool_id,
                    embedding_file=f"/storage/tools/{tool_id}/embeddings.npy",
                    embedding_dim=self.embedding_dim,
                    reference_count=len(all_embs),
                )

        return {
            "tool_id": tool_id,
            "total_submitted": len(images_bgr),
            "valid_accepted": len(embeddings_list),
            "rejected": rejection_count,
            "total_reference_embeddings": len(self._registry_cache.get(tool_id, [])),
            "references": validated_refs,
            "status": "SUCCESS" if embeddings_list else "FAILED_NO_VALID_IMAGES",
        }

    def match_tool_roi(
        self,
        query_crop_bgr: np.ndarray,
        target_tool_id: Optional[str] = None,
        db: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Matches an inspected tool crop against the tool registry using cosine similarity:
          S(q, r) = q · r
        If best_similarity >= TOOL_MATCH_THRESHOLD (default: 0.75):
          Returns CONFIRMED match with Tool ID, name, and similarity score.
        Otherwise:
          Returns UNKNOWN_TOOL with similarity score and rejection message.
        """
        if query_crop_bgr is None or query_crop_bgr.size == 0:
            return {
                "matched": False,
                "tool_id": "UNKNOWN",
                "tool_name": "Unknown Tool",
                "similarity": 0.0,
                "similarity_percent": "0.0%",
                "match_status": "NO_CROP",
                "message": "No tool region provided for registry matching.",
            }

        # If cache is empty, attempt to reload
        if not self._registry_cache:
            self._load_all_registered_embeddings()

        if not self._registry_cache:
            return {
                "matched": False,
                "tool_id": target_tool_id or "TL-001",
                "tool_name": "Unregistered Tool",
                "similarity": 0.0,
                "similarity_percent": "0.0%",
                "match_status": "EMPTY_REGISTRY",
                "message": "No registered tool reference models in database. Using selected tool ID.",
            }

        query_emb = self.extract_embedding(query_crop_bgr)  # shape: (576,)

        tool_scores: List[Dict[str, Any]] = []

        for registered_id, ref_embs in self._registry_cache.items():
            if ref_embs.size == 0:
                continue

            # Cosine similarity against each reference embedding of this tool
            # (since both are unit-normalized, dot product equals cosine similarity)
            sims = np.dot(ref_embs, query_emb)
            # Top-3 mean or max similarity
            max_sim = float(np.max(sims))
            top3_sim = float(np.mean(np.sort(sims)[-min(3, len(sims)):]))
            score = (max_sim * 0.7) + (top3_sim * 0.3)

            tool_scores.append({
                "tool_id": registered_id,
                "score": score,
                "max_similarity": max_sim,
                "top3_mean_similarity": top3_sim,
            })

        if not tool_scores:
            return {
                "matched": False,
                "tool_id": "UNKNOWN",
                "tool_name": "Unknown Tool",
                "similarity": 0.0,
                "similarity_percent": "0.0%",
                "match_status": "UNKNOWN_TOOL",
                "message": "The tool was detected, but no registered tool matched the available reference images.",
            }

        tool_scores.sort(key=lambda x: x["score"], reverse=True)
        best = tool_scores[0]
        best_score = round(best["score"], 4)
        best_id = best["tool_id"]

        # Retrieve tool name from DB if available
        tool_name = "Registered Tool"
        if db:
            t = get_tool_by_id(db, best_id)
            if t and t.tool_name:
                tool_name = t.tool_name

        is_match = best_score >= self.match_threshold

        return {
            "matched": is_match,
            "tool_id": best_id if is_match else "UNKNOWN",
            "tool_name": tool_name if is_match else "Unknown Tool",
            "matched_registered_id": best_id,
            "similarity": best_score,
            "similarity_percent": f"{best_score * 100:.1f}%",
            "match_threshold": self.match_threshold,
            "match_status": "CONFIRMED" if is_match else "UNKNOWN_TOOL",
            "candidates": [
                {
                    "tool_id": c["tool_id"],
                    "similarity": round(c["score"], 4),
                    "similarity_percent": f"{c['score'] * 100:.1f}%"
                }
                for c in tool_scores[:3]
            ],
            "message": (
                f"Physical tool successfully identified as {best_id} ({best_score*100:.1f}% confidence)."
                if is_match else
                f"Tool detected, but visual similarity ({best_score*100:.1f}%) is below registration threshold ({self.match_threshold*100:.0f}%)."
            ),
        }

tool_matching_service = ToolMatchingService()
