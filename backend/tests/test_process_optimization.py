import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.services.process_optimization_service import process_optimization_service

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_model_10_loaded():
    assert process_optimization_service.is_loaded() is True

def test_models_status_includes_model_10(client):
    response = client.get("/api/v1/models/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    model_ids = [m["id"] for m in data["models"]]
    assert "model-10" in model_ids
    
    m10 = next(m for m in data["models"] if m["id"] == "model-10")
    assert m10["name"] == "Model 10: Automatic Process Parameter Optimization"
    assert m10["status"] == "ONLINE"
    assert m10["loaded"] is True

def test_constraints_endpoint(client):
    response = client.get("/api/v1/process-optimization/constraints")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "constraints" in data
    assert "parameter_bounds" in data["constraints"]
    assert "spindle_speed_rpm" in data["constraints"]["parameter_bounds"]
    assert "feed_rate_fz" in data["constraints"]["parameter_bounds"]
    assert "depth_of_cut_ap" in data["constraints"]["parameter_bounds"]

def test_optimize_maximize_tool_life(client):
    payload = {
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-LATHE-01",
        "material": "CK45 / Alloy Steel",
        "objective": "MAXIMIZE_TOOL_LIFE",
        "parameters": {
            "n": 2547.0,
            "fz": 0.050,
            "Ap": 0.5
        }
    }
    response = client.post("/api/v1/process-optimization/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "optimization_id" in data
    assert data["objective"] == "MAXIMIZE_TOOL_LIFE"
    assert "recommended_parameters" in data
    assert data["recommended_parameters"]["n"] >= 2547.0
    assert data["recommended_parameters"]["fz"] >= 0.030
    assert data["recommended_parameters"]["Ap"] >= 0.5
    assert "expected_impact" in data
    assert "explanation" in data
    assert "safety_notice" in data

def test_optimize_maximize_productivity(client):
    payload = {
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-LATHE-01",
        "material": "CK45 / Alloy Steel",
        "objective": "MAXIMIZE_PRODUCTIVITY",
        "parameters": {
            "n": 3705.0,
            "fz": 0.045,
            "Ap": 1.0
        }
    }
    response = client.post("/api/v1/process-optimization/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["objective"] == "MAXIMIZE_PRODUCTIVITY"
    assert data["recommended_parameters"]["n"] == 2547.0
    assert data["recommended_parameters"]["fz"] == 0.08
    assert data["recommended_parameters"]["Ap"] == 1.0

def test_optimize_balanced_tradeoff(client):
    payload = {
        "tool_id": "TL-CNMG-120408",
        "machine_id": "CNC-LATHE-01",
        "material": "CK45 / Alloy Steel",
        "objective": "BALANCED",
        "parameters": {
            "n": 3184.0,
            "fz": 0.050,
            "Ap": 1.0
        }
    }
    response = client.post("/api/v1/process-optimization/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["objective"] == "BALANCED"
    assert "optimization_score" in data
    assert data["optimization_score"] > 0

def test_optimize_invalid_rpm_boundary(client):
    payload = {
        "tool_id": "TL-CNMG-120408",
        "objective": "MAXIMIZE_TOOL_LIFE",
        "parameters": {
            "n": 15000.0,  # Unsafe RPM
            "fz": 0.050,
            "Ap": 1.0
        }
    }
    response = client.post("/api/v1/process-optimization/optimize", json=payload)
    assert response.status_code == 400
    assert "Spindle speed" in response.json()["detail"]

def test_optimize_invalid_feed_boundary(client):
    payload = {
        "tool_id": "TL-CNMG-120408",
        "objective": "MAXIMIZE_TOOL_LIFE",
        "parameters": {
            "n": 3184.0,
            "fz": 1.5,  # Unsafe Feed
            "Ap": 1.0
        }
    }
    response = client.post("/api/v1/process-optimization/optimize", json=payload)
    assert response.status_code == 400
    assert "Feed rate" in response.json()["detail"]

def test_history_and_approval_flow(client):
    # 1. Run optimization
    payload = {
        "tool_id": "TL-CNMG-120408",
        "objective": "MAXIMIZE_TOOL_LIFE",
        "parameters": {"n": 3184.0, "fz": 0.050, "Ap": 1.0}
    }
    opt_res = client.post("/api/v1/process-optimization/optimize", json=payload)
    assert opt_res.status_code == 200
    opt_id = opt_res.json()["optimization_id"]

    # 2. Check history
    hist_res = client.get("/api/v1/process-optimization/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["success"] is True
    assert any(h["optimization_id"] == opt_id for h in hist_data["optimizations"])

    # 3. Approve recommendation
    appr_res = client.post(f"/api/v1/process-optimization/{opt_id}/approve", json={"approved": True})
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["success"] is True
    assert appr_data["record"]["approved_by_operator"] is True
    assert appr_data["record"]["status"] == "APPROVED_BY_OPERATOR"
