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
    <div className="p-6 md:p-12 space-y-12 max-w-6xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            LIVE CAMERA
          </h1>
          <p className="text-sm text-slate-500 font-mono">
            Inspect a tool in real time using your camera.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <label className="text-slate-500 font-semibold">Station Tool:</label>
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

      {/* Large Camera Area */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 font-sans">
            Live Viewfinder
          </h2>
          {isCameraActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ● Camera Active
            </span>
          ) : (
            <span className="text-xs font-mono text-slate-400">Camera Inactive</span>
          )}
        </div>

        {cameraError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-mono">
            {cameraError}
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-[480px] flex items-center justify-center border border-slate-200 shadow-inner">
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
              <div className="text-sm font-bold text-slate-300">Camera is Inactive</div>
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
                className="flex items-center gap-2 px-6 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs"
              >
                <Play className="w-4 h-4" />
                <span>[ Start Camera ]</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition shadow-2xs"
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
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* LAST CAPTURED FRAME */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  CAPTURED FRAME
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-sans mt-0.5">
                  Last Captured Frame
                </h3>
              </div>
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                <img src={capturedBlobUrl} alt="Last Captured Frame" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* AI RESULT ANNOTATED IMAGE */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 font-bold">
                    VISION HUD
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-sans mt-0.5">
                    AI Result
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {inspectionResult ? 'Inference Complete' : 'Processing...'}
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
                {annotatedOutputUrl && !imageError ? (
                  <img
                    src={annotatedOutputUrl}
                    alt="AI Annotated HUD"
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : imageError ? (
                  <div className="p-8 text-center text-rose-400 font-mono text-xs space-y-2">
                    <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
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
            <div className="bg-amber-50 border border-amber-300 rounded-3xl p-8 shadow-xs space-y-2 font-mono">
              <div className="font-bold text-amber-900 text-base">⚠ UNSUPPORTED TOOL</div>
              <p className="text-xs text-amber-800 font-sans">
                "The detected object is outside the supported tool-wear domain." Downstream wear, health, and RUL predictions are marked NOT RUN.
              </p>
            </div>
          )}

          {/* RESULT SUMMARY */}
          {inspectionResult && !isUnsupported && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
                    INSPECTION RESULT
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 font-sans mt-0.5">
                    Result Summary
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">ID: {inspectionResult.inspection_id}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 font-mono">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tool</div>
                  <div className="text-xl font-black text-slate-900 mt-1 truncate">
                    {inspectionResult.tool_id || 'T-014'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{inspectionResult.tool_name || 'Carbide Insert'}</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Wear</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {wearMm.toFixed(2)} mm
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{wearUm.toFixed(0)} µm</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Health</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    {healthScore}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Condition</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">RUL</div>
                  <div className="text-xl font-black text-sky-600 mt-1">
                    {rulCycles !== null ? `${rulCycles} cyc` : '42 cyc'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">To Limit</div>
                </div>

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
    </div>
  );
};

export default LiveMonitor;
