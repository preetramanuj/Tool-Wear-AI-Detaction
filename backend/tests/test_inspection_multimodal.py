import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import io
import json
import pytest
import numpy as np
import cv2
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.core.config import settings

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def create_dummy_tool_image_bytes():
    # Create a 640x640 dummy RGB image with a distinct bright patch representing a cutting insert
    img = np.ones((640, 640, 3), dtype=np.uint8) * 40
    cv2.rectangle(img, (200, 200), (440, 440), (220, 200, 50), -1)
    cv2.circle(img, (320, 320), 40, (30, 30, 30), -1)
    success, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

def test_mode_1_image_only_inspection(client):
    img_bytes = create_dummy_tool_image_bytes()
    files = {"image": ("test_tool.jpg", img_bytes, "image/jpeg")}
    data = {
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-01",
        "input_mode": "IMAGE",
    }
    res = client.post(f"{settings.API_V1_STR}/inspection/analyze", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert "inspection_id" in res_data
    assert "tool_detection" in res_data
    assert "wear_analysis" in res_data
    assert "health_prediction" in res_data
    assert "rul_prediction" in res_data
    assert "combined_insights" in res_data
    assert res_data["input_mode"] == "IMAGE"

def test_mode_2_live_camera_base64_inspection(client):
    import base64
    img_bytes = create_dummy_tool_image_bytes()
    b64_str = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode("utf-8")
    
    payload = {
        "image_base64": b64_str,
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-01",
        "input_mode": "CAMERA",
    }
    res = client.post(f"{settings.API_V1_STR}/inspection/analyze-base64", json=payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["input_mode"] == "CAMERA"

def test_mode_3_image_plus_manual_sensors(client):
    img_bytes = create_dummy_tool_image_bytes()
    sensor_payload = {
        "vibration_x": 1.25,
        "vibration_y": 0.95,
        "vibration_z": 1.10,
        "vibration_rms": 1.11,
        "temperature": 54.5,
        "spindle_current": 4.8,
        "spindle_power": 1850.0,
        "cutting_force": 142.0,
        "acoustic_emission": 48.2,
        "sound_level": 78.5,
        "rpm": 3200.0,
        "feed_rate": 350.0,
        "depth_of_cut": 1.0,
        "source": "MANUAL_ENTRY",
    }
    files = {"image": ("test_multimodal.jpg", img_bytes, "image/jpeg")}
    data = {
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-LATHE-01",
        "sensor_json": json.dumps(sensor_payload),
        "input_mode": "IMAGE_SENSOR",
    }
    res = client.post(f"{settings.API_V1_STR}/inspection/analyze", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["sensor_results"]["available"] is True
    assert res_data["sensor_results"]["data"]["temperature"] == 54.5
    assert res_data["sensor_results"]["data"]["cutting_force"] == 142.0
    assert len(res_data["combined_insights"]) > 0

    insp_id = res_data["inspection_id"]
    # Check sensor detail endpoint
    sensor_res = client.get(f"{settings.API_V1_STR}/inspection/{insp_id}/sensors")
    assert sensor_res.status_code == 200
    sensor_json = sensor_res.json()
    assert sensor_json["success"] is True
    assert sensor_json["sensor_reading"]["temperature"]["value"] == 54.5

def test_mode_3_image_plus_csv_sensor_upload(client):
    img_bytes = create_dummy_tool_image_bytes()
    csv_content = """timestamp,vibration_x,vibration_y,vibration_z,temperature,spindle_current,cutting_force,rpm,feed_rate,depth_of_cut
0.00,1.20,0.85,1.05,52.1,4.2,130,3000,320,1.0
0.01,1.35,0.92,1.15,52.4,4.5,135,3000,320,1.0
0.02,1.28,0.88,1.10,52.8,4.4,132,3000,320,1.0
"""
    files = {
        "image": ("test_tool.jpg", img_bytes, "image/jpeg"),
        "sensor_file": ("sensor_stream.csv", csv_content.encode("utf-8"), "text/csv"),
    }
    data = {
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-01",
        "input_mode": "IMAGE_SENSOR",
    }
    res = client.post(f"{settings.API_V1_STR}/inspection/analyze", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["sensor_results"]["available"] is True
    assert res_data["sensor_results"]["data"]["temperature"] > 50.0

def test_sensor_history_endpoint(client):
    res = client.get(f"{settings.API_V1_STR}/inspection/sensors/history?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "sensors" in data

def test_live_camera_face_detected_no_tool(client):
    # Create image with a face-like structure (no cutting tool)
    img = np.ones((640, 640, 3), dtype=np.uint8) * 180
    # Draw face oval, eyes, nose, mouth
    cv2.ellipse(img, (320, 320), (120, 160), 0, 0, 360, (130, 160, 210), -1)
    cv2.circle(img, (270, 280), 15, (50, 50, 50), -1)
    cv2.circle(img, (370, 280), 15, (50, 50, 50), -1)
    cv2.line(img, (320, 300), (320, 350), (40, 40, 40), 4)
    cv2.ellipse(img, (320, 390), (40, 15), 0, 0, 360, (40, 40, 160), -1)
    
    success, encoded = cv2.imencode(".jpg", img)
    files = {"image": ("face_frame.jpg", encoded.tobytes(), "image/jpeg")}
    data = {
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-01",
        "input_mode": "CAMERA",
    }
    res = client.post(f"{settings.API_V1_STR}/inspection/analyze", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    # Tool must NOT be detected
    assert res_data["tool_detection"]["detected"] is False
    # If face is detected, it must report FACE_DETECTED or state that tool is not detected
    assert "tool" in res_data["tool_detection"]["message"].lower() or "face" in res_data["health_prediction"]["health_status"].lower()

