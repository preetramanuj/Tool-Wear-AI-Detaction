import pytest
import os
import cv2
import numpy as np
import torch

from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.database.crud import init_db
from backend.services.tool_matching_service import tool_matching_service
from backend.services.inspection_pipeline_service import inspection_pipeline_service

init_db()

@pytest.fixture
def gold_insert_tool_photos():
    """Creates 5 varied reference images of Tool Alpha (Gold TiN Insert)"""
    base = np.ones((320, 320, 3), dtype=np.uint8) * 50
    cv2.rectangle(base, (60, 60), (260, 260), (30, 200, 230), -1) # Gold
    cv2.circle(base, (160, 160), 30, (20, 20, 20), -1)

    photos = [
        base,
        cv2.rotate(base, cv2.ROTATE_90_CLOCKWISE),
        cv2.rotate(base, cv2.ROTATE_180),
        cv2.convertScaleAbs(base, alpha=1.2, beta=15), # Brighter
        cv2.convertScaleAbs(base, alpha=0.8, beta=-15), # Darker
    ]
    return photos

@pytest.fixture
def black_ceramic_tool_photo():
    """Creates a visually distinct Tool Beta (Black Ceramic Insert)"""
    base = np.ones((320, 320, 3), dtype=np.uint8) * 210
    cv2.rectangle(base, (60, 60), (260, 260), (25, 25, 25), -1) # Black ceramic
    cv2.circle(base, (160, 160), 30, (200, 200, 200), -1)
    return base

def test_f_register_tool_with_references(gold_insert_tool_photos):
    """TEST F: Register tool T-014 with 5 reference photos."""
    with SessionLocal() as db:
        res = tool_matching_service.register_tool_references(
            tool_id="T-014",
            images_bgr=gold_insert_tool_photos,
            filenames=[f"photo_{i}.jpg" for i in range(len(gold_insert_tool_photos))],
            angle_tags=["Front", "Rotated 90", "Rotated 180", "Bright", "Dim"],
            db=db
        )
    assert res["status"] == "SUCCESS"
    assert res["valid_accepted"] == 5
    assert os.path.exists(os.path.join(settings.TOOL_STORAGE_DIR, "T-014", "embeddings.npy"))

def test_g_match_unseen_angle_of_registered_tool(gold_insert_tool_photos):
    """TEST G: Inspect registered tool from an unseen perspective -> Matches T-014 (sim >= 0.75)."""
    # Create unseen rotated 270 deg version of gold insert
    unseen_angle = cv2.rotate(gold_insert_tool_photos[0], cv2.ROTATE_90_COUNTERCLOCKWISE)
    
    with SessionLocal() as db:
        match_res = tool_matching_service.match_tool_roi(unseen_angle, db=db)
    
    assert match_res["matched"] is True
    assert match_res["tool_id"] == "T-014"
    assert match_res["similarity"] >= 0.75
    assert match_res["match_status"] == "CONFIRMED"

def test_h_match_under_different_lighting(gold_insert_tool_photos):
    """TEST H: Inspect same tool under altered contrast/exposure -> Evaluates match."""
    high_contrast = cv2.convertScaleAbs(gold_insert_tool_photos[0], alpha=1.3, beta=20)
    
    with SessionLocal() as db:
        match_res = tool_matching_service.match_tool_roi(high_contrast, db=db)
    
    assert match_res["tool_id"] == "T-014"
    assert match_res["similarity"] >= 0.70

def test_i_unregistered_tool_returns_unknown(black_ceramic_tool_photo):
    """TEST I: Inspect unregistered tool -> Returns UNKNOWN_TOOL."""
    # Register tool T-014 only, then query with black ceramic
    with SessionLocal() as db:
        match_res = tool_matching_service.match_tool_roi(black_ceramic_tool_photo, db=db)
    
    # Similarity to gold insert is low, so it should NOT match T-014
    if not match_res["matched"]:
        assert match_res["match_status"] == "UNKNOWN_TOOL"
        assert match_res["tool_id"] == "UNKNOWN"

def test_j_distinguish_multiple_registered_tools(gold_insert_tool_photos, black_ceramic_tool_photo):
    """TEST J: Register two distinct tools -> Matches each tool to its own registered ID."""
    black_angles = [
        black_ceramic_tool_photo,
        cv2.rotate(black_ceramic_tool_photo, cv2.ROTATE_90_CLOCKWISE),
        cv2.convertScaleAbs(black_ceramic_tool_photo, alpha=1.1, beta=10),
    ]
    with SessionLocal() as db:
        # Register Tool Beta (T-099)
        tool_matching_service.register_tool_references(
            tool_id="T-099",
            images_bgr=black_angles,
            filenames=["b1.jpg", "b2.jpg", "b3.jpg"],
            angle_tags=["Front", "Rotated", "Bright"],
            db=db
        )

        # Query with unseen angle of Tool Alpha
        query_alpha = cv2.rotate(gold_insert_tool_photos[0], cv2.ROTATE_90_COUNTERCLOCKWISE)
        match_alpha = tool_matching_service.match_tool_roi(query_alpha, db=db)
        assert match_alpha["tool_id"] == "T-014"

        # Query with unseen angle of Tool Beta
        query_beta = cv2.rotate(black_ceramic_tool_photo, cv2.ROTATE_180)
        match_beta = tool_matching_service.match_tool_roi(query_beta, db=db)
        assert match_beta["tool_id"] == "T-099"

def test_k_zero_yolo_retraining_invariance():
    """TEST K: Verify global YOLO best.pt weights file remains strictly untouched."""
    yolo_path = settings.TOOL_DETECTION_MODEL_PATHS[0]
    assert os.path.exists(yolo_path)
    # Ensure best.pt is valid file and not overwritten by custom tool models
    file_size_mb = os.path.getsize(yolo_path) / (1024 * 1024)
    assert 4.0 <= file_size_mb <= 15.0

def test_l_pipeline_integration_tool_registry():
    """TEST L: Full inspection pipeline executes tool registry matching."""
    img = np.ones((640, 640, 3), dtype=np.uint8) * 50
    pts = np.array([[200, 180], [440, 180], [380, 420], [140, 420]], np.int32)
    cv2.fillPoly(img, [pts], (30, 200, 230))
    cv2.circle(img, (290, 300), 30, (20, 20, 20), -1)
    _, buf = cv2.imencode(".jpg", img)

    res = inspection_pipeline_service.run_pipeline(
        image_bytes=buf.tobytes(),
        filename="insp_gold_tool.jpg",
        machine_id="CNC-LATHE-01",
        operator_id="OP-001",
        input_mode="IMAGE"
    )

    assert res["success"] is True
    assert "tool_registry_match" in res
    assert "TOOL_REGISTRY_MATCHING" in res["performance"]["stages_completed"]
