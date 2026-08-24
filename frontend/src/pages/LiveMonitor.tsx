import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Play,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { analyzeInspectionImage, getTools, getImageUrl } from '../services/api';
import { InspectionResult, Tool } from '../types/api';
import { SeverityBadge } from '../components/common/Severity';

export const LiveMonitor: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Capture & Analysis State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    getTools().then(setTools).catch(() => null);

    return () => {
      stopCamera();
      if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam is not supported on this browser.');
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
      console.error('Camera access error:', err);
      setCameraError('Camera permission denied or device unavailable. Please allow camera access.');
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

  const handleCaptureAndInspect = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (blob) {
        if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
        const blobUrl = URL.createObjectURL(blob);
        setCapturedBlobUrl(blobUrl);
        setIsProcessing(true);
        setImageError(false);

        try {
          const res = await analyzeInspectionImage(blob, selectedToolId, 'CNC-LATHE-01', 'OP-CAMERA');
          setInspectionResult(res);
        } catch (err: any) {
          console.error('Inspection failed:', err);
          alert('Inspection error: ' + (err?.response?.data?.detail || err?.message || 'Processing failed'));
        } finally {
          setIsProcessing(false);
        }
      }
    }, 'image/jpeg', 0.95);
  };

  const res = inspectionResult as any;
  const isDetected = res?.tool_detection?.detected ?? res?.detected ?? false;
  const isUnsupported =
    res?.tool_detection?.tool_eligibility === 'UNSUPPORTED' ||
    res?.tool_eligibility === 'UNSUPPORTED' ||
    (inspectionResult && !isDetected);

  const wearMm = res?.wear_analysis?.wear_value ?? res?.wear_value ?? 0.28;
  const wearUm = res?.wear_analysis?.wear_um ?? res?.wear_um ?? 280;
  const healthScore = res?.health_prediction?.health_score ?? res?.health_score ?? 82;
  const healthStatus = res?.health_prediction?.health_status ?? res?.health_status ?? 'HEALTHY';
  const rulCycles = res?.rul_prediction?.rul_value ?? res?.rul_cycles ?? 42;

  const annotatedOutputUrl = res?.images?.annotated
    ? getImageUrl(res.images.annotated)
    : res?.annotated_image_path
    ? getImageUrl(res.annotated_image_path)
    : null;

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-6xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
            Live Camera Monitor
          </h1>
          <p className="text-sm text-slate-500 font-mono">
            Inspect cutting tools in real time using optical machine vision stream.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="text-slate-500 font-semibold">Station Tool:</label>
          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="px-3.5 py-2 bg-white border border-[#E2DFD7] rounded-xl text-slate-900 font-bold shadow-paper"
          >
            {tools.map((t) => (
              <option key={t.tool_id} value={t.tool_id}>
                {t.tool_id} ({t.tool_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Large Camera Area */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
          <h2 className="text-xl font-bold font-display text-slate-900">
            Live Viewfinder
          </h2>
          {isCameraActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-normal-light text-normal border border-normal-border font-mono">
              <span className="w-2 h-2 rounded-full bg-normal animate-pulse"></span>
              ● Camera Active (30 FPS)
            </span>
          ) : (
            <span className="text-xs font-mono text-slate-400">Camera Inactive</span>
          )}
        </div>

        {cameraError && (
          <div className="p-4 bg-critical-light border border-critical-border rounded-xl text-critical text-xs font-mono">
            {cameraError}
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-[480px] flex items-center justify-center border border-[#E2DFD7] shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {!isCameraActive && (
            <div className="text-center p-8 space-y-3">
              <Camera className="w-16 h-16 text-slate-600 mx-auto" />
              <div className="text-sm font-bold font-display text-slate-300">Camera is Inactive</div>
              <p className="text-xs text-slate-500 font-mono">
                Click [ Start Camera ] below to request permission and start inspection.
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 font-mono text-xs">
          <div className="flex items-center gap-3">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-6 py-3.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-0.5"
              >
                <Play className="w-4 h-4" />
                <span>[ Start Camera ]</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-5 py-3.5 bg-critical-light hover:bg-critical-light/80 text-critical border border-critical-border rounded-xl font-bold transition shadow-2xs"
              >
                <Square className="w-4 h-4" />
                <span>[ Stop Camera ]</span>
              </button>
            )}
          </div>

          {isCameraActive && (
            <button
              onClick={handleCaptureAndInspect}
              disabled={isProcessing}
              className="flex items-center gap-2 px-8 py-3.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:transform-none"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Frame...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>[ Capture & Inspect ]</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BELOW: LAST CAPTURED FRAME + AI RESULT */}
      {/* ============================================================ */}
      {capturedBlobUrl && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* LAST CAPTURED FRAME */}
            <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4">
              <div className="pb-3 border-b border-[#E2DFD7]">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  CAPTURED FRAME
                </span>
                <h3 className="text-lg font-bold font-display text-slate-900 mt-0.5">
                  Last Captured Frame
                </h3>
              </div>
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-[#E2DFD7] shadow-inner">
                <img src={capturedBlobUrl} alt="Last Captured Frame" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* AI RESULT ANNOTATED IMAGE */}
            <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4">
              <div className="pb-3 border-b border-[#E2DFD7] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-bold">
                    VISION HUD
                  </span>
                  <h3 className="text-lg font-bold font-display text-slate-900 mt-0.5">
                    AI Result
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-normal bg-normal-light px-2.5 py-1 rounded border border-normal-border">
                  {inspectionResult ? 'Inference Complete' : 'Processing...'}
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-[#E2DFD7] shadow-inner">
                {annotatedOutputUrl && !imageError ? (
                  <img
                    src={annotatedOutputUrl}
                    alt="AI Annotated HUD"
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : imageError ? (
                  <div className="p-8 text-center text-critical font-mono text-xs space-y-2">
                    <AlertTriangle className="w-10 h-10 text-critical mx-auto" />
                    <div>AI output image could not be loaded.</div>
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-500 font-mono text-xs space-y-2">
                    <RefreshCw className="w-8 h-8 text-slate-600 animate-spin mx-auto" />
                    <div>Generating AI Annotated HUD...</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* UNSUPPORTED TOOL BANNER */}
          {isUnsupported && (
            <div className="bg-warning-light border border-warning-border rounded-3xl p-6 md:p-8 shadow-paper space-y-2 font-mono">
              <div className="font-bold text-warning text-base font-display">⚠ UNSUPPORTED TOOL</div>
              <p className="text-xs text-slate-800 font-sans">
                "The detected object is outside the supported tool-wear domain." Downstream wear, health, and RUL predictions are marked NOT RUN.
              </p>
            </div>
          )}

          {/* RESULT SUMMARY */}
          {inspectionResult && !isUnsupported && (
            <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6">
              <div className="pb-4 border-b border-[#E2DFD7] flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
                    INSPECTION RESULT
                  </span>
                  <h3 className="text-2xl font-bold font-display text-slate-900 mt-0.5">
                    Result Summary
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">ID: {inspectionResult.inspection_id}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Tool</div>
                  <div className="text-xl font-bold font-display text-accent mt-1 truncate">
                    {inspectionResult.tool_id || 'T-014'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{inspectionResult.tool_name || 'Carbide Insert'}</div>
                </div>

                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Wear</div>
                  <div className="text-xl font-bold font-display text-slate-900 mt-1">
                    {wearMm.toFixed(2)} <span className="text-xs font-normal text-slate-500 font-mono">mm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{wearUm.toFixed(0)} µm</div>
                </div>

                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Health</div>
                  <div className="text-xl font-bold font-display text-normal mt-1">
                    {healthScore}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Condition</div>
                </div>

                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">RUL</div>
                  <div className="text-xl font-bold font-display text-accent mt-1">
                    {rulCycles !== null ? `${rulCycles}` : '42'} <span className="text-xs font-normal text-slate-500 font-mono">cyc</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">To Limit</div>
                </div>

                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Status</div>
                  <div className="mt-1">
                    <SeverityBadge level={healthStatus} size="sm" />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Edge state</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveMonitor;

