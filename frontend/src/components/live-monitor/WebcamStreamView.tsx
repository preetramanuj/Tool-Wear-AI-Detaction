import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  VideoOff,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Scan,
  Shield,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import { analyzeWebcamFrame } from '../../services/api';
import { WebcamFrameResult } from '../../types/api';

interface WebcamStreamViewProps {
  selectedToolId?: string;
  onFrameAnalyzed?: (result: WebcamFrameResult) => void;
}

export const WebcamStreamView: React.FC<WebcamStreamViewProps> = ({
  selectedToolId = 'TL-CNMG-120408',
  onFrameAnalyzed,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [continuousInference, setContinuousInference] = useState<boolean>(true);
  const [fpsSetting, setFpsSetting] = useState<number>(3);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<WebcamFrameResult | null>(null);

  // Discover camera devices
  const getCameraDevices = async () => {
    try {
      const devList = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devList.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate video devices:', err);
    }
  };

  useEffect(() => {
    getCameraDevices();
  }, []);

  // Start Camera
  const startWebcam = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live webcam is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsStreaming(true);
      getCameraDevices();
    } catch (err: any) {
      setError(err.message || 'Failed to access camera stream. Please check permissions.');
      setIsStreaming(false);
    }
  };

  // Stop Camera
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  // Frame Capture & Analysis
  const captureAndAnalyzeFrame = useCallback(async () => {
    if (!videoRef.current || !isStreaming || isProcessing) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        setIsProcessing(true);
        try {
          const res = await analyzeWebcamFrame(blob, selectedToolId, true);
          setLatestResult(res);
          if (onFrameAnalyzed) onFrameAnalyzed(res);
        } catch (err) {
          console.error('Frame inference error:', err);
        } finally {
          setIsProcessing(false);
        }
      },
      'image/jpeg',
      0.85
    );
  }, [isStreaming, isProcessing, selectedToolId, onFrameAnalyzed]);

  // Interval loop for continuous stream
  useEffect(() => {
    let intervalId: any = null;
    if (isStreaming && continuousInference) {
      const intervalMs = Math.round(1000 / Math.max(1, fpsSetting));
      intervalId = setInterval(() => {
        captureAndAnalyzeFrame();
      }, intervalMs);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isStreaming, continuousInference, fpsSetting, captureAndAnalyzeFrame]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
      {/* Top Stream Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-sky-600" />
          <div>
            <div className="text-xs font-mono font-bold uppercase text-slate-800">
              Real-Time Optical Vision Stream
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Live Webcam Feed & Multi-Object Spatial Telemetry
            </div>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Device Selector */}
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={isStreaming}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500 disabled:opacity-60"
          >
            {devices.length > 0 ? (
              devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))
            ) : (
              <option value="">Default Front Camera</option>
            )}
          </select>

          {/* FPS Throttling */}
          <select
            value={fpsSetting}
            onChange={(e) => setFpsSetting(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value={1}>1 FPS (Low Latency)</option>
            <option value={3}>3 FPS (Standard)</option>
            <option value={5}>5 FPS (High Thru)</option>
          </select>

          {!isStreaming ? (
            <button
              onClick={startWebcam}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded text-xs font-mono font-bold shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5" /> START WEBCAM
            </button>
          ) : (
            <button
              onClick={stopWebcam}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded text-xs font-mono font-bold shadow-xs transition"
            >
              <Square className="w-3.5 h-3.5" /> STOP STREAM
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-mono text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Video Stream + HUD Layer */}
      <div className="relative w-full aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden border border-slate-300 shadow-inner flex items-center justify-center bg-grid-white">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-contain ${!isStreaming ? 'hidden' : ''}`}
        />

        {!isStreaming && (
          <div className="text-center p-6 space-y-3 font-mono text-xs text-slate-500">
            <VideoOff className="w-12 h-12 mx-auto text-slate-400" />
            <div className="font-bold text-slate-700">Webcam Stream Offline</div>
            <div className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Click "Start Webcam" to begin real-time cutting tool degradation monitoring, person detection, and operator identity verification.
            </div>
          </div>
        )}

        {/* Live HUD SVG Overlay (when stream is active and results available) */}
        {isStreaming && latestResult && videoRef.current && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 640 480">
            {/* 1. Person Boxes */}
            {latestResult.persons.map((p, i) => {
              const [px1, py1, px2, py2] = p.bbox;
              const pw = px2 - px1;
              const ph = py2 - py1;
              return (
                <g key={`person-${i}`}>
                  <rect
                    x={px1}
                    y={py1}
                    width={pw}
                    height={ph}
                    fill="rgba(2, 132, 199, 0.05)"
                    stroke="#0284C7"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <rect x={px1} y={Math.max(0, py1 - 20)} width={140} height={20} fill="#0284C7" rx="3" />
                  <text x={px1 + 6} y={Math.max(14, py1 - 6)} fill="#FFFFFF" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    {latestResult.operator.matched ? `${latestResult.operator.identity.toUpperCase()}` : 'OPERATOR'} [{(p.confidence * 100).toFixed(0)}%]
                  </text>
                </g>
              );
            })}

            {/* 2. Tool Boxes */}
            {latestResult.tool.detections.map((t, i) => {
              const [tx1, ty1, tx2, ty2] = t.bbox;
              const tw = tx2 - tx1;
              const th = ty2 - ty1;
              return (
                <g key={`tool-${i}`}>
                  <rect
                    x={tx1}
                    y={ty1}
                    width={tw}
                    height={th}
                    fill="rgba(245, 158, 11, 0.08)"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                  />
                  <rect x={tx1} y={Math.max(0, ty1 - 20)} width={130} height={20} fill="#F59E0B" rx="3" />
                  <text x={tx1 + 6} y={Math.max(14, ty1 - 6)} fill="#FFFFFF" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    CUTTING TOOL [{(t.confidence * 100).toFixed(0)}%]
                  </text>
                </g>
              );
            })}

            {/* 3. Association Connector Lines */}
            {latestResult.associations.map((assoc, i) => {
              if (assoc.person_bbox && assoc.tool_bbox && assoc.relationship !== 'NOT_ASSOCIATED') {
                const [px1, py1, px2, py2] = assoc.person_bbox;
                const [tx1, ty1, tx2, ty2] = assoc.tool_bbox;
                const pcx = (px1 + px2) / 2;
                const pcy = py1 + 0.6 * (py2 - py1);
                const tcx = (tx1 + tx2) / 2;
                const tcy = (ty1 + ty2) / 2;

                return (
                  <g key={`assoc-${i}`}>
                    <line x1={pcx} y1={pcy} x2={tcx} y2={tcy} stroke="#10B981" strokeWidth="2.5" strokeDasharray="3 3" />
                    <circle cx={(pcx + tcx) / 2} cy={(pcy + tcy) / 2} r="16" fill="#10B981" />
                    <text x={(pcx + tcx) / 2} y={(pcy + tcy) / 2 + 4} fill="#FFFFFF" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                      {assoc.relationship}
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        )}

        {/* Live HUD Floating Tag */}
        {isStreaming && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-md px-3 py-1.5 shadow-xs font-mono text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="font-bold text-slate-800">STREAMING @ {latestResult ? latestResult.fps_estimate : fpsSetting} FPS</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 font-semibold">{latestResult ? `${latestResult.latency_ms} ms` : 'Processing...'}</span>
          </div>
        )}
      </div>

      {/* Real-time Telemetry Strip below stream */}
      {latestResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Tool Detected</div>
            <div className="text-sm font-bold text-slate-800 mt-0.5">
              {latestResult.tool_detected ? 'CONFIRMED' : 'NO TOOL'}
            </div>
            <div className="text-[10px] text-slate-500">{latestResult.tool.type}</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Operator Auth</div>
            <div className="text-sm font-bold text-sky-700 mt-0.5 truncate">
              {latestResult.operator.identity || 'Unknown'}
            </div>
            <div className="text-[10px] text-slate-500">
              {latestResult.operator.matched ? `Match ${latestResult.operator.confidence}%` : 'Unverified'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Person ↔ Tool</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">
              {latestResult.associations.length > 0 ? latestResult.associations[0].relationship : 'NONE'}
            </div>
            <div className="text-[10px] text-slate-500">
              Conf: {latestResult.associations.length > 0 ? `${(latestResult.associations[0].confidence * 100).toFixed(0)}%` : '0%'}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Wear (VB mm)</div>
            <div className="text-sm font-bold text-slate-800 mt-0.5">
              {latestResult.wear.wear_value !== undefined && latestResult.tool_detected ? `${latestResult.wear.wear_value.toFixed(3)} mm` : '-'}
            </div>
            <div className="text-[10px] text-slate-500">
              {latestResult.health.health_status || 'UNKNOWN'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
