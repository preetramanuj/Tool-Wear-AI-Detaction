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
    assert data["database"] == "sqlite"

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
    assert len(data["models"]) >= 5
    
    # Verify Model 2 is Phase3BGatedModel
    m2 = next(m for m in data["models"] if m["id"] == "model-2")
    assert "wear_analysis_multimodal_final.pth" in m2["weights_path"]

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

def test_manufacturing_insights(client):
    res = client.get(f"{settings.API_V1_STR}/insights/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "data" in data
    assert "kpis" in data["data"]
    assert "insights" in data["data"]
    assert "maintenance_candidates" in data["data"]

def test_economic_impact_dashboard(client):
    res = client.get(f"{settings.API_V1_STR}/economics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "data" in data
    assert "summary" in data["data"]
    assert "parameters" in data["data"]
    assert "tool_cost_breakdown" in data["data"]

def test_machine_downtime_avoided(client):
    res = client.get(f"{settings.API_V1_STR}/downtime/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "data" in data
    assert "summary" in data["data"]
    assert "estimated_downtime_avoided_hours" in data["data"]["summary"]
    assert "machine_breakdown" in data["data"]

def test_root_cause_analysis(client):
    res = client.get(f"{settings.API_V1_STR}/root-cause/analyze?tool_id=TL-CNMG-120408")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "contributing_factors" in data
    assert "explanation" in data
    assert "disclaimer" in data

def test_full_pipeline_test_endpoint(client):
    res = client.post(f"{settings.API_V1_STR}/models/pipeline-test")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "stages" in data
    assert "total_latency_ms" in data

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

def test_tool_eligibility_protection(client):
    # Pass blank black image to verify unsupported object handling
    black_img = np.zeros((480, 640, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", black_img)
    
    res = client.post(
        f"{settings.API_V1_STR}/inspection/analyze",
        files={"image": ("blank.jpg", buf.tobytes(), "image/jpeg")},
        data={"tool_id": "TL-CNMG-120408"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["tool_detection"]["detected"] is False
    assert data["wear_analysis"]["status"] == "SKIPPED"
    assert data["health_prediction"]["status"] == "SKIPPED"

def test_reports_generation_and_exports(client):
    # 1. JSON report data
    res_json = client.get(f"{settings.API_V1_STR}/reports/generate?report_type=COMPREHENSIVE_AUDIT")
    assert res_json.status_code == 200
    assert res_json.json()["success"] is True
    assert "kpis" in res_json.json()["data"]

    # 2. PDF export
    res_pdf = client.get(f"{settings.API_V1_STR}/reports/export/pdf?report_type=COMPREHENSIVE_AUDIT")
    assert res_pdf.status_code == 200
    assert res_pdf.headers.get("content-type") == "application/pdf"
    assert len(res_pdf.content) > 1000

    # 3. Word DOCX export
    res_docx = client.get(f"{settings.API_V1_STR}/reports/export/docx?report_type=COMPREHENSIVE_AUDIT")
    assert res_docx.status_code == 200
    assert "document" in res_docx.headers.get("content-type", "")
    assert len(res_docx.content) > 5000

    # 4. CSV export
    res_csv = client.get(f"{settings.API_V1_STR}/reports/export/csv?report_type=COMPREHENSIVE_AUDIT")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers.get("content-type", "")

