export interface ToolDetectionResult {
  detected: boolean;
  class: string;
  confidence: number;
  confidence_percent?: string;
  bbox: [number, number, number, number];
  bbox_normalized?: [number, number, number, number];
  area_pixels?: number;
  num_tools_found?: number;
  tool_eligibility?: string;
  is_supported?: boolean;
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
  health_status?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'FACE_DETECTED' | 'SKIPPED' | 'UNKNOWN' | string;
  health_confidence?: number;
  recommended_action?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface RULPredictionResult {
  available: boolean;
  rul_value: number | null;
  unit: string;
  wear_rate_um_per_cycle?: number | null;
  current_wear_um?: number | null;
  eol_threshold_um?: number;
  rul_status?: string;
  health_status?: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  model?: string;
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

export interface CombinedInsight {
  category: string;
  title: string;
  narrative: string;
  confidence: string;
  recommended_action?: string;
}

export interface SensorDataInput {
  vibration_x?: number | null;
  vibration_y?: number | null;
  vibration_z?: number | null;
  vibration_rms?: number | null;
  vibration_peak?: number | null;
  temperature?: number | null;
  spindle_current?: number | null;
  spindle_power?: number | null;
  cutting_force?: number | null;
  acoustic_emission?: number | null;
  sound_level?: number | null;
  rpm?: number | null;
  feed_rate?: number | null;
  depth_of_cut?: number | null;
  source?: string;
}

export interface SensorReading {
  id?: number;
  reading_id: string;
  inspection_id?: string;
  tool_id: string;
  machine_id: string;
  timestamp: string;
  vibration: {
    x?: number | null;
    y?: number | null;
    z?: number | null;
    rms?: number | null;
    peak?: number | null;
    unit: string;
  };
  temperature: {
    value?: number | null;
    unit: string;
  };
  spindle_current: {
    value?: number | null;
    unit: string;
  };
  spindle_power: {
    value?: number | null;
    unit: string;
  };
  cutting_force: {
    value?: number | null;
    unit: string;
  };
  acoustic_emission: {
    value?: number | null;
    unit: string;
  };
  sound_level: {
    value?: number | null;
    unit: string;
  };
  process_parameters: {
    rpm?: number | null;
    feed_rate?: number | null;
    depth_of_cut?: number | null;
  };
  sensor_features?: Record<string, any>;
  source: string;
  status: string;
  created_at?: string;
}

export interface InspectionResult {
  success: boolean;
  inspection_id: string;
  input_mode?: string;
  tool_id?: string;
  tool_name?: string;
  tool_type?: string;
  machine_id?: string;
  operator_id?: string;
  timestamp?: string;
  tool_detection: ToolDetectionResult;
  wear_analysis: WearAnalysisResult;
  health_prediction: HealthPredictionResult;
  rul_prediction?: RULPredictionResult;
  sensor_results?: {
    available: boolean;
    data: SensorDataInput;
    source: string;
  };
  combined_insights?: CombinedInsight[];
  faces?: any;
  associations?: PersonToolAssociation[];
  tool_registry_match?: ToolRegistryMatchResult;
  annotated_image_base64?: string;
  images: {
    original?: string;
    annotated?: string;
    annotated_base64?: string;
    cropped_roi?: string;
  };
  performance: {
    latency_ms: number;
    device: string;
    stages_completed: string[];
  };
  error?: string;
}

export interface ToolRegistryMatchResult {
  matched: boolean;
  tool_id: string;
  tool_name: string;
  matched_registered_id?: string;
  similarity: number;
  similarity_percent: string;
  match_threshold?: number;
  match_status: 'CONFIRMED' | 'UNKNOWN_TOOL' | 'EMPTY_REGISTRY' | 'SKIPPED' | 'NO_CROP' | string;
  candidates?: Array<{
    tool_id: string;
    similarity: number;
    similarity_percent: string;
  }>;
  message?: string;
}

export interface ToolReferenceImage {
  id: number;
  file_name: string;
  image_path: string;
  angle_tag?: string;
  is_valid: boolean;
  created_at: string;
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
  rul?: RULPredictionResult;
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
  manufacturer?: string;
  part_number?: string;
  workpiece_material?: string;
  initial_condition?: string;
  machine_id: string;
  assigned_operator: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'RETIRED';
  current_wear_um: number;
  current_wear_vb_mm: number;
  current_rul_cycles?: number | null;
  current_wear_rate?: number | null;
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
    latest_rul_cycles?: number | null;
    latest_rul_unit?: string;
    avg_rul_cycles?: number | null;
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
  rul_cycles?: number | null;
  wear_rate?: number | null;
  status: string;
}

export interface RULSchemaResponse {
  success: boolean;
  feature_count: number;
  features: string[];
  categorical_features: string[];
  numerical_features: string[];
  category_mapping: Record<string, string[]>;
  target: string;
  target_unit: string;
  eol_threshold_um: number;
}

// --- Model 5: Manufacturing Insights Types ---
export interface ManufacturingInsightItem {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  tool_id?: string | null;
  machine_id?: string | null;
  title: string;
  message: string;
  data_evidence?: string;
}

export interface MachineComparisonItem {
  machine_id: string;
  name: string;
  status: string;
  total_inspections: number;
  avg_wear_um: number;
  critical_alerts: number;
}

export interface ToolComparisonItem {
  tool_id: string;
  tool_name: string;
  material: string;
  coating: string;
  machine_id: string;
  current_wear_um: number;
  current_wear_vb_mm: number;
  rul_cycles?: number | null;
  wear_rate?: number | null;
  status: string;
  total_inspections: number;
}

export interface ManufacturingInsightsReport {
  has_sufficient_data: boolean;
  summary: string;
  kpis: {
    total_tools: number;
    active_tools: number;
    tools_requiring_inspection: number;
    avg_wear_um: number | null;
    avg_health_score: number | null;
    avg_rul_cycles: number | null;
  };
  insights: ManufacturingInsightItem[];
  maintenance_candidates: ToolComparisonItem[];
  machine_comparison: MachineComparisonItem[];
  tool_comparison: ToolComparisonItem[];
  trends: {
    wear: Array<{ timestamp: string; tool_id: string; wear_um: number }>;
    health: Array<{ timestamp: string; tool_id: string; health_score: number }>;
    rul: Array<{ timestamp: string; tool_id: string; rul_cycles: number }>;
  };
}

// --- Model 7: Economic Impact Types ---
export interface EconomicParameters {
  tool_replacement_cost: number;
  machine_operating_cost_per_hour: number;
  downtime_cost_per_hour: number;
  maintenance_labor_cost_per_hour: number;
  average_unplanned_downtime_hours: number;
  planned_replacement_hours: number;
  production_value_per_hour: number;
  currency_symbol?: string;
}

export interface ToolCostItem {
  tool_id: string;
  tool_name: string;
  machine_id: string;
  status: string;
  replacement_cost: number;
  maintenance_cost: number;
  total_cost: number;
  data_type: 'ACTUAL' | 'ESTIMATED' | 'SIMULATED';
}

export interface EconomicImpactReport {
  currency: string;
  parameters: EconomicParameters;
  summary: {
    estimated_downtime_cost: {
      value: number;
      label: string;
      data_type: 'ACTUAL' | 'ESTIMATED' | 'SIMULATED';
      hours: number;
    };
    estimated_maintenance_cost: {
      value: number;
      label: string;
      data_type: 'ACTUAL' | 'ESTIMATED' | 'SIMULATED';
      hours: number;
    };
    estimated_potential_savings: {
      value: number;
      label: string;
      data_type: 'ACTUAL' | 'ESTIMATED' | 'SIMULATED';
      avoided_hours: number;
    };
    tool_replacement_expenditure: {
      value: number;
      label: string;
      data_type: 'ACTUAL' | 'ESTIMATED' | 'SIMULATED';
      tool_count: number;
    };
  };
  tool_cost_breakdown: ToolCostItem[];
  financial_trend: Array<{
    period: string;
    downtime_cost: number;
    maintenance_cost: number;
    potential_avoided_savings: number;
    data_type: string;
  }>;
  disclaimer: string;
}

// --- Model 8: Machine Downtime Avoided Types ---
export interface DowntimeEventItem {
  downtime_id: string;
  machine_id: string;
  tool_id: string;
  cause: string;
  is_unplanned: boolean;
  type_label: string;
  duration_hours: number;
  total_loss: number;
  estimated_avoided_hours: number;
  timestamp: string;
}

export interface MachineDowntimeItem {
  machine_id: string;
  machine_name: string;
  status: string;
  location: string;
  total_downtime_hours: number;
  unplanned_hours: number;
  planned_hours: number;
  estimated_avoided_hours: number;
  financial_loss: number;
}

export interface DowntimeReport {
  summary: {
    total_downtime_hours: number;
    planned_downtime_hours: number;
    unplanned_downtime_hours: number;
    estimated_downtime_avoided_hours: number;
    actual_downtime_cost: number;
    estimated_avoided_cost: number;
    total_events_count: number;
    currency: string;
  };
  machine_breakdown: MachineDowntimeItem[];
  events: DowntimeEventItem[];
  calculation_basis: {
    downtime_cost_per_hour: number;
    avg_unplanned_hours: number;
    planned_replacement_hours: number;
    label: string;
  };
}

// --- Model 9: Root Cause Types ---
export interface RootCauseFactor {
  feature: string;
  name: string;
  current_value: number;
  nominal_value: number;
  unit: string;
  deviation_percent: number;
  importance_score: number;
  relative_contribution_percent: number;
  influence: 'HIGH' | 'MODERATE' | 'LOW';
  observation: string;
}

export interface RootCauseReport {
  success: boolean;
  tool_id: string;
  tool_name: string;
  machine_id: string;
  workpiece_material: string;
  coating: string;
  current_wear_um: number;
  current_health_status: string;
  current_rul_cycles?: number | null;
  explanation: string;
  contributing_factors: RootCauseFactor[];
  disclaimer: string;
}

// --- Model 10: Process Parameter Optimization Types ---
export interface ProcessOptimizationParameters {
  n: number;   // Spindle Speed RPM
  fz: number;  // Feed rate mm/tooth
  Ap: number;  // Depth of cut mm
}

export interface ExpectedImpact {
  current_wear_rate_um_per_cycle: number;
  recommended_wear_rate_um_per_cycle: number;
  estimated_wear_reduction_percent: number;
  current_mrr: number;
  recommended_mrr: number;
  estimated_mrr_change_percent: number;
  current_projected_rul_cycles: number;
  recommended_projected_rul_cycles: number;
  estimated_cycle_life_gain: number;
  provenance: string;
}

export interface ProcessOptimizationResult {
  success: boolean;
  optimization_id: string;
  timestamp: string;
  tool_id: string;
  tool_name: string;
  machine_id: string;
  material: string;
  objective: 'MAXIMIZE_TOOL_LIFE' | 'MAXIMIZE_PRODUCTIVITY' | 'BALANCED' | string;
  current_parameters: ProcessOptimizationParameters;
  recommended_parameters: ProcessOptimizationParameters;
  expected_impact: ExpectedImpact;
  optimization_score?: number;
  ranked_candidates_count?: number;
  explanation: string;
  status: string;
  safety_notice: string;
}

export interface ProcessOptimizationRecord {
  id: number;
  optimization_id: string;
  timestamp: string;
  tool_id: string;
  tool_name: string;
  machine_id: string;
  material: string;
  objective: string;
  current_parameters: ProcessOptimizationParameters;
  recommended_parameters: ProcessOptimizationParameters;
  expected_impact?: ExpectedImpact;
  optimization_score?: number;
  status: string;
  explanation?: string;
  approved_by_operator: boolean;
  applied: boolean;
  created_at: string;
}

export interface PipelineTestResponse {
  success: boolean;
  pipeline: string;
  tool_id: string;
  tool_eligibility: string;
  total_latency_ms: number;
  stages: {
    model_1_tool_detection: {
      detected: boolean;
      class_name: string;
      confidence: number;
      is_supported: boolean;
      latency_ms: number;
    };
    model_2_wear_analysis: {
      status: string;
      wear_um: number | null;
      wear_value_mm: number | null;
      wear_status?: string;
      latency_ms: number;
    };
    model_3_health_prediction: {
      status: string;
      health_score: number | null;
      health_status: string;
      recommended_action?: string;
      latency_ms: number;
    };
    model_6_rul_prediction: {
      rul_cycles: number | null;
      wear_rate: number | null;
      rul_status: string;
      latency_ms: number;
    };
  };
}

export interface OptimizationConstraintsResponse {
  success: boolean;
  constraints: {
    parameter_bounds: {
      spindle_speed_rpm: { min: number; max: number; default: number; unit: string };
      feed_rate_fz: { min: number; max: number; default: number; unit: string };
      depth_of_cut_ap: { min: number; max: number; default: number; unit: string };
    };
    hard_limits: {
      max_tool_wear_um: number;
      iso_critical_limit_um: number;
      min_rul_cycles: number;
    };
    supported_objectives: Array<{
      id: string;
      label: string;
      description: string;
    }>;
    supported_materials: string[];
    supported_machines: string[];
  };
}



