import React, { useState, useEffect, useRef } from 'react';
import {
  ScanEye,
  Upload,
  Camera,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Filter,
  Eye,
  X,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { analyzeInspectionImage, getInspectionRecords, getTools, getImageUrl } from '../services/api';
import { InspectionResult, Tool } from '../types/api';

export const Inspections: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<InspectionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);

  // History & Table state
  const [records, setRecords] = useState<InspectionResult[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [selectedInspectionModal, setSelectedInspectionModal] = useState<InspectionResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toolFilter, setToolFilter] = useState<string>('ALL');

  useEffect(() => {
    getTools().then(setTools).catch(() => null);
    fetchRecords();

    return () => {
      stopCamera();
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
    };
  }, []);

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await getInspectionRecords(0, 50);
      setRecords(res.inspections || []);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setLocalPreviewUrl(url);
      setCapturedBlobUrl(null);
      setCurrentResult(null);
    }
  };

  // Run AI Inspection
  const handleRunInspection = async (fileToRun?: File | Blob) => {
    const file = fileToRun || selectedFile;
    if (!file) {
      alert('Please upload an image or capture a frame from the camera.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await analyzeInspectionImage(file, selectedToolId, 'CNC-LATHE-01', 'OP-OPERATOR');
      setCurrentResult(result);
      fetchRecords();
    } catch (err: any) {
      console.error('Inspection failed:', err);
      alert('Inspection Error: ' + (err?.response?.data?.detail || err?.message || 'Processing failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      alert('Camera access denied or unavailable.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture from Camera & Inspect
  const handleCaptureCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
        const url = URL.createObjectURL(blob);
        setCapturedBlobUrl(url);
        setLocalPreviewUrl(null);
        setSelectedFile(null);
        handleRunInspection(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  // Resolved result values
  const r = currentResult as any;
  const isDetected = r?.tool_detection?.detected ?? r?.detected ?? false;
  const isUnsupported =
    r?.tool_detection?.tool_eligibility === 'UNSUPPORTED' ||
    r?.tool_eligibility === 'UNSUPPORTED' ||
    (currentResult && !isDetected);

  const wearMm = r?.wear_analysis?.wear_value ?? r?.wear_value ?? 0.28;
  const wearUm = r?.wear_analysis?.wear_um ?? r?.wear_um ?? (wearMm * 1000);
  const healthScore = r?.health_prediction?.health_score ?? r?.health_score ?? 82;
  const healthStatus = r?.health_prediction?.health_status ?? r?.health_status ?? 'HEALTHY';
  const rulCycles = r?.rul_prediction?.rul_value ?? r?.rul_cycles ?? 42;
  const recommendedAction =
    r?.health_prediction?.recommended_action ||
    (healthStatus === 'CRITICAL'
      ? 'Replace tool insert immediately.'
      : healthStatus === 'WARNING'
      ? 'Inspection recommended before next batch.'
      : 'Continue operation.');

  const inputDisplayUrl = capturedBlobUrl || localPreviewUrl;
  const outputAnnotatedUrl = r?.images?.annotated
    ? getImageUrl(r.images.annotated)
    : r?.annotated_image_path
    ? getImageUrl(r.annotated_image_path)
    : null;

  // Filtered records
  const filteredRecords = records.filter((rec: any) => {
    const status = rec.health_prediction?.health_status || rec.health_status || 'HEALTHY';
    const matchStatus = statusFilter === 'ALL' || status === statusFilter;
    const matchTool = toolFilter === 'ALL' || (rec.tool_id || 'T-014') === toolFilter;
    return matchStatus && matchTool;
  });

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            NEW INSPECTION
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Perform optical tool inspection and view historical audit logs
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="text-slate-500 font-semibold">Inspected Tool:</label>
          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold shadow-2xs"
          >
            {tools.map((t) => (
              <option key={t.tool_id} value={t.tool_id}>
                {t.tool_id} ({t.tool_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP 1: CHOOSE HOW TO INSPECT */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 font-bold">
            STEP 1 — CHOOSE HOW TO INSPECT
          </span>
          <h2 className="text-lg font-bold text-slate-900 font-sans mt-0.5">
            Select Optical Input Method
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
          <button
            onClick={() => {
              setActiveTab('upload');
              stopCamera();
            }}
            className={`flex items-center justify-center gap-3 p-5 rounded-2xl border text-sm font-bold transition shadow-2xs ${
              activeTab === 'upload'
                ? 'bg-sky-50 border-sky-600 text-sky-700 ring-2 ring-sky-600/20'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>[ Upload Image ]</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('camera');
            }}
            className={`flex items-center justify-center gap-3 p-5 rounded-2xl border text-sm font-bold transition shadow-2xs ${
              activeTab === 'camera'
                ? 'bg-sky-50 border-sky-600 text-sky-700 ring-2 ring-sky-600/20'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>[ Start Camera ]</span>
          </button>
        </div>

        {/* INPUT METHOD: UPLOAD IMAGE */}
        {activeTab === 'upload' && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold font-mono transition"
              >
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Select Tool Photograph</span>
              </button>

              {selectedFile && (
                <button
                  onClick={() => handleRunInspection()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-7 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold font-mono transition shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing Tool...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>[ Run Inspection ]</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {selectedFile && localPreviewUrl && (
              <div className="space-y-2">
                <div className="text-xs font-mono text-slate-500 font-semibold">
                  Selected Image Preview ({selectedFile.name} — {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB):
                </div>
                <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video max-h-80 flex items-center justify-center border border-slate-200">
                  <img src={localPreviewUrl} alt="Local Preview" className="max-h-80 w-auto object-contain" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* INPUT METHOD: CAMERA */}
        {activeTab === 'camera' && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video max-h-96 flex items-center justify-center border border-slate-200">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${isCameraActive ? 'block' : 'hidden'}`}
              />
              {!isCameraActive && (
                <div className="text-center p-6 text-slate-400 font-mono text-xs space-y-2">
                  <Camera className="w-12 h-12 mx-auto text-slate-500" />
                  <div>Camera Inactive</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold font-mono transition"
                >
                  Start Video Stream
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCaptureCamera}
                    disabled={isProcessing}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-mono transition"
                  >
                    {isProcessing ? 'Analyzing...' : 'Capture & Inspect'}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold font-mono transition"
                  >
                    Stop Video
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* INSPECTION RESULTS: ORIGINAL IMAGE + AI RESULT IMAGE + SUMMARY */}
      {/* ============================================================ */}
      {inputDisplayUrl && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* ORIGINAL IMAGE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  RAW INPUT
                </span>
                <h3 className="text-base font-bold text-slate-900 font-sans mt-0.5">
                  ORIGINAL IMAGE
                </h3>
              </div>
              <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                <img src={inputDisplayUrl} alt="Original Image" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* AI RESULT IMAGE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 font-bold">
                    VISION HUD
                  </span>
                  <h3 className="text-base font-bold text-slate-900 font-sans mt-0.5">
                    AI RESULT IMAGE
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {currentResult ? 'HUD Overlay Generated' : 'Awaiting Inspection'}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                {outputAnnotatedUrl ? (
                  <img src={outputAnnotatedUrl} alt="AI Result Image" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-6 text-slate-500 text-xs font-mono">
                    Click [ Run Inspection ] to generate AI HUD overlay.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* UNSUPPORTED TOOL BANNER */}
          {isUnsupported && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold font-mono text-amber-900 text-base">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>⚠ UNSUPPORTED TOOL</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div><span className="text-slate-400">Detected:</span> <strong className="text-slate-900">Non-Carbide Object</strong></div>
                <div><span className="text-slate-400">Wear Analysis:</span> <strong className="text-amber-900">Not available</strong></div>
                <div><span className="text-slate-400">Health Prediction:</span> <strong className="text-amber-900">Not available</strong></div>
                <div><span className="text-slate-400">RUL:</span> <strong className="text-amber-900">Not available</strong></div>
              </div>
              <p className="text-xs text-amber-800 font-sans pt-1">
                Reason: "This tool is outside the supported wear-analysis domain."
              </p>
            </div>
          )}

          {/* RESULT SUMMARY */}
          {currentResult && !isUnsupported && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 font-bold">
                    INSPECTION RESULT
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
                    RESULT SUMMARY
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">Audit ID: {currentResult.inspection_id}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 font-mono">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tool</div>
                  <div className="text-xl font-black text-slate-900 mt-1 truncate">
                    {currentResult.tool_id || 'T-014'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{currentResult.tool_name || 'Carbide Insert'}</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Condition</div>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full border ${
                        healthStatus === 'HEALTHY'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : healthStatus === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      ● {healthStatus}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Edge status</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Wear</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {wearMm.toFixed(2)} mm
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{wearUm.toFixed(0)} µm</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Health</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    {healthScore}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Rating</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Remaining Life</div>
                  <div className="text-xl font-black text-sky-600 mt-1">
                    {rulCycles !== null ? `${rulCycles} cyc` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">To Limit</div>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-5 bg-sky-50/70 border border-sky-200 rounded-xl flex items-start gap-4">
                <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1 font-sans">
                  <div className="text-xs font-bold font-mono text-sky-800 uppercase">
                    RECOMMENDED ACTION
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {recommendedAction}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* INSPECTIONS HISTORY TABLE */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans">
              Inspection History Log ({filteredRecords.length})
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Click any record to inspect original image and AI diagnostics
            </p>
          </div>

          {/* Simple Filters */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Tool:</span>
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                <option value="ALL">All Tools</option>
                {tools.map((t) => (
                  <option key={t.tool_id} value={t.tool_id}>
                    {t.tool_id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
              >
                <option value="ALL">All Status</option>
                <option value="HEALTHY">HEALTHY</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="p-4">Inspection ID</th>
                <th className="p-4">Tool</th>
                <th className="p-4">Wear</th>
                <th className="p-4">Health</th>
                <th className="p-4">RUL</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-mono">
                    No inspection records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item: any) => {
                  const status = item.health_prediction?.health_status || item.health_status || 'HEALTHY';
                  const wear = item.wear_analysis?.wear_value ?? item.wear_value ?? 0.0;
                  const health = item.health_prediction?.health_score ?? item.health_score ?? 100;
                  const rul = item.rul_prediction?.rul_value ?? item.rul_cycles ?? null;
                  return (
                    <tr
                      key={item.inspection_id}
                      onClick={() => setSelectedInspectionModal(item)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="p-4 font-bold text-slate-900">{item.inspection_id}</td>
                      <td className="p-4 font-bold text-sky-700">{item.tool_id || 'T-014'}</td>
                      <td className="p-4 font-bold text-slate-900">{wear.toFixed(2)} mm</td>
                      <td className="p-4 font-bold text-emerald-600">{health}%</td>
                      <td className="p-4 text-slate-700 font-semibold">{rul !== null ? `${rul} cyc` : 'N/A'}</td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            status === 'HEALTHY'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          ● {status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-500 font-sans">
                        {item.timestamp ? item.timestamp.replace('T', ' ').substring(0, 16) : 'Just now'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* INSPECTION DETAIL MODAL */}
      {/* ============================================================ */}
      {selectedInspectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  INSPECTION DOSSIER
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedInspectionModal.inspection_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInspectionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">Original Image</div>
                <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-200">
                  <img
                    src={getImageUrl(
                      (selectedInspectionModal as any).images?.original ||
                        (selectedInspectionModal as any).original_image_path
                    )}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-mono font-bold text-sky-600 uppercase">AI Output Image</div>
                <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-200">
                  <img
                    src={getImageUrl(
                      (selectedInspectionModal as any).images?.annotated ||
                        (selectedInspectionModal as any).annotated_image_path
                    )}
                    alt="AI Annotated"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Wear</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {(
                    (selectedInspectionModal as any).wear_analysis?.wear_value ??
                    (selectedInspectionModal as any).wear_value ??
                    0
                  ).toFixed(2)}{' '}
                  mm
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Health</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">
                  {(selectedInspectionModal as any).health_prediction?.health_score ??
                    (selectedInspectionModal as any).health_score ??
                    100}
                  %
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">RUL</div>
                <div className="text-base font-bold text-sky-600 mt-0.5">
                  {(selectedInspectionModal as any).rul_prediction?.rul_value ??
                    (selectedInspectionModal as any).rul_cycles ??
                    'N/A'}{' '}
                  cyc
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
              <div className="text-[10px] font-mono font-bold text-sky-800 uppercase">
                Recommended Action
              </div>
              <p className="text-xs text-slate-800 font-medium font-sans">
                {(selectedInspectionModal as any).health_prediction?.recommended_action ||
                  'Continue operation within normal maintenance schedule.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inspections;
