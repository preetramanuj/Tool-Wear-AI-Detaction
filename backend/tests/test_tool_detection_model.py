import os
import unittest
import numpy as np
import cv2
from pathlib import Path

from backend.services.tool_detection_service import ToolDetectionService
from backend.utils.model_loader import find_model_weights, get_optimal_device
from backend.core.config import settings

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent


class TestToolDetectionModel(unittest.TestCase):
    """
    Unit test suite for YOLO11n cutting tool detection model and backend service.
    Verifies that .pt weights stored in result/ load and perform accurate inference.
    """

    @classmethod
    def setUpClass(cls):
        # Locate .pt weights file
        cls.weights_path = find_model_weights()
        cls.service = ToolDetectionService(model_path=cls.weights_path)

    def test_01_model_weights_exist_in_result(self):
        """Verify that the model .pt file exists and has non-zero size."""
        self.assertTrue(os.path.exists(self.weights_path), f"Weights not found at {self.weights_path}")
        size_mb = os.path.getsize(self.weights_path) / (1024 * 1024)
        self.assertGreater(size_mb, 1.0, f"Weights file appears truncated ({size_mb:.2f} MB)")
        print(f"\n[PASS] Model weights verified at: {self.weights_path} ({size_mb:.2f} MB)")

    def test_02_model_initialization_and_metadata(self):
        """Verify model metadata, classes, and compute device."""
        metadata = self.service.get_model_metadata()
        self.assertIn("cutting_tool", list(metadata["classes"].values()))
        self.assertEqual(metadata["task"], "detect")
        self.assertIsNotNone(metadata["device"])
        print(f"[PASS] Model metadata: classes={metadata['classes']}, device={metadata['device']}")

    def test_03_inference_on_synthetic_machining_image(self):
        """Verify single image inference on a synthetic test image."""
        # Create a 640x640 synthetic image
        test_img = np.zeros((640, 640, 3), dtype=np.uint8)
        cv2.rectangle(test_img, (200, 200), (440, 440), (40, 180, 220), -1)

        result = self.service.predict(test_img, conf_threshold=0.01)

        self.assertEqual(result["status"], "success")
        self.assertIn("inference_latency_ms", result)
        self.assertIn("detections", result)
        self.assertGreater(result["inference_latency_ms"], 0.0)
        self.assertEqual(result["image_dimensions"]["width"], 640)
        self.assertEqual(result["image_dimensions"]["height"], 640)
        print(f"[PASS] Synthetic inference completed in {result['inference_latency_ms']} ms")

    def test_04_roi_cropping(self):
        """Verify that crop_tool_roi extracts valid bounding box slices."""
        test_img = np.ones((640, 640, 3), dtype=np.uint8) * 128
        bbox = [100.0, 150.0, 300.0, 450.0]

        cropped = self.service.crop_tool_roi(test_img, bbox, padding_ratio=0.0)

        self.assertIsInstance(cropped, np.ndarray)
        self.assertEqual(cropped.shape[0], 300)  # height: 450 - 150
        self.assertEqual(cropped.shape[1], 200)  # width: 300 - 100
        print(f"[PASS] Cropped ROI shape: {cropped.shape}")

    def test_05_visual_annotation_rendering(self):
        """Verify that draw_detections outputs an annotated canvas with HUD."""
        test_img = np.zeros((640, 640, 3), dtype=np.uint8)
        dummy_result = {
            "status": "success",
            "model_used": "best.pt",
            "inference_latency_ms": 15.2,
            "fps": 65.8,
            "detections": [
                {
                    "detection_id": 1,
                    "class_name": "cutting_tool",
                    "confidence_percent": "99.50%",
                    "bbox_xyxy": [150, 150, 450, 450]
                }
            ]
        }

        annotated = self.service.draw_detections(test_img, dummy_result, show_hud=True)

        self.assertEqual(annotated.shape, test_img.shape)
        # Check that canvas has been modified (HUD banner at top)
        self.assertFalse(np.array_equal(annotated, test_img))
        print("[PASS] HUD & bounding box rendering verified.")

    def test_06_confidence_filtering(self):
        """Verify that high confidence threshold properly filters detections."""
        test_img = np.zeros((640, 640, 3), dtype=np.uint8)
        # Threshold at 0.9999 should return 0 detections for blank canvas
        result = self.service.predict(test_img, conf_threshold=0.9999)
        self.assertEqual(result["num_detections"], 0)
        self.assertFalse(result["tool_detected"])
        print("[PASS] Confidence threshold filtering validated.")


if __name__ == "__main__":
    unittest.main()
