import axios from 'axios';
import {
  InspectionResult,
  Tool,
  AlertItem,
  FaceDetectionResponse,
  FaceVerificationResponse,
  Operator,
  ModelsStatusResponse,
  SystemStatusResponse,
  AnalyticsOverview,
  WearTrendPoint,
  WebcamFrameResult,
} from '../types/api';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
});

// --- Inspection API ---
export const analyzeInspectionImage = async (
  file: File,
  toolId?: string,
  machineId: string = 'CNC-01',
  operatorId: string = 'OP-DEFAULT'
): Promise<InspectionResult> => {
  const formData = new FormData();
  formData.append('image', file);
  if (toolId) formData.append('tool_id', toolId);
  formData.append('machine_id', machineId);
  formData.append('operator_id', operatorId);

  const response = await apiClient.post<InspectionResult>('/inspection/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getInspectionRecords = async (skip: number = 0, limit: number = 50): Promise<{ count: number; inspections: InspectionResult[] }> => {
  const response = await apiClient.get('/inspection/records', { params: { skip, limit } });
  return response.data;
};

export const getInspectionDetail = async (id: string): Promise<{ inspection: InspectionResult }> => {
  const response = await apiClient.get(`/inspection/records/${id}`);
  return response.data;
};

// --- Live Webcam API ---
export const analyzeWebcamFrame = async (
  frameBlob: Blob,
  toolId: string = 'TL-CNMG-120408',
  runDeepWear: boolean = true
): Promise<WebcamFrameResult> => {
  const formData = new FormData();
  formData.append('file', frameBlob, 'webcam_frame.jpg');
  formData.append('tool_id', toolId);
  formData.append('run_deep_wear', String(runDeepWear));

  const response = await apiClient.post<WebcamFrameResult>('/webcam/frame', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// --- Tools API ---
export const getTools = async (): Promise<Tool[]> => {
  const response = await apiClient.get<{ success: boolean; count: number; tools: Tool[] }>('/tools');
  return response.data.tools;
};

export const createTool = async (toolData: Partial<Tool>): Promise<Tool> => {
  const response = await apiClient.post<{ tool: Tool }>('/tools', toolData);
  return response.data.tool;
};

export const updateTool = async (toolId: string, toolData: Partial<Tool>): Promise<Tool> => {
  const response = await apiClient.put<{ tool: Tool }>(`/tools/${toolId}`, toolData);
  return response.data.tool;
};

export const deleteTool = async (toolId: string): Promise<boolean> => {
  const response = await apiClient.delete(`/tools/${toolId}`);
  return response.data.success;
};

// --- Analytics API ---
export const getAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const response = await apiClient.get<AnalyticsOverview>('/analytics/overview');
  return response.data;
};

export const getWearTrend = async (): Promise<WearTrendPoint[]> => {
  const response = await apiClient.get<{ data: WearTrendPoint[] }>('/analytics/wear-trend');
  return response.data.data;
};

export const getHealthDistribution = async (): Promise<{ distribution: { name: string; count: number; color: string }[]; total: number }> => {
  const response = await apiClient.get('/analytics/health-distribution');
  return response.data;
};

// --- Alerts API ---
export const getAlerts = async (acknowledged?: boolean): Promise<AlertItem[]> => {
  const response = await apiClient.get<{ alerts: AlertItem[] }>('/alerts', {
    params: acknowledged !== undefined ? { acknowledged } : {},
  });
  return response.data.alerts;
};

export const acknowledgeAlert = async (alertId: string): Promise<AlertItem> => {
  const response = await apiClient.post<{ alert: AlertItem }>(`/alerts/${alertId}/acknowledge`);
  return response.data.alert;
};

// --- AI Models & Diagnostics API ---
export const getModelsStatus = async (): Promise<ModelsStatusResponse> => {
  const response = await apiClient.get<ModelsStatusResponse>('/models/status');
  return response.data;
};

export const runModelsDiagnostics = async (): Promise<any> => {
  const response = await apiClient.post('/models/diagnostics');
  return response.data;
};

// --- Face Detection API ---
export const detectOperatorFace = async (file: File): Promise<FaceDetectionResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<FaceDetectionResponse>('/face/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const registerOperatorFace = async (name: string, file: File, operatorId?: string): Promise<any> => {
  const formData = new FormData();
  formData.append('operator_name', name);
  formData.append('image', file);
  if (operatorId) formData.append('operator_id', operatorId);

  const response = await apiClient.post('/face/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const verifyOperatorFace = async (file: File): Promise<FaceVerificationResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<FaceVerificationResponse>('/face/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getRegisteredOperators = async (): Promise<Operator[]> => {
  const response = await apiClient.get<{ operators: Operator[] }>('/face/operators');
  return response.data.operators;
};

// --- System Status API ---
export const getSystemStatus = async (): Promise<SystemStatusResponse> => {
  const response = await apiClient.get<SystemStatusResponse>('/system/status');
  return response.data;
};
