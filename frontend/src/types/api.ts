export interface ToolDetectionResult {
  detected: boolean;
  class: string;
  confidence: number;
  confidence_percent?: string;
  bbox: [number, number, number, number];
  bbox_normalized?: [number, number, number, number];
  area_pixels?: number;
  num_tools_found?: number;
  detections?: Array<{
    class_id: number;
    class_name: string;
    confidence: number;
    confidence_percent: string;
    bbox: [number, number, number, number];
    bbox_normalized: [number, number, number, number];
  }>;
  message?: string;
  error?: string;
}

export interface WearAnalysisResult {
  wear_value?: number;
  wear_unit?: string;
  wear_area?: number;
  wear_area_unit?: string;
  wear_status?: string;
  raw_prediction?: number;
  status?: string;
  message?: string;
  error?: string;
}

export interface HealthPredictionResult {
  wear_um?: number;
  wear_unit?: string;
  health_score?: number;
  health_status?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  health_confidence?: number;
  recommended_action?: string;
  status?: string;
  error?: string;
}

export interface PersonItem {
  bbox: [number, number, number, number];
  confidence: number;
  width: number;
  height: number;
  center: [number, number];
}

export interface PersonToolAssociation {
  person: string;
  operator_id: string;
  tool_id: string;
  relationship: 'HOLDING' | 'NEAR' | 'CARRYING' | 'USING' | 'NOT_ASSOCIATED';
  confidence: number;
  person_bbox?: [number, number, number, number];
  tool_bbox?: [number, number, number, number];
  evidence?: string;
}

export interface PPEItem {
  name: string;
  status: string;
  detected: boolean | null;
  note?: string;
}

export interface PPEStatus {
  ppe_inspection_enabled: boolean;
  items: PPEItem[];
  compliance_status: string;
}

export interface InspectionResult {
  success: boolean;
  inspection_id: string;
  tool_id?: string;
  tool_name?: string;
  tool_type?: string;
  machine_id?: string;
  operator_id?: string;
  timestamp?: string;
  tool_detection: ToolDetectionResult;
  wear_analysis: WearAnalysisResult;
  health_prediction: HealthPredictionResult;
  faces?: any;
  associations?: PersonToolAssociation[];
  images: {
    original?: string;
    annotated?: string;
    cropped_roi?: string;
  };
  performance: {
    latency_ms: number;
    device: string;
    stages_completed: string[];
  };
  error?: string;
}

export interface WebcamFrameResult {
  success: boolean;
  tool_detected: boolean;
  tool: {
    name: string;
    type: string;
    confidence: number;
    bbox: [number, number, number, number];
    detections: any[];
  };
  persons: PersonItem[];
  faces: any[];
  operator: {
    detected: boolean;
    matched: boolean;
    identity: string;
    confidence: number;
  };
  associations: PersonToolAssociation[];
  wear: WearAnalysisResult;
  health: HealthPredictionResult;
  ppe: PPEStatus;
  latency_ms: number;
  fps_estimate: number;
}

export interface Tool {
  id: number;
  tool_id: string;
  tool_name: string;
  tool_type: string;
  insert_shape: string;
  material: string;
  coating: string;
  machine_id: string;
  assigned_operator: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'RETIRED';
  current_wear_um: number;
  current_wear_vb_mm: number;
  total_inspections: number;
  created_at: string;
  updated_at: string;
}

export interface AlertItem {
  id: number;
  alert_id: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  tool_id?: string;
  machine_id?: string;
  title: string;
  message: string;
  timestamp: string;
  is_acknowledged: boolean;
}

export interface FaceItem {
  face_id: number;
  confidence: number;
  confidence_percent: string;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface FaceDetectionResponse {
  success: boolean;
  engine: string;
  faces_detected: number;
  faces: FaceItem[];
  image_dimensions: { width: number; height: number };
  annotated_image_base64?: string;
  inference_latency_ms: number;
}

export interface FaceVerificationResponse {
  success: boolean;
  detected: boolean;
  match_found: boolean;
  operator_id?: string;
  identity: string;
  confidence: number;
  annotated_image_base64?: string;
  database_size: number;
  latency_ms: number;
}

export interface Operator {
  operator_id: string;
  name: string;
  has_photo: boolean;
  registered_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  task: string;
  framework: string;
  weights_path: string;
  weights_file: string;
  loaded: boolean;
  device: string;
  resolution: [number, number];
  status: string;
}

export interface ModelsStatusResponse {
  success: boolean;
  system_device: string;
  cuda_available: boolean;
  models_loaded_count: number;
  total_models: number;
  models: ModelInfo[];
}

export interface SystemStatusResponse {
  success: boolean;
  system: string;
  version: string;
  status_indicators: {
    camera: { status: string; type: string; fps: number };
    ai_models: { status: string; count: number; loaded: boolean };
    database: { status: string; type: string };
    storage: { status: string; used_percent: number; used_gb: number; total_gb: number };
  };
}

export interface AnalyticsOverview {
  success: boolean;
  kpis: {
    total_tools: number;
    tool_status: string;
    healthy_tools: number;
    warning_tools: number;
    critical_tools: number;
    total_inspections: number;
    active_alerts: number;
    latest_wear_vb_mm: number;
    latest_wear_um: number;
    latest_wear_area_mm2: number;
    latest_health_status: string;
    predicted_rul: string;
    avg_wear_um: number;
    avg_wear_vb_mm: number;
  };
}

export interface WearTrendPoint {
  index: number;
  inspection_id: string;
  tool_id: string;
  timestamp: string;
  wear_um: number;
  wear_vb_mm: number;
  wear_area: number;
  health_score: number;
  status: string;
}
