# ToolGuard-AI API Documentation

Comprehensive API Reference and Specification for **ToolGuard-AI** (Edge Vision & Multimodal CNC Cutting Tool Predictive Maintenance System).

---

# 1. Overview

ToolGuard-AI is an industrial edge software suite designed for automated cutting tool inspection, wear quantification, health diagnostics, physics-informed Remaining Useful Life (RUL) estimation, process parameter optimization, and compliance audit reporting.

### Architecture
- **Backend**: Python 3.10+ / FastAPI / PyTorch / Ultralytics YOLO11 / XGBoost / OpenCV / SQLite.
- **Frontend**: React 18 / TypeScript / Vite / Tailwind CSS / Lucide Icons.
- **Default Backend Base URL**: `http://localhost:8000/api/v1` (or `http://127.0.0.1:8000/api/v1`)
- **Default Frontend Dev Server**: `http://localhost:5173` (proxies `/api/*` and `/storage/*` to `http://127.0.0.1:8000`)
- **Database**: Embedded SQLite at `backend/data/toolguard.db`

### Authentication & Authorization
ToolGuard-AI operates on an edge-deployment workshop model. Endpoints are secured for factory intranet operations. Operator verification is handled via machine vision (Model 4: Face Detection & Authentication) and audit metadata tagging (`operator_id`).

### API Data Flow

```
┌────────────────────────────────────────────────────────┐
│              Frontend Client (React TSX)               │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON / Multipart Form
                            ▼
┌────────────────────────────────────────────────────────┐
│             FastAPI Routers (/api/v1/*)                │
└───────────────────────────┬────────────────────────────┘
                            │ Services Orchestration
                            ▼
┌────────────────────────────────────────────────────────┐
│ AI Models & Physics Engines (Models 1, 2, 3, 4, 6, 10) │
└───────────────────────────┬────────────────────────────┘
                            │ Persistent Transactions
                            ▼
┌────────────────────────────────────────────────────────┐
│      SQLite Database (toolguard.db) & Artifacts        │
└────────────────────────────────────────────────────────┘
```

### Multimodal Inspection Pipeline Flows

#### 1. Image Mode (Mode 1)
```
Upload Tool Image -> YOLO11 Tool Detection -> Crop ROI -> Phase3B Wear Analysis -> Health Prediction -> XGBoost RUL -> SQLite -> Visual HUD
```

#### 2. Live Camera Mode (Mode 2)
```
Webcam Stream -> [Capture & Inspect] -> Base64 Frame Snapshot -> Detection & Wear Pipeline -> Visual HUD & Record
```

#### 3. Multimodal Image + Sensor Mode (Mode 3)
```
Tool Image + Sensor Telemetry (Vibration, Temp, Current, Force, RPM, Feed) -> Validation -> 5-dim Sensor Fusion (Model 2) + 89-Feature XGBoost (Model 6) -> Vision vs Sensor vs Cross-Modal Insights -> SQLite (inspections & sensor_readings)
```

---

# 2. BACKEND APIs

## Summary Table: Backend Endpoints

