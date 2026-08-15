import unittest
import numpy as np
import cv2
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


class TestToolDetectionAPI(unittest.TestCase):
    """
    Test suite for FastAPI Tool Detection endpoints.
    """

    def test_01_health_check(self):
        """Test global system health check endpoint."""
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")

    def test_02_model_info_endpoint(self):
        """Test GET /api/v1/tool-detection/model-info."""
        response = client.get("/api/v1/tool-detection/model-info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("metadata", data)
        self.assertEqual(data["metadata"]["task"], "detect")
        print("\n[PASS] Model info API endpoint validated.")

    def test_03_predict_multipart_endpoint(self):
        """Test POST /api/v1/tool-detection/predict with synthetic image upload."""
        # Create synthetic test image bytes
        test_img = np.zeros((640, 640, 3), dtype=np.uint8)
        cv2.rectangle(test_img, (200, 200), (440, 440), (40, 180, 220), -1)
        _, img_bytes = cv2.imencode(".jpg", test_img)

        response = client.post(
            "/api/v1/tool-detection/predict",
            files={"file": ("test_tool.jpg", img_bytes.tobytes(), "image/jpeg")},
            params={
                "conf_threshold": 0.01,
                "include_annotated_image": True,
                "include_cropped_roi": True,
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("inference_latency_ms", data)
        self.assertIn("annotated_image_base64", data)
        print(f"[PASS] Predict API endpoint validated (Latency: {data['inference_latency_ms']} ms).")

    def test_04_diagnostics_endpoint(self):
        """Test POST /api/v1/tool-detection/diagnostics."""
        response = client.post("/api/v1/tool-detection/diagnostics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["checks"]["forward_pass"])
        print(f"[PASS] Diagnostics API endpoint validated (Test Latency: {data['test_latency_ms']} ms).")


if __name__ == "__main__":
    unittest.main()
