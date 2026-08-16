import pytest
import torch
from pathlib import Path
from PIL import Image
import numpy as np

from ai.health_prediction.models.tool_health_predictor import ToolHealthPredictor
from ai.health_prediction.inference.image_inference import ImageOnlyInference
from ai.health_prediction.inference.pipeline import UnifiedWearPipeline

import pandas as pd

def test_tool_health_predictor():
    """Verify Tool Health categorization logic"""
    res_healthy = ToolHealthPredictor.predict_health(50.0)
    assert res_healthy["health_status"] == "HEALTHY"
    
    res_warning = ToolHealthPredictor.predict_health(200.0)
    assert res_warning["health_status"] == "WARNING"
    
    res_critical = ToolHealthPredictor.predict_health(300.0)
    assert res_critical["health_status"] == "CRITICAL"
    
    # Negative clamping check
    res_neg = ToolHealthPredictor.predict_health(-10.0)
    assert res_neg["wear_um"] == 0.0

@pytest.fixture
def mock_image(tmp_path):
    img = Image.new('RGB', (4000, 3000), color='grey')
    path = tmp_path / "test_img.jpg"
    img.save(path)
    return path

def test_image_inference_missing_file():
    """Verify missing image handling"""
    inferencer = ImageOnlyInference(model_path="dummy.pt", device='cpu')
    with pytest.raises(FileNotFoundError):
        inferencer.predict("nonexistent_path.jpg")
        
def test_image_inference_preprocessing(mock_image):
    """Verify inference preprocessing and output schema"""
    inferencer = ImageOnlyInference(model_path="dummy.pt", device='cpu')
    res = inferencer.predict(mock_image)
    
    assert "wear_um" in res
    assert "model" in res
    assert "device" in res
    assert res["model"] == "image_only"
    assert res["device"] == "cpu"

def test_pipeline_end_to_end(mock_image):
    """Verify unified pipeline wrapper without sensor data"""
    pipeline = UnifiedWearPipeline(image_model_path="dummy.pt")
    # Forcing CPU for test speed
    pipeline.image_model.device = torch.device('cpu')
    pipeline.image_model.model.to('cpu')
    
    res = pipeline.predict(mock_image)
    
    assert "wear_um" in res
    assert "health" in res
    assert "mode" in res
    assert "warnings" in res
    assert res["health"] in ["HEALTHY", "WARNING", "CRITICAL"]
    assert res["mode"] == "image_only"
    assert any("IMAGE_ONLY_FALLBACK" in w for w in res["warnings"])

def test_pipeline_multimodal_routing(mock_image):
    """Verify routing logic for multimodal"""
    pipeline = UnifiedWearPipeline(image_model_path="dummy.pt")
    with pytest.raises(NotImplementedError):
        pipeline.predict(mock_image, sensor_data=[0.1, 0.2, 0.3])
