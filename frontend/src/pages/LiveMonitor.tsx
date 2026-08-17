import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Cpu,
  Layers,
  RefreshCw,
  Scan,
  Upload,
  User,
  Wrench,
  Zap,
  Shield,
} from 'lucide-react';
import { analyzeInspectionImage, getTools } from '../services/api';
import { InspectionResult, Tool, WebcamFrameResult } from '../types/api';
import { WebcamStreamView } from '../components/live-monitor/WebcamStreamView';

export const LiveMonitor: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'webcam' | 'upload'>('webcam');
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');

  // Upload Mode State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<InspectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Webcam telemetry state
  const [liveTelemetry, setLiveTelemetry] = useState<WebcamFrameResult | null>(null);

  useEffect(() => {
    const fetchToolsList = async () => {
      try {
        const list = await getTools();
        setTools(list || []);
        if (list && list.length > 0) {
          setSelectedToolId(list[0].tool_id);
        }
      } catch (err) {
        console.error('Failed to load tools:', err);
      }
    };
    fetchToolsList();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadResult(null);
      setError(null);
    }
  };

  const handleRunUploadInference = async () => {
    if (!selectedFile) {
      setError('No tool image selected. Please upload an image first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const data = await analyzeInspectionImage(selectedFile, selectedToolId, 'CNC-LATHE-01', 'OP-MONITOR');
      setUploadResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Inspection inference failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Selected result based on active mode
  const currentAssoc = activeMode === 'webcam'
    ? (liveTelemetry?.associations && liveTelemetry.associations.length > 0 ? liveTelemetry.associations[0] : null)
    : (uploadResult?.associations && uploadResult.associations.length > 0 ? uploadResult.associations[0] : null);

  const currentToolDetected = activeMode === 'webcam'
    ? liveTelemetry?.tool_detected ?? false
    : uploadResult?.tool_detection?.detected ?? false;

  const currentWearValue = activeMode === 'webcam'
    ? liveTelemetry?.wear?.wear_value
    : uploadResult?.wear_analysis?.wear_value;

  const currentHealthStatus = activeMode === 'webcam'
    ? liveTelemetry?.health?.health_status
    : uploadResult?.health_prediction?.health_status;

  const currentOperator = activeMode === 'webcam'
    ? liveTelemetry?.operator?.identity
    : uploadResult?.operator_id;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-600" />
            Live Tool Wear & Person Association Monitor
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-Time Optical Vision Stream, Person ↔ Tool Spatial Interaction & Multi-Stage Diagnostics
          </p>
        </div>

        {/* Mode Toggle & Tool Selection */}
        <div className="flex items-center gap-3">
          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 shadow-2xs font-semibold"
          >
            {tools.map((t) => (
              <option key={t.tool_id} value={t.tool_id}>
                {t.tool_id} ({t.tool_name})
              </option>
            ))}
          </select>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs">
            <button
              onClick={() => setActiveMode('webcam')}
              className={`px-3 py-1 rounded-md font-bold transition ${
                activeMode === 'webcam'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              LIVE WEBCAM
            </button>
            <button
              onClick={() => setActiveMode('upload')}
              className={`px-3 py-1 rounded-md font-bold transition ${
                activeMode === 'upload'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              UPLOAD IMAGE
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Video / Upload Stream */}
        <div className="lg:col-span-7 space-y-4">
          {activeMode === 'webcam' ? (
            <WebcamStreamView
              selectedToolId={selectedToolId}
              onFrameAnalyzed={(res) => setLiveTelemetry(res)}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-mono font-bold uppercase text-slate-800">
                    Static Tool Image Vision Analysis
                  </span>
                </div>
                <span className="text-[10px] font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                  SINGLE SHOT
                </span>
              </div>

              {/* Viewer Canvas */}
              <div className="w-full aspect-[4/3] bg-slate-100 rounded-lg border border-slate-300 relative overflow-hidden flex items-center justify-center bg-grid-white shadow-inner">
                {uploadResult && uploadResult.images.annotated ? (
                  <img
                    src={uploadResult.images.annotated}
                    alt="Annotated Inspection Result"
                    className="w-full h-full object-contain"
                  />
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-6 text-slate-400 font-mono text-xs space-y-3">
                    <Scan className="w-12 h-12 mx-auto text-slate-400" />
                    <div className="font-semibold text-slate-600">No Image Uploaded</div>
                    <div className="text-[11px] text-slate-400">
                      Upload an industrial cutting tool photograph to perform multi-stage analysis.
                    </div>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
                    <div className="text-xs font-mono text-sky-800 font-bold">ANALYZING TOOL DEGRADATION...</div>
                    <div className="text-[10px] text-slate-500 font-mono">Running YOLO11n + EfficientNet-B0 Pipeline</div>
                  </div>
                )}
              </div>

              {/* Upload Action Bar */}
              <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition"
                >
                  <Upload className="w-4 h-4 text-sky-600" />
                  SELECT IMAGE
                </button>

                <button
                  onClick={handleRunUploadInference}
                  disabled={!selectedFile || isAnalyzing}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-mono font-bold tracking-wide transition shadow-xs"
                >
                  <Zap className="w-4 h-4" />
                  ANALYZE WEAR & HEALTH
                </button>
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-mono text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (5 Cols): Live Association & Wear Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Person + Tool Spatial Association */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold uppercase text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                Person ↔ Tool Association
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">SPATIAL VISION</span>
            </div>

            {currentAssoc ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">IDENTIFIED PERSON</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {currentAssoc.person}
                    </div>
                    <div className="text-[10px] text-slate-500">{currentAssoc.operator_id}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        currentAssoc.relationship === 'HOLDING'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : currentAssoc.relationship === 'NEAR'
                          ? 'bg-sky-100 text-sky-700 border border-sky-200'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {currentAssoc.relationship}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Conf: {(currentAssoc.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Visual Evidence: </span>
                  {currentAssoc.evidence || 'Bounding box proximity detected within operator workspace'}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                Awaiting active person / tool in camera field of view...
              </div>
            )}
          </div>

          {/* Card 2: Controlled PPE Inspection Status */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold uppercase text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Industrial PPE Safety Monitoring
              </span>
              <span className="text-[10px] text-slate-400">COMPLIANCE</span>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Safety Helmet', note: 'Model unavailable (Requires dedicated PPE checkpoint)' },
                { name: 'Safety Glasses', note: 'Model unavailable (Requires dedicated PPE checkpoint)' },
                { name: 'Industrial Gloves', note: 'Model unavailable (Requires dedicated PPE checkpoint)' },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-[10px] text-slate-500 italic bg-slate-200/70 px-2 py-0.5 rounded">
                    {item.note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Wear & Health Telemetry */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold uppercase text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Wear Assessment & Health State
              </span>
              <span className="text-[10px] text-slate-400">384x384 ROI</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">FLANK WEAR (VB)</div>
                <div className="text-xl font-bold text-sky-600 mt-1">
                  {currentWearValue !== undefined && currentToolDetected ? `${currentWearValue.toFixed(3)} mm` : '-'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">TOOL CONDITION</div>
                <div className="mt-1">
                  <span
                    className={`px-2 py-0.5 text-xs rounded font-bold ${
                      currentHealthStatus === 'HEALTHY'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : currentHealthStatus === 'WARNING'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : currentHealthStatus === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {currentHealthStatus || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