| Method | Endpoint | Purpose | Auth | Request Type | Response Type |
|---|---|---|---|---|---|
| `GET` | `/api/v1/system/health` | Service health status | None | None | `application/json` |
| `GET` | `/api/v1/system/status` | System indicators & telemetry | None | None | `application/json` |
| `GET` | `/api/v1/models/status` | Models inventory status | None | None | `application/json` |
| `POST` | `/api/v1/models/diagnostics` | Benchmark AI pipeline latency | None | None | `application/json` |
| `POST` | `/api/v1/models/test-pipeline` | Single-pass pipeline test | None | `application/json` | `application/json` |
| `GET` | `/api/v1/tools` | List all inventory tools | None | Query params | `application/json` |
| `POST` | `/api/v1/tools` | Register new cutting tool | None | `application/json` | `application/json` |
| `GET` | `/api/v1/tools/{tool_id}` | Retrieve single tool record | None | Path param | `application/json` |
| `PUT` | `/api/v1/tools/{tool_id}` | Update tool metadata/status | None | `application/json` | `application/json` |
| `DELETE` | `/api/v1/tools/{tool_id}` | Remove tool from inventory | None | Path param | `application/json` |
| `POST` | `/api/v1/tools/{tool_id}/reset` | Reset wear counters after replacement | None | Path param | `application/json` |
| `POST` | `/api/v1/inspection/analyze` | Unified multimodal inspection (Image/Sensors) | None | `multipart/form-data` | `application/json` |
| `POST` | `/api/v1/inspection/analyze-base64` | Inspection via Base64 frame | None | `application/json` | `application/json` |
| `GET` | `/api/v1/inspection/records` | Paginated inspection audit history | None | Query params | `application/json` |
| `GET` | `/api/v1/inspection/records/{inspection_id}` | Single inspection detail | None | Path param | `application/json` |
| `GET` | `/api/v1/inspection/{inspection_id}/sensors` | Retrieve sensor telemetry for inspection | None | Path param | `application/json` |
| `GET` | `/api/v1/inspection/sensors/history` | Sensor telemetry historical series | None | Query params | `application/json` |
| `GET` | `/api/v1/inspection/image` | Serve raw or annotated inspection images | None | Query param | `image/jpeg` / `image/png` |
| `GET` | `/api/v1/inspection/{inspection_id}/image` | Serve image by inspection ID | None | Path/Query params | `image/jpeg` |
| `POST` | `/api/v1/webcam/frame` | Process live webcam frame snapshot | None | `multipart/form-data` | `application/json` |
| `POST` | `/api/v1/webcam/inspect` | Capture and inspect live webcam stream | None | `multipart/form-data` | `application/json` |
| `GET` | `/api/v1/analytics/overview` | High-level facility KPIs and summary | None | None | `application/json` |
| `GET` | `/api/v1/analytics/wear-trend` | Longitudinal tool wear trend data | None | Query params | `application/json` |
| `GET` | `/api/v1/analytics/health-distribution` | Categorical tool health distribution | None | None | `application/json` |
| `GET` | `/api/v1/analytics/machine-performance` | Cross-machine reliability metrics | None | None | `application/json` |
| `GET` | `/api/v1/insights/comprehensive` | Model 5 manufacturing intelligence | None | None | `application/json` |
| `GET` | `/api/v1/economic/dashboard` | Model 7 financial & cost avoidance KPIs | None | None | `application/json` |
| `POST` | `/api/v1/economic/parameters` | Update plant economic baseline constants | None | `application/json` | `application/json` |
| `GET` | `/api/v1/downtime/analytics` | Model 8 downtime avoided statistics | None | None | `application/json` |
| `GET` | `/api/v1/root-cause/{tool_id}` | Model 9 statistical root cause analysis | None | Path param | `application/json` |
| `POST` | `/api/v1/process-optimization/optimize` | Model 10 cutting regime recommendation | None | `application/json` | `application/json` |
| `GET` | `/api/v1/process-optimization/constraints` | Model 10 valid bounds & objectives | None | None | `application/json` |
| `GET` | `/api/v1/process-optimization/history` | Model 10 recommendation audit log | None | Query params | `application/json` |
| `POST` | `/api/v1/process-optimization/{id}/approve` | Approve optimization recommendation | None | Path param | `application/json` |
| `GET` | `/api/v1/reports/generate` | Generate on-screen report JSON | None | Query params | `application/json` |
| `POST` | `/api/v1/reports/generate` | Generate on-screen report JSON (POST body) | None | `application/json` | `application/json` |
| `GET` | `/api/v1/reports/export` | Export report (PDF, DOCX, CSV) | None | Query params | `application/octet-stream` |
| `GET` | `/api/v1/reports/export/pdf` | Generate formal PDF executive audit | None | Query params | `application/pdf` |
| `GET` | `/api/v1/reports/export/docx` | Generate editable Word .docx document | None | Query params | `application/vnd.openxmlformats` |
| `GET` | `/api/v1/reports/export/csv` | Export raw inspection CSV | None | Query params | `text/csv` |
| `GET` | `/api/v1/alerts` | Query active or acknowledged alerts | None | Query params | `application/json` |
| `POST` | `/api/v1/alerts/{alert_id}/acknowledge` | Acknowledge safety alert | None | Path param | `application/json` |
| `GET` | `/api/v1/face/operators` | List registered CNC operators | None | None | `application/json` |
| `POST` | `/api/v1/face/register` | Register operator face template | None | `multipart/form-data` | `application/json` |
| `POST` | `/api/v1/face/verify` | Verify operator identity from face photo | None | `multipart/form-data` | `application/json` |

