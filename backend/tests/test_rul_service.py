import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.services.rul_service import rul_service
from backend.core.database import SessionLocal
from backend.database.crud import create_tool, get_tool_by_id

client = TestClient(app)

def test_rul_service_loaded():
    """Verify that Model 6 (XGBoost RUL) is loaded from the authoritative pkl artifact."""
    assert rul_service.is_loaded() is True
    assert len(rul_service.features) == 89
    assert rul_service.eol_threshold_um == 300.0

def test_rul_metadata():
    """Verify Model 6 metadata returns the confirmed 'cycles' unit and target variable."""
    meta = rul_service.get_model_metadata()
    assert meta["model_id"] == "model_6_rul_xgboost"
    assert meta["status"] == "ONLINE"
    assert meta["feature_count"] == 89
    assert meta["target_unit"] == "cycles"
    assert meta["target_variable"] == "robust_causal_slope (µm/cycle)"

def test_rul_prediction_valid_input():
    """Verify RUL prediction on a standard cutting run (wear = 75 µm)."""
    input_features = {
        "wear": 75.0,
        "cycle_index": 15.0,
        "prev_wear": 70.0,
        "wear_delta": 5.0,
        "material": "CK45",
        "Vc": 180.0,
        "fz": 0.15
    }
    result = rul_service.predict_rul(input_features)
    
    assert result["available"] is True
    assert result["rul_status"] == "VALID"
    assert result["unit"] == "cycles"
    assert result["rul_value"] is not None
    assert result["rul_value"] > 0.0
    assert result["wear_rate_um_per_cycle"] is not None
    assert result["wear_rate_um_per_cycle"] > 0.0

def test_rul_prediction_eol_boundary():
    """Verify physics boundary when wear >= 300 µm (EOL reached)."""
    input_features = {
        "wear": 315.0,
        "cycle_index": 50.0,
        "material": "CK45"
    }
    result = rul_service.predict_rul(input_features)
    
    assert result["available"] is True
    assert result["rul_status"] == "EOL_REACHED"
    assert result["rul_value"] == 0.0
    assert result["health_status"] == "CRITICAL"

def test_rul_prediction_missing_wear():
    """Verify graceful handling when wear is NaN / None."""
    input_features = {
        "wear": None,
        "cycle_index": 10.0,
        "material": "CK45"
    }
    result = rul_service.predict_rul(input_features)
    
    assert result["available"] is False
    assert result["rul_status"] == "UNAVAILABLE_MISSING_WEAR"
    assert result["rul_value"] is None

def test_build_feature_vector_from_context():
    """Verify feature vector construction with SQLite history and context."""
    with SessionLocal() as db:
        features = rul_service.build_feature_vector_from_context(
            tool_id="T-TEST-01",
            current_wear_um=65.0,
            db=db
        )
        assert features["wear"] == 65.0
        assert "material" in features
        assert "Vc" in features
        assert "cycle_index" in features

def test_rul_api_endpoints():
    """Verify FastAPI routes /api/v1/rul/schema, /status, and /predict."""
    # 1. Schema endpoint
    resp_schema = client.get("/api/v1/rul/schema")
    assert resp_schema.status_code == 200
    data_schema = resp_schema.json()
    assert data_schema["success"] is True
    assert data_schema["feature_count"] == 89
    assert data_schema["target_unit"] == "cycles"

    # 2. Status endpoint
    resp_status = client.get("/api/v1/rul/status")
    assert resp_status.status_code == 200
    data_status = resp_status.json()
    assert data_status["status"] == "ONLINE"

    # 3. Predict endpoint
    payload = {
        "wear": 90.0,
        "cycle_index": 20,
        "material": "CK45",
        "machining_parameters": {"Vc": 180.0, "fz": 0.15}
    }
    resp_pred = client.post("/api/v1/rul/predict", json=payload)
    assert resp_pred.status_code == 200
    data_pred = resp_pred.json()
    assert data_pred["success"] is True
    assert data_pred["rul"]["value"] is not None
    assert data_pred["rul"]["unit"] == "cycles"
    assert data_pred["rul"]["rul_status"] == "VALID"
