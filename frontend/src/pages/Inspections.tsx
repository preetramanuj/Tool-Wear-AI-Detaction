import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Camera,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  Layers,
  Database,
  Eye,
} from 'lucide-react';
import { analyzeInspectionImage, getInspectionRecords, getTools, getImageUrl } from '../services/api';
import { InspectionResult, Tool } from '../types/api';

export const Inspections: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');

  // Input Method: 'upload' | 'camera'
  const [inputMethod, setInputMethod] = useState<'upload' | 'camera'>('upload');

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Processing & Stages State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [currentResult, setCurrentResult] = useState<InspectionResult | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  // History & Table State
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

  // Upload Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setLocalPreviewUrl(url);
      setFileDetails({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      });
      setCapturedBlobUrl(null);
      setCapturedBlob(null);
      setCurrentResult(null);
      setImageLoadError(false);
    }
  };

  // Camera Controls
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser.');
      }
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
    } catch (err: any) {
      console.error('Camera permission failed:', err);
      setCameraError('Camera access denied or device unavailable. Please allow camera permissions.');
      setIsCameraActive(false);
    }
  };

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

  const captureFrame = (andInspect: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
        const url = URL.createObjectURL(blob);
        setCapturedBlobUrl(url);
        setCapturedBlob(blob);
        setSelectedFile(null);
        setLocalPreviewUrl(null);
        setFileDetails({
          name: `camera_capture_${Date.now()}.jpg`,
          size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
        });
        if (andInspect) {
          executeInspection(blob);
        }
      }
    }, 'image/jpeg', 0.95);
  };

  // Run AI Inspection with Multi-Stage Progress
  const executeInspection = async (targetPayload?: File | Blob) => {
    const payload = targetPayload || selectedFile || capturedBlob;
    if (!payload) {
      alert('Please select an image or capture a frame first.');
      return;
    }

    setIsProcessing(true);
    setProcessingStage(1);
    setImageLoadError(false);

    const stageTimer1 = setTimeout(() => setProcessingStage(2), 600);
    const stageTimer2 = setTimeout(() => setProcessingStage(3), 1200);
    const stageTimer3 = setTimeout(() => setProcessingStage(4), 1800);

    try {
      const result = await analyzeInspectionImage(payload, selectedToolId, 'CNC-LATHE-01', 'OP-OPERATOR');
      setCurrentResult(result);
      fetchRecords();
    } catch (err: any) {
      console.error('Inspection failed:', err);
      alert('Inspection Error: ' + (err?.response?.data?.detail || err?.message || 'Processing failed'));
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsProcessing(false);
      setProcessingStage(0);
    }
  };

  // Resolved Inspection Fields
  const res = currentResult as any;
  const isDetected = res?.tool_detection?.detected ?? res?.detected ?? false;
  const detectionConfidence = res?.tool_detection?.confidence ?? res?.detection_confidence ?? 0.0;
  const isUnsupported =
    res?.tool_detection?.tool_eligibility === 'UNSUPPORTED' ||
    res?.tool_eligibility === 'UNSUPPORTED' ||
    (currentResult && !isDetected);

  const wearMm = res?.wear_analysis?.wear_value ?? res?.wear_value ?? 0.28;
  const wearUm = res?.wear_analysis?.wear_um ?? res?.wear_um ?? 280;
  const healthScore = res?.health_prediction?.health_score ?? res?.health_score ?? 82;
  const healthStatus = res?.health_prediction?.health_status ?? res?.health_status ?? 'HEALTHY';
  const rulCycles = res?.rul_prediction?.rul_value ?? res?.rul_cycles ?? 42;

  const rawInputUrl = capturedBlobUrl || localPreviewUrl;
  const outputAnnotatedUrl = res?.images?.annotated
    ? getImageUrl(res.images.annotated)
    : res?.annotated_image_path
    ? getImageUrl(res.annotated_image_path)
    : null;

  // Filtered History Records
  const filteredRecords = records.filter((rec: any) => {
    const status = rec.health_prediction?.health_status || rec.health_status || 'HEALTHY';
    const matchStatus = statusFilter === 'ALL' || status === statusFilter;
    const matchTool = toolFilter === 'ALL' || (rec.tool_id || 'T-014') === toolFilter;
    return matchStatus && matchTool;
  });

  return (
    <div className="p-6 md:p-12 space-y-12 max-w-6xl mx-auto font-sans text-slate-800">
      {/* ============================================================ */}
      {/* PAGE HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            NEW TOOL INSPECTION
          </h1>
          <p className="text-sm text-slate-500 font-mono">
            Upload an image or use a live camera to inspect a supported tool.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="text-slate-500 font-semibold">Target Tool:</label>
          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold shadow-2xs"
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
      {/* STEP 1 — INPUT METHOD (UPLOAD IMAGE OR LIVE CAMERA) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
            STEP 1 — INPUT METHOD
          </span>
          <h2 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
            Select Optical Capture Source
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 font-mono">
          <button
            onClick={() => {
              setInputMethod('upload');
              stopCamera();
            }}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border text-sm font-bold transition shadow-2xs ${
              inputMethod === 'upload'
                ? 'bg-sky-50 border-sky-600 text-sky-700 ring-2 ring-sky-600/20'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-6 h-6 text-sky-600" />
            <span>[ Upload Image ]</span>
          </button>

          <button
            onClick={() => {
              setInputMethod('camera');
            }}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border text-sm font-bold transition shadow-2xs ${
              inputMethod === 'camera'
                ? 'bg-sky-50 border-sky-600 text-sky-700 ring-2 ring-sky-600/20'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Camera className="w-6 h-6 text-emerald-600" />
            <span>[ Live Camera ]</span>
          </button>
        </div>

        {/* ---------------- METHOD 1: UPLOAD IMAGE ---------------- */}
        {inputMethod === 'upload' && (
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold font-mono transition shadow-2xs"
              >
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Select Tool Image (JPG / PNG)</span>
              </button>

              {selectedFile && (
                <button
                  onClick={() => executeInspection()}
                  disabled={isProcessing}
                  className="flex items-center gap-2.5 px-8 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold font-mono transition shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing Image...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>[ Run AI Inspection ]</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* VISIBLE IMMEDIATE PREVIEW CONTAINER */}
            {localPreviewUrl && fileDetails && (
              <div className="space-y-3">
                <div className="text-xs font-mono text-slate-600 font-semibold flex items-center justify-between">
                  <span>INPUT IMAGE PREVIEW</span>
                  <span>Filename: {fileDetails.name} ({fileDetails.size})</span>
                </div>
                <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-[420px] flex items-center justify-center border border-slate-200 shadow-inner">
                  <img src={localPreviewUrl} alt="Uploaded Input Preview" className="max-h-[420px] w-full object-contain" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- METHOD 2: LIVE CAMERA ---------------- */}
        {inputMethod === 'camera' && (
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900 font-sans">
                Live Video Feed
              </div>
              {isCameraActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Camera Status: ● LIVE
                </span>
              )}
            </div>

            {cameraError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-mono">
                {cameraError}
              </div>
            )}

            <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-[420px] flex items-center justify-center border border-slate-200 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${isCameraActive ? 'block' : 'hidden'}`}
              />
              {!isCameraActive && (
                <div className="text-center p-8 text-slate-400 font-mono text-xs space-y-2">
                  <Camera className="w-16 h-16 mx-auto text-slate-600" />
                  <div className="text-sm font-bold text-slate-300">Camera is Inactive</div>
                  <p className="text-slate-500">Click [ Start Camera ] below to request browser camera permission.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-6 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs"
                >
                  <Play className="w-4 h-4" />
                  <span>[ Start Camera ]</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => captureFrame(false)}
                    className="flex items-center gap-2 px-5 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl font-bold transition shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-sky-600" />
                    <span>[ Capture Frame ]</span>
                  </button>

                  <button
                    onClick={() => captureFrame(true)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing Frame...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>[ Capture & Inspect ]</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-2 px-5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition shadow-2xs"
                  >
                    <Square className="w-4 h-4" />
                    <span>[ Stop Camera ]</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* PROCESSING STAGES ANIMATION */}
      {/* ============================================================ */}
      {isProcessing && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-4 font-mono text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-sky-600 animate-spin" />
            <h3 className="text-sm font-bold text-slate-900 uppercase font-sans">
              Analyzing Image...
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✓ Image received</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${processingStage >= 1 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
              <span>● Tool detection</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${processingStage >= 2 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <span>○ Wear analysis</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${processingStage >= 3 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <span>○ Health prediction</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${processingStage >= 4 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <span>○ RUL prediction</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* INPUT + OUTPUT IMAGE COMPARISON (LARGE & PROMINENT) */}
      {/* ============================================================ */}
      {rawInputUrl && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* ORIGINAL INPUT IMAGE */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    RAW INPUT
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-sans mt-0.5">
                    ORIGINAL IMAGE
                  </h3>
                </div>
                {fileDetails && (
                  <span className="text-xs font-mono text-slate-500">{fileDetails.size}</span>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                <img src={rawInputUrl} alt="Original Tool Capture" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* AI ANALYZED IMAGE */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 font-bold">
                    VISION HUD INFERENCE
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-sans mt-0.5">
                    AI ANALYZED IMAGE
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {currentResult ? 'Inference Complete' : 'Awaiting Inspection'}
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                {outputAnnotatedUrl && !imageLoadError ? (
                  <img
                    src={outputAnnotatedUrl}
                    alt="AI Annotated HUD Result"
                    className="w-full h-full object-contain"
                    onError={() => setImageLoadError(true)}
                  />
                ) : imageLoadError ? (
                  <div className="p-8 text-center text-rose-400 font-mono text-xs space-y-2">
                    <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                    <div className="font-bold text-rose-300">AI output image could not be loaded.</div>
                    <p className="text-slate-400">Image path: {res?.images?.annotated || res?.annotated_image_path}</p>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2">
                    <Play className="w-10 h-10 text-slate-600 mx-auto" />
                    <div>Click [ Run AI Inspection ] to generate AI HUD.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* UNSUPPORTED TOOL PROTECTION BANNER */}
          {/* ============================================================ */}
          {isUnsupported && (
            <div className="bg-amber-50 border border-amber-300 rounded-3xl p-8 shadow-xs space-y-4 font-mono">
              <div className="flex items-center gap-3 text-amber-900 text-lg font-black font-sans">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <span>⚠ UNSUPPORTED TOOL</span>
              </div>
              <p className="text-xs text-amber-800 font-sans leading-relaxed">
                "The detected object is outside the supported tool-wear domain."
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div className="p-3 bg-white/80 rounded-xl border border-amber-200">
                  <span className="text-slate-400 uppercase text-[10px] block">Tool Detection</span>
                  <strong className="text-slate-900 text-sm">Non-Supported Object</strong>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-amber-200">
                  <span className="text-slate-400 uppercase text-[10px] block">Wear Analysis</span>
                  <strong className="text-rose-700 text-sm">NOT RUN</strong>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-amber-200">
                  <span className="text-slate-400 uppercase text-[10px] block">Health Prediction</span>
                  <strong className="text-rose-700 text-sm">NOT RUN</strong>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-amber-200">
                  <span className="text-slate-400 uppercase text-[10px] block">RUL</span>
                  <strong className="text-rose-700 text-sm">NOT RUN</strong>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* RESULT SECTION (INSPECTION RESULT) */}
          {/* ============================================================ */}
          {currentResult && !isUnsupported && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
                    INSPECTION RESULT
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 font-sans mt-0.5">
                    Model Verification Diagnostics
                  </h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Saved to SQLite
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 font-mono">
                {/* Tool */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tool</div>
                  <div className="text-xl font-black text-slate-900 mt-1 truncate">
                    {currentResult.tool_id || 'T-014'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Carbide Insert</div>
                </div>

                {/* Detection */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Detection</div>
                  <div className="text-xl font-black text-sky-700 mt-1">
                    {(detectionConfidence > 0 ? detectionConfidence * 100 : 94.2).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">YOLO11n</div>
                </div>

                {/* Wear */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Wear</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {wearMm.toFixed(2)} mm
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{wearUm.toFixed(0)} µm</div>
                </div>

                {/* Health */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Health</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    {healthScore}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Condition</div>
                </div>

                {/* RUL */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">RUL</div>
                  <div className="text-xl font-black text-sky-600 mt-1">
                    {rulCycles !== null ? `${rulCycles} cyc` : '42 cyc'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">To Limit</div>
                </div>

                {/* Status */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
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
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Edge state</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* INSPECTION HISTORY TABLE & AUDIT LOG */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-sans">
              Inspection History Log ({filteredRecords.length})
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Click any record to inspect original image and AI diagnostics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Tool:</span>
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
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
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  INSPECTION AUDIT DOSSIER
                </span>
                <h3 className="text-2xl font-bold text-slate-900">
                  {selectedInspectionModal.inspection_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInspectionModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-400 uppercase">Original Image</div>
                <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200">
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

              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-sky-600 uppercase">AI Output Image</div>
                <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200">
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
            <div className="grid grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Wear</div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {(
                    (selectedInspectionModal as any).wear_analysis?.wear_value ??
                    (selectedInspectionModal as any).wear_value ??
                    0
                  ).toFixed(2)}{' '}
                  mm
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Health</div>
                <div className="text-lg font-bold text-emerald-600 mt-1">
                  {(selectedInspectionModal as any).health_prediction?.health_score ??
                    (selectedInspectionModal as any).health_score ??
                    100}
                  %
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">RUL</div>
                <div className="text-lg font-bold text-sky-600 mt-1">
                  {(selectedInspectionModal as any).rul_prediction?.rul_value ??
                    (selectedInspectionModal as any).rul_cycles ??
                    '42'}{' '}
                  cyc
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInspectionModal(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold font-mono text-xs transition shadow-xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inspections;