---

## 2.1 System & Model Diagnostic Endpoints

### 2.1.1 System Health
- **Method**: `GET`
- **URL**: `/api/v1/system/health`
- **Purpose**: Liveness and readiness probe checking database connectivity and API runtime.
- **Request Headers**: None
- **Response**:
```json
{
  "status": "healthy",
  "project": "ToolGuard AI - Predictive Tool Wear & Machine Vision System",
  "version": "2.1.0",
  "timestamp": "2026-08-23T06:30:00Z",
  "database": "sqlite"
}
```
- **Status Codes**: `200 OK`

---

### 2.1.2 Models Status
- **Method**: `GET`
- **URL**: `/api/v1/models/status`
- **Purpose**: Returns the operational status, framework, device, and weights path of all registered AI models.
- **Response**:
```json
{
  "success": true,
  "models_loaded_count": 6,
  "models": [
    {
      "id": "model-1",
      "name": "Model 1: Tool Detection",
      "task": "Cutting Tool Insert Localization",
      "status": "ONLINE",
      "framework": "Ultralytics YOLO11n",
      "device": "CPU",
      "weights_path": "result/tool_detection/yolo11_matwi_10epochs/weights/best.pt"
    },
    {
      "id": "model-2",
      "name": "Model 2: Tool Wear Analysis",
      "task": "Flank Wear VB (mm) Multimodal Gated Regression",
      "status": "ONLINE",
      "framework": "PyTorch (Phase3BGatedModel: EfficientNet-B0 + Sensor MLP)",
      "device": "CPU",
      "weights_path": "ai/wear_analysis/artifacts/final/wear_analysis_multimodal_final.pth"
    },
    {
      "id": "model-3",
      "name": "Model 3: Tool Health Prediction",
      "task": "Continuous Wear (µm) Regression & Health Classification",
      "status": "ONLINE",
      "framework": "PyTorch (EfficientNet-B0 + Target Scaler)",
      "device": "CPU"
    },
    {
      "id": "model-6",
      "name": "Model 6: Remaining Useful Life (RUL)",
      "task": "Wear Degradation Rate (µm/cycle) & RUL Cycles to EOL",
      "status": "ONLINE",
      "framework": "XGBoost (XGBRegressor + Physics Transform)",
      "device": "CPU"
    },
    {
      "id": "model-10",
      "name": "Model 10: Automatic Process Parameter Optimization",
      "task": "Constrained Cutting Regime Recommendation",
      "status": "ONLINE",
      "framework": "Empirical Scoring Engine (Normalized Wear-Productivity Tradeoff)"
    },
    {
      "id": "model-4",
      "name": "Model 4: Operator Face Detection & Authentication",
      "task": "Machine Vision Authorization",
      "status": "ONLINE",
      "framework": "OpenCV / YOLO Vision Engine"
    }
  ]
}
```

---

## 2.2 Inspection & Multimodal Telemetry Endpoints

### 2.2.1 Run Multimodal Inspection
- **Method**: `POST`
- **URL**: `/api/v1/inspection/analyze`
- **Purpose**: Executes unified multi-model inference. Accepts optical tool image and optional physical sensor telemetry / CSV data.
- **Request Headers**: `Content-Type: multipart/form-data`
- **Form Parameters**:
  - `image` (*UploadFile*, required): Optical JPEG/PNG image of tool.
  - `tool_id` (*string*, optional): Tool inventory ID (e.g. `'TL-CNMG-120408'`).
  - `machine_id` (*string*, optional): CNC station ID (default: `'CNC-01'`).
  - `operator_id` (*string*, optional): Operator badge/name (default: `'OP-DEFAULT'`).
  - `sensor_json` (*string*, optional): JSON string of physical sensor values.
  - `sensor_file` (*UploadFile*, optional): CSV or JSON file containing sensor time-series.
  - `input_mode` (*string*, optional): `'IMAGE'`, `'CAMERA'`, or `'IMAGE_SENSOR'`.
