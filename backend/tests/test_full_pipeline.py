import os
import sys
import cv2
import numpy as np
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.core.config import settings

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_system_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_system_status(client):
    res = client.get(f"{settings.API_V1_STR}/system/status")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "status_indicators" in data

def test_models_status(client):
    res = client.get(f"{settings.API_V1_STR}/models/status")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["models_loaded_count"] >= 4
    assert len(data["models"]) == 5

def test_tools_crud(client):
    res = client.get(f"{settings.API_V1_STR}/tools")
    assert res.status_code == 200
    tools = res.json().get("tools", [])
    assert len(tools) >= 1

def test_alerts_endpoint(client):
    res = client.get(f"{settings.API_V1_STR}/alerts")
    assert res.status_code == 200
    assert "alerts" in res.json()

def test_analytics_overview(client):
    res = client.get(f"{settings.API_V1_STR}/analytics/overview")
    assert res.status_code == 200
    kpis = res.json().get("kpis", {})
    assert "total_tools" in kpis
    assert "predicted_rul" in kpis

def test_inspection_pipeline_with_sample_image(client):
    sample_img_path = Path(settings.BASE_DIR) / "datasets" / "sample_cutting_tool.jpg"
    if sample_img_path.exists():
        with open(sample_img_path, "rb") as f:
            res = client.post(
                f"{settings.API_V1_STR}/inspection/analyze",
                files={"image": ("sample.jpg", f, "image/jpeg")},
                data={"tool_id": "TL-CNMG-120408"}
            )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "tool_detection" in data
        assert "wear_analysis" in data
        assert "health_prediction" in data
        assert "rul_prediction" in data
        assert "associations" in data
        assert "images" in data

def test_webcam_frame_endpoint(client):
    # Create test image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.rectangle(img, (100, 100), (300, 400), (120, 120, 120), -1)
    _, buf = cv2.imencode(".jpg", img)
    
    res = client.post(
        f"{settings.API_V1_STR}/webcam/frame",
        files={"file": ("frame.jpg", buf.tobytes(), "image/jpeg")},
        data={"tool_id": "TL-CNMG-120408"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "tool" in data
    assert "persons" in data
    assert "associations" in data
    assert "ppe" in data

def test_face_detection_synthetic(client):
    canvas = np.zeros((400, 400, 3), dtype=np.uint8)
    cv2.circle(canvas, (200, 200), 80, (200, 200, 200), -1)
    _, buf = cv2.imencode(".jpg", canvas)
    
    res = client.post(
        f"{settings.API_V1_STR}/face/detect",
        files={"file": ("face.jpg", buf.tobytes(), "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "faces_detected" in data
