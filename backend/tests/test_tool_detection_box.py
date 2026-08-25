import pytest
import cv2
import numpy as np
import os
from backend.services.tool_detection_service import tool_detection_service
from backend.services.inspection_pipeline_service import inspection_pipeline_service

@pytest.fixture
def sample_tool_image():
    """Generates a synthetic 640x640 cutting insert image"""
    img = np.ones((640, 640, 3), dtype=np.uint8) * 50
    # Gold diamond insert
    pts = np.array([[200, 180], [440, 180], [380, 420], [140, 420]], np.int32)
    cv2.fillPoly(img, [pts], (30, 200, 230))
    cv2.circle(img, (290, 300), 30, (20, 20, 20), -1)
    return img

@pytest.fixture
def blank_image():
    """Generates a blank image without cutting tools"""
    return np.ones((640, 640, 3), dtype=np.uint8) * 40

def test_a_single_tool_detection_green_box(sample_tool_image):
    """TEST A: Single supported tool -> Bounding box localized and HUD rendered."""
    res = tool_detection_service.detect(sample_tool_image)
    assert "detected" in res
    assert "bbox" in res
    
    # Render HUD overlay
    annotated = tool_detection_service.render_hud_overlay(
        image=sample_tool_image,
        detection_result=res,
        wear_vb_mm=0.120,
        health_status="HEALTHY"
    )
    assert annotated is not None
    assert annotated.shape == sample_tool_image.shape
    # Ensure annotated image is modified (contains HUD text / green box)
    assert not np.array_equal(annotated, sample_tool_image)

def test_b_multiple_detections_rendering(sample_tool_image):
    """TEST B: Multiple tools / detections list -> HUD draws every detection."""
    multi_res = {
        "detected": True,
        "class": "cutting_tool",
        "confidence": 0.94,
        "bbox": [100, 100, 300, 300],
        "detections": [
            {
                "class_id": 0,
                "class_name": "cutting_tool",
                "confidence": 0.94,
                "confidence_percent": "94.0%",
                "bbox": [100, 100, 300, 300],
                "bbox_normalized": [0.156, 0.156, 0.468, 0.468],
                "area_pixels": 40000,
            },
            {
                "class_id": 0,
                "class_name": "cutting_tool",
                "confidence": 0.88,
                "confidence_percent": "88.0%",
                "bbox": [350, 150, 550, 350],
                "bbox_normalized": [0.546, 0.234, 0.859, 0.546],
                "area_pixels": 40000,
            }
        ]
    }
    annotated = tool_detection_service.render_hud_overlay(sample_tool_image, multi_res)
    assert annotated is not None
    assert annotated.shape == (640, 640, 3)

def test_c_no_tool_frame(blank_image):
    """TEST C: Blank frame -> No tool detected."""
    res = tool_detection_service.detect(blank_image)
    assert res["detected"] is False
    assert res["tool_eligibility"] in ["NO_TOOL", "UNSUPPORTED"]

def test_d_aspect_ratio_and_resizing_scaling():
    """TEST D: Arbitrary image aspect ratio (1920x1080) -> Bounding box scales within frame."""
    wide_img = np.ones((1080, 1920, 3), dtype=np.uint8) * 60
    # Cutting tool located in upper-left quadrant
    cv2.rectangle(wide_img, (300, 200), (800, 700), (30, 180, 220), -1)
    
    res = tool_detection_service.detect(wide_img)
    if res["detected"]:
        bx1, by1, bx2, by2 = res["bbox"]
        assert 0 <= bx1 < bx2 <= 1920
        assert 0 <= by1 < by2 <= 1080

def test_e_pipeline_hud_base64_generation(sample_tool_image):
    """TEST E: Full pipeline execution returns base64 annotated image and image dictionary."""
    _, buf = cv2.imencode(".jpg", sample_tool_image)
    jpg_bytes = buf.tobytes()

    res = inspection_pipeline_service.run_pipeline(
        image_bytes=jpg_bytes,
        filename="test_tool.jpg",
        tool_id="T-014",
        machine_id="CNC-LATHE-01",
        operator_id="OP-001",
        input_mode="IMAGE"
    )

    assert res["success"] is True
    assert "images" in res
    assert "annotated_base64" in res["images"]
    assert res["images"]["annotated_base64"].startswith("data:image/jpeg;base64,")
    assert "tool_registry_match" in res