- **Response**:
```json
{
  "success": true,
  "inspection_id": "INSP-4829104",
  "input_mode": "IMAGE_SENSOR",
  "tool_id": "TL-CNMG-120408",
  "tool_name": "Standard Carbide Insert",
  "tool_type": "Carbide Insert (CNMG)",
  "machine_id": "CNC-LATHE-01",
  "operator_id": "OP-OPERATOR",
  "timestamp": "2026-08-23T06:30:15.123456",
  "tool_detection": {
    "detected": true,
    "confidence": 0.942,
    "confidence_percent": "94.2%",
    "bbox": [180, 140, 460, 420],
    "tool_eligibility": "ELIGIBLE",
    "is_supported": true
  },
  "wear_analysis": {
    "wear_value": 0.185,
    "wear_um": 185.0,
    "wear_unit": "mm",
    "wear_area": 0.236,
    "wear_status": "MODERATE"
  },
  "health_prediction": {
    "wear_um": 185.0,
    "health_score": 78.4,
    "health_status": "HEALTHY",
    "recommended_action": "Tool healthy. Continue standard machining."
  },
  "rul_prediction": {
    "available": true,
    "rul_value": 38.5,
    "unit": "cycles",
    "wear_rate_um_per_cycle": 2.987,
    "rul_status": "VALID"
  },
  "sensor_results": {
    "available": true,
    "data": {
      "vibration_x": 1.25,
      "vibration_y": 0.95,
      "vibration_z": 1.10,
      "vibration_rms": 1.11,
      "temperature": 54.5,
      "spindle_current": 4.8,
      "cutting_force": 142.0,
      "rpm": 3200.0,
      "feed_rate": 350.0,
      "depth_of_cut": 1.0
    },
    "source": "MANUAL_ENTRY"
  },
  "combined_insights": [
    {
      "category": "NOMINAL_OPERATION",
      "title": "Multimodal Congruence: Tool & Process in Nominal State",
      "narrative": "Both vision analysis (0.185 mm flank wear) and operational sensors indicate stable cutting conditions.",
      "confidence": "VERY_HIGH",
      "recommended_action": "Continue scheduled production without intervention."
    }
  ],
  "images": {
    "original": "/storage/uploaded_images/INSP-4829104_orig.jpg",
    "annotated": "/storage/processed_images/INSP-4829104_annot.jpg",
    "cropped_roi": "/storage/processed_images/INSP-4829104_crop.jpg"
  },
  "performance": {
    "latency_ms": 128.4,
    "device": "CPU",
    "stages_completed": ["TOOL_DETECTION", "WEAR_ANALYSIS", "HEALTH_PREDICTION", "RUL_PREDICTION", "PERSON_TOOL_ASSOCIATION"]
  }
}
```
- **Status Codes**: `200 OK`, `400 Bad Request`, `500 Internal Server Error`

---

### 2.2.2 Inspection via Base64 Frame
- **Method**: `POST`
- **URL**: `/api/v1/inspection/analyze-base64`
- **Purpose**: Processes webcam frame snapshot encoded as base64 string.
- **Request Body**:
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "tool_id": "TL-CNMG-120408",
  "machine_id": "CNC-01",
  "operator_id": "OP-DEFAULT",
  "sensor_data": { "temperature": 52.0, "vibration_rms": 1.2 },
  "input_mode": "CAMERA"
}
```

---

### 2.2.3 Retrieve Inspection Sensor Telemetry
- **Method**: `GET`
- **URL**: `/api/v1/inspection/{inspection_id}/sensors`
- **Purpose**: Returns the physical sensor readings associated with a specific inspection ID.
- **Response**:
```json
{
  "success": true,
  "inspection_id": "INSP-4829104",
  "sensor_reading": {
    "reading_id": "SENS-4829104",
    "tool_id": "TL-CNMG-120408",
    "machine_id": "CNC-LATHE-01",
    "timestamp": "2026-08-23T06:30:15.123456",
    "vibration": { "x": 1.25, "y": 0.95, "z": 1.10, "rms": 1.11, "unit": "m/s²" },
    "temperature": { "value": 54.5, "unit": "°C" },
    "spindle_current": { "value": 4.8, "unit": "A" },
    "cutting_force": { "value": 142.0, "unit": "N" },
    "process_parameters": { "rpm": 3200.0, "feed_rate": 350.0, "depth_of_cut": 1.0 },
    "source": "MANUAL_ENTRY",
    "status": "VALID"
  }
}
```

---

## 2.3 Process Parameter Optimization Endpoints (Model 10)

### 2.3.1 Generate Optimization Recommendation
- **Method**: `POST`
- **URL**: `/api/v1/process-optimization/optimize`
- **Purpose**: Evaluates candidate cutting regimes against Pareto wear-productivity trade-offs.
- **Request Body**:
```json
{
  "tool_id": "TL-CNMG-120408",
  "machine_id": "CNC-LATHE-01",
  "material": "CK45 / Alloy Steel",
  "objective": "MAXIMIZE_TOOL_LIFE",
  "current_parameters": {
    "n": 3184.0,
    "fz": 0.050,
    "Ap": 1.0
  }
}
```
- **Response**:
```json
{
  "success": true,
  "optimization_id": "OPT-20260823063000-A1B2",
  "timestamp": "2026-08-23T06:30:00Z",
  "tool_id": "TL-CNMG-120408",
  "objective": "MAXIMIZE_TOOL_LIFE",
  "current_parameters": { "n": 3184.0, "fz": 0.050, "Ap": 1.0 },
  "recommended_parameters": { "n": 3705.0, "fz": 0.045, "Ap": 1.0 },
  "expected_impact": {
    "current_wear_rate_um_per_cycle": 2.700,
    "recommended_wear_rate_um_per_cycle": 0.200,
    "estimated_wear_reduction_percent": 92.6,
    "current_mrr": 159.2,
    "recommended_mrr": 166.7,
    "estimated_mrr_change_percent": 4.7,
    "current_projected_rul_cycles": 74.0,
    "recommended_projected_rul_cycles": 1000.0,
    "estimated_cycle_life_gain": 926.0,
    "provenance": "Empirical Pareto Frontier Optimization (Phase 10.6)"
  },
  "explanation": "Recommendation reduces wear rate by 92.6% while maintaining stable throughput.",
  "safety_notice": "AI Recommendation — Engineer Approval Required."
}
```

---

## 2.4 Tool Inventory & Visual Reference Registry Endpoints

### 2.4.1 Register Physical Tool with Multi-Angle Reference Photos
- **Method**: `POST`
- **URL**: `/api/v1/tools/register`
- **Purpose**: Registers a physical cutting tool in inventory with 3–10 reference photos, extracting 576-dim L2-normalized feature embeddings for few-shot visual matching.
- **Request Format**: `multipart/form-data`
- **Form Fields**:
  - `tool_id` (*string*, required): Unique physical tool identifier (e.g. `T-014`).
  - `tool_name` (*string*): Descriptive name (e.g. `Carbide Roughing Insert`).
  - `tool_type` (*string*): Geometry designation (e.g. `CNMG 12 04 08-PM`).
  - `manufacturer` (*string*): Brand / supplier (e.g. `Sandvik Coromant`).
  - `part_number` (*string*): Manufacturer part number.
  - `material` (*string*): Tool substrate material.
  - `coating` (*string*): CVD/PVD coating specification.
  - `machine_id` (*string*): Assigned CNC machine station.
  - `angle_tags` (*string*, JSON array): List of angle labels per uploaded photo (`["Front Flank", "Rake Face", "Side Profile", "Macro"]`).
  - `reference_photos` (*List[UploadFile]*): 3–10 optical photos of the tool insert.
- **Response**:
```json
{
  "success": true,
  "tool": {
    "tool_id": "T-014",
    "tool_name": "Carbide Roughing Insert",
    "tool_type": "CNMG 12 04 08-PM",
    "manufacturer": "Sandvik Coromant",
    "status": "HEALTHY"
  },
  "registration_summary": {
    "tool_id": "T-014",
    "total_submitted": 5,
    "valid_accepted": 5,
    "rejected": 0,
    "total_reference_embeddings": 5,
    "status": "SUCCESS"
  },
  "message": "Tool 'T-014' registered successfully with 5 reference embeddings."
}
```

---

### 2.4.2 Retrieve Tool Reference Photos
- **Method**: `GET`
- **URL**: `/api/v1/tools/{tool_id}/references`
- **Purpose**: Retrieves all validated reference images and embedding status for a registered tool.
- **Response**:
```json
{
  "success": true,
  "tool_id": "T-014",
  "total_references": 5,
  "embedding_status": "READY",
  "embedding_dim": 576,
  "references": [
    {
      "id": 1,
      "file_name": "front_flank.jpg",
      "image_path": "/storage/tools/T-014/references/ref_001.jpg",
      "angle_tag": "Front Flank",
      "is_valid": true
    }
  ]
}
```

---

### 2.4.3 Test Visual Reference Matching
- **Method**: `POST`
- **URL**: `/api/v1/tools/match`
- **Purpose**: Directly evaluates visual cosine similarity of a query tool image crop against all registered tool reference embeddings.
- **Request Format**: `multipart/form-data` (`image: UploadFile`, `target_tool_id: Optional[str]`)
- **Response**:
```json
{
  "success": true,
  "match_result": {
    "matched": true,
    "tool_id": "T-014",
    "tool_name": "Carbide Roughing Insert",
    "similarity": 0.8421,
    "similarity_percent": "84.2%",
    "match_threshold": 0.75,
    "match_status": "CONFIRMED",
    "message": "Physical tool successfully identified as T-014 (84.2% confidence)."
  }
}
```

---

## 2.5 Reports & Compliance Documentation Endpoints

### 2.5.1 Universal Report Export
- **Method**: `GET`
- **URL**: `/api/v1/reports/export`
- **Purpose**: Generates and downloads compiled executive audit reports in requested format (`pdf`, `docx`, `csv`).
- **Query Parameters**:
  - `report_type` (*string*): `'daily'`, `'lifecycle'`, `'trend'`, `'executive'`, `'sustainability'`.
  - `format` (*string*): `'pdf'`, `'docx'`, `'word'`, `'csv'`.
  - `timeframe` (*string*, optional): `'24H'`, `'7D'`, `'30D'`, `'ALL'`.
  - `machine_id` (*string*, optional): Station filter.

---

# 3. FRONTEND APIs

This section documents every client function declared in `frontend/src/services/api.ts` used by React components to communicate with the FastAPI backend.

## Summary Table: Frontend API Client Methods

| Function Name | HTTP Method | Backend Endpoint | Frontend Source File | Used By Components |
|---|---|---|---|---|
| `analyzeInspectionImage()` | `POST` | `/api/v1/inspection/analyze` | `frontend/src/services/api.ts` | `Inspections.tsx` |
| `getInspectionRecords()` | `GET` | `/api/v1/inspection/records` | `frontend/src/services/api.ts` | `Inspections.tsx`, `Dashboard.tsx` |
| `getInspectionDetail()` | `GET` | `/api/v1/inspection/records/{id}` | `frontend/src/services/api.ts` | `Inspections.tsx` |
| `getInspectionSensors()` | `GET` | `/api/v1/inspection/{id}/sensors` | `frontend/src/services/api.ts` | `Inspections.tsx` |
| `getSensorsHistory()` | `GET` | `/api/v1/inspection/sensors/history` | `frontend/src/services/api.ts` | `Inspections.tsx`, `Analytics.tsx` |
| `analyzeWebcamFrame()` | `POST` | `/api/v1/webcam/frame` | `frontend/src/services/api.ts` | `LiveMonitor.tsx` |
| `getTools()` | `GET` | `/api/v1/tools` | `frontend/src/services/api.ts` | `Tools.tsx`, `Dashboard.tsx`, `Inspections.tsx`, `ProcessOptimization.tsx`, `Reports.tsx` |
| `createTool()` | `POST` | `/api/v1/tools` | `frontend/src/services/api.ts` | `Tools.tsx` |
| `deleteTool()` | `DELETE` | `/api/v1/tools/{id}` | `frontend/src/services/api.ts` | `Tools.tsx` |
| `getAnalyticsOverview()` | `GET` | `/api/v1/analytics/overview` | `frontend/src/services/api.ts` | `Dashboard.tsx`, `Analytics.tsx` |
| `getWearTrend()` | `GET` | `/api/v1/analytics/wear-trend` | `frontend/src/services/api.ts` | `Dashboard.tsx`, `Analytics.tsx` |
| `getHealthDistribution()` | `GET` | `/api/v1/analytics/health-distribution` | `frontend/src/services/api.ts` | `Analytics.tsx` |
| `getAlerts()` | `GET` | `/api/v1/alerts` | `frontend/src/services/api.ts` | `Dashboard.tsx`, `Header.tsx`, `Inspections.tsx` |
| `acknowledgeAlert()` | `POST` | `/api/v1/alerts/{id}/acknowledge` | `frontend/src/services/api.ts` | `Dashboard.tsx`, `Header.tsx` |
| `getModelsStatus()` | `GET` | `/api/v1/models/status` | `frontend/src/services/api.ts` | `Models.tsx`, `Dashboard.tsx`, `Header.tsx` |
| `runModelsDiagnostics()` | `POST` | `/api/v1/models/diagnostics` | `frontend/src/services/api.ts` | `Models.tsx` |
| `testPipelineEndToEnd()` | `POST` | `/api/v1/models/test-pipeline` | `frontend/src/services/api.ts` | `Models.tsx` |
| `getManufacturingInsights()` | `GET` | `/api/v1/insights/comprehensive` | `frontend/src/services/api.ts` | `Insights.tsx`, `Dashboard.tsx` |
| `getEconomicImpactDashboard()` | `GET` | `/api/v1/economic/dashboard` | `frontend/src/services/api.ts` | `EconomicImpact.tsx`, `Dashboard.tsx` |
| `updateEconomicParameters()` | `POST` | `/api/v1/economic/parameters` | `frontend/src/services/api.ts` | `EconomicImpact.tsx` |
| `getMachineDowntimeAvoided()` | `GET` | `/api/v1/downtime/analytics` | `frontend/src/services/api.ts` | `DowntimeAvoided.tsx`, `Dashboard.tsx` |
| `getRootCauseAnalysis()` | `GET` | `/api/v1/root-cause/{toolId}` | `frontend/src/services/api.ts` | `RootCause.tsx` |
| `optimizeProcessParameters()` | `POST` | `/api/v1/process-optimization/optimize` | `frontend/src/services/api.ts` | `ProcessOptimization.tsx` |
| `getOptimizationConstraints()` | `GET` | `/api/v1/process-optimization/constraints` | `frontend/src/services/api.ts` | `ProcessOptimization.tsx` |
| `getOptimizationHistory()` | `GET` | `/api/v1/process-optimization/history` | `frontend/src/services/api.ts` | `ProcessOptimization.tsx` |
| `approveOptimizationRecommendation()` | `POST` | `/api/v1/process-optimization/{id}/approve` | `frontend/src/services/api.ts` | `ProcessOptimization.tsx` |
| `generateReport()` | `POST` | `/api/v1/reports/generate` | `frontend/src/services/api.ts` | `Reports.tsx` |
| `exportReportFile()` | `GET` | `/api/v1/reports/export` | `frontend/src/services/api.ts` | `Reports.tsx` |

---

## 3.1 Method Details (Frontend API)

### 3.1.1 `analyzeInspectionImage`
```typescript
export const analyzeInspectionImage = async (
  file: File | Blob,
  toolId?: string,
  machineId: string = 'CNC-01',
  operatorId: string = 'OP-DEFAULT',
  sensorData?: Record<string, any>,
  sensorFile?: File | null,
  inputMode: string = 'IMAGE'
): Promise<InspectionResult>
```
- **Backend Endpoint**: `POST /api/v1/inspection/analyze`
- **Purpose**: Uploads optical tool image and optional physical sensor JSON/file to trigger full multimodal inference.
- **Used By**: [`frontend/src/pages/Inspections.tsx`](file:///d:/DAX/sih-2026/frontend/src/pages/Inspections.tsx)

### 3.1.2 `optimizeProcessParameters`
```typescript
export const optimizeProcessParameters = async (payload: {
  tool_id: string;
  machine_id?: string;
  material?: string;
  objective: string;
  current_parameters: ProcessOptimizationParameters;
}): Promise<ProcessOptimizationResult>
```
- **Backend Endpoint**: `POST /api/v1/process-optimization/optimize`
- **Purpose**: Generates Model 10 cutting regime recommendations based on Pareto trade-offs.
- **Used By**: [`frontend/src/pages/ProcessOptimization.tsx`](file:///d:/DAX/sih-2026/frontend/src/pages/ProcessOptimization.tsx)

---

# 4. Sensor Telemetry Schema & Units

| Sensor Category | Field Key | Unit | Nominal Baseline Range | Target Model / Consumer |
|---|---|---|---|---|
| **Vibration (X-Axis)** | `vibration_x` | $\text{m/s}^2$ | $0.10 - 2.50\,\text{m/s}^2$ | Model 2 (Gated MLP), Model 6, Model 9 |
| **Vibration (Y-Axis)** | `vibration_y` | $\text{m/s}^2$ | $0.10 - 2.00\,\text{m/s}^2$ | Model 2 (Gated MLP), Model 6, Model 9 |
| **Vibration (Z-Axis)** | `vibration_z` | $\text{m/s}^2$ | $0.10 - 2.50\,\text{m/s}^2$ | Model 2 (Gated MLP), Model 6, Model 9 |
| **Vibration RMS** | `vibration_rms` | $\text{m/s}^2$ | $0.50 - 1.80\,\text{m/s}^2$ | Model 2, Model 5, Model 9 |
| **Temperature** | `temperature` | $^\circ\text{C}$ | $20.0 - 55.0^\circ\text{C}$ | Model 2, Model 5, Model 9 |
| **Spindle Current** | `spindle_current` | $\text{A}$ | $1.5 - 6.0\,\text{A}$ | Model 2, Model 5, Model 9 |
| **Spindle Power** | `spindle_power` | $\text{W}$ | $800 - 3000\,\text{W}$ | Model 5, Model 9 |
| **Cutting Force** | `cutting_force` | $\text{N}$ | $50 - 180\,\text{N}$ | Model 6, Model 9 |
| **Acoustic Emission** | `acoustic_emission` | $\text{dB}$ | $30.0 - 65.0\,\text{dB}$ | Model 6, Model 9 |
| **Sound Level** | `sound_level` | $\text{dB}$ | $60.0 - 82.0\,\text{dB}$ | Model 9 |
| **Spindle Speed** | `rpm` | $\text{RPM}$ | $1000 - 4500\,\text{RPM}$ | Model 6, Model 10 |
| **Feed Rate** | `feed_rate` | $\text{mm/min}$ | $100 - 800\,\text{mm/min}$ | Model 6, Model 10 |
| **Depth of Cut** | `depth_of_cut` | $\text{mm}$ | $0.5 - 3.0\,\text{mm}$ | Model 6, Model 10 |

---

# 5. Model Compatibility Matrix

| AI Component | Input Modality | Sensor Data Accepted? | Image Input Required? | Integration Notes |
|---|---|---|---|---|
| **Model 1: Tool Detection (YOLO11n)** | Image (640x640) | ✗ No | ✓ Yes | Strictly optical bounding box localizer. |
| **Model 2: Tool Wear Analysis (Phase3B)** | Image (384x384) + 5-dim Sensor Vector | ✓ Yes | ✓ Yes | Gated fusion: image features + `[vib_x, vib_y, vib_z, current, temp]`. Safe zero-gating fallback on image-only mode. |
| **Model 3: Tool Health Prediction** | Image (384x384 ROI) | ✗ No | ✓ Yes | EfficientNet-B0 continuous wear ($\mu\text{m}$) regression. |
| **Model 4: Operator Authentication** | Image (Face ROI) | ✗ No | ✓ Yes | OpenCV template & facial recognition engine. |
| **Model 5: Manufacturing Insights** | Database Audits & Telemetry | ✓ Yes | ✗ No | Statistical time-series trend analysis. |
| **Model 6: Remaining Useful Life (XGBoost)** | 89 Tabular Features | ✓ Yes | ✗ No (uses wear from M2/M3) | Consumes process params, vibration stats, force, AE, and wear progression. |
| **Model 7: Economic Impact** | Financial Baseline & Audits | ✗ No | ✗ No | Calculates cost avoidance and tooling ROI. |
| **Model 8: Downtime Avoidance** | Machine Audits & Telemetry | ✓ Yes | ✗ No | Computes avoided unpredicted breakdown hours. |
| **Model 9: AI Root Cause Analysis** | Multimodal Telemetry & Wear | ✓ Yes | ✗ No | Calculates statistical feature importance against nominal baselines. |
| **Model 10: Process Optimization** | Process Regimes & Wear Limits | ✗ No (Process Params only) | ✗ No | Empirical Pareto scoring engine over verified $(n, f_z, A_p)$ configurations. |
