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
  Activity,
  Cpu,
  Thermometer,
  Zap,
  Gauge,
  Sliders,
  FileSpreadsheet,
  Info,
  Check,
} from 'lucide-react';
import { analyzeInspectionImage, getInspectionRecords, getTools, getImageUrl } from '../services/api';
import { InspectionResult, Tool, SensorDataInput } from '../types/api';

export const Inspections: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');

  // Input Mode: 'upload' | 'camera' | 'multimodal'
  const [inputMode, setInputMode] = useState<'upload' | 'camera' | 'multimodal'>('upload');

  // Upload State (Shared for Mode 1 & Mode 3)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Camera State (Mode 2)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Multimodal Sensor State (Mode 3)
  const [sensorInputType, setSensorInputType] = useState<'manual' | 'file'>('manual');
  const [sensorValues, setSensorValues] = useState<{
    vibration_x: string;
    vibration_y: string;
    vibration_z: string;
    temperature: string;
    spindle_current: string;
    spindle_power: string;
    cutting_force: string;
    acoustic_emission: string;
    sound_level: string;
    rpm: string;
    feed_rate: string;
    depth_of_cut: string;
  }>({
    vibration_x: '1.20',
    vibration_y: '0.85',
    vibration_z: '1.10',
    temperature: '52.4',
    spindle_current: '4.6',
    spindle_power: '1750',
    cutting_force: '135',
    acoustic_emission: '45.0',
    sound_level: '76.0',
    rpm: '3184',
    feed_rate: '360',
    depth_of_cut: '1.0',
  });

  const [sensorFile, setSensorFile] = useState<File | null>(null);
  const sensorFileInputRef = useRef<HTMLInputElement>(null);

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

  // Sensor Presets
  const applySensorPreset = (type: 'nominal' | 'wear_anomaly' | 'clear') => {
    if (type === 'nominal') {
      setSensorValues({
        vibration_x: '1.15',
        vibration_y: '0.82',
        vibration_z: '1.05',
        temperature: '48.2',
        spindle_current: '4.2',
        spindle_power: '1620',
        cutting_force: '122',
        acoustic_emission: '42.0',
        sound_level: '74.5',
        rpm: '3184',
        feed_rate: '350',
        depth_of_cut: '1.0',
      });
      setSensorFile(null);
    } else if (type === 'wear_anomaly') {
      setSensorValues({
        vibration_x: '2.45',
        vibration_y: '1.95',
        vibration_z: '2.30',
        temperature: '68.5',
        spindle_current: '6.8',
        spindle_power: '2450',
        cutting_force: '188',
        acoustic_emission: '68.0',
        sound_level: '86.5',
        rpm: '3184',
        feed_rate: '350',
        depth_of_cut: '1.0',
      });
      setSensorFile(null);
    } else {
      setSensorValues({
        vibration_x: '',
        vibration_y: '',
        vibration_z: '',
        temperature: '',
        spindle_current: '',
        spindle_power: '',
        cutting_force: '',
        acoustic_emission: '',
        sound_level: '',
        rpm: '',
        feed_rate: '',
        depth_of_cut: '',
      });
      setSensorFile(null);
    }
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
      // Build sensor payload if in multimodal mode
      let sensorDataObj: Record<string, any> | undefined = undefined;
      let activeSensorFile: File | null = null;

      if (inputMode === 'multimodal') {
        if (sensorInputType === 'file' && sensorFile) {
          activeSensorFile = sensorFile;
        } else {
          sensorDataObj = {};
          Object.entries(sensorValues).forEach(([k, v]) => {
            if (v.trim() !== '') {
              const num = parseFloat(v);
              if (!isNaN(num)) sensorDataObj![k] = num;
            }
          });
        }
      }

      const activeModeStr = inputMode === 'multimodal' ? 'IMAGE_SENSOR' : (inputMode === 'camera' ? 'CAMERA' : 'IMAGE');

      const result = await analyzeInspectionImage(
        payload,
        selectedToolId,
        'CNC-LATHE-01',
        'OP-OPERATOR',
        sensorDataObj,
        activeSensorFile,
        activeModeStr
      );
      setCurrentResult(result);
      fetchRecords();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || 'Inspection failed.');
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsProcessing(false);
      setProcessingStage(0);
    }
  };

  // Helper for sensor status indicator
  const getSensorStatusBadge = (val: string, nominalRange?: [number, number]) => {
    if (!val || val.trim() === '') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Not Provided
        </span>
      );
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Invalid
        </span>
      );
    }
    if (nominalRange && (num < nominalRange[0] || num > nominalRange[1])) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-600 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Anomaly
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
      </span>
    );
  };

  const filteredRecords = records.filter((r) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      r.health_prediction?.health_status === statusFilter ||
      r.wear_analysis?.wear_status === statusFilter;
    const matchesTool = toolFilter === 'ALL' || r.tool_id === toolFilter;
    return matchesStatus && matchesTool;
  });

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            INSPECTIONS
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Multimodal Cutting Insert Verification & Physical Telemetry Diagnostic
          </p>
        </div>

        {/* Tool Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-slate-500 uppercase">Target Tool:</label>
          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            {tools.map((t) => (
              <option key={t.tool_id} value={t.tool_id}>
                {t.tool_id} - {t.tool_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-MODE SELECTOR TABS */}
      <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex flex-wrap sm:flex-nowrap items-center gap-2 max-w-full border border-slate-200">
        <button
          onClick={() => {
            setInputMode('upload');
            stopCamera();
          }}
          className={`whitespace-nowrap flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition ${
            inputMode === 'upload'
              ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">[ 1. Image Inspection ]</span>
        </button>

        <button
          onClick={() => {
            setInputMode('camera');
            startCamera();
          }}
          className={`whitespace-nowrap flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition ${
            inputMode === 'camera'
              ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">[ 2. Live Camera ]</span>
        </button>

        <button
          onClick={() => {
            setInputMode('multimodal');
            stopCamera();
          }}
          className={`whitespace-nowrap flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition ${
            inputMode === 'multimodal'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 ring-2 ring-emerald-500/20'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="whitespace-nowrap">[ 3. Image + Sensors ]</span>
        </button>
      </div>

      {/* INPUT WORKSPACE AREA */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-8">
        {/* MODE 1: IMAGE UPLOAD */}
        {inputMode === 'upload' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-mono font-bold text-sky-600 uppercase tracking-widest">
                STEP 1: UPLOAD TOOL IMAGE
              </span>
              <span className="text-xs font-mono text-slate-400">Supported: JPG, PNG, WEBP</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50/50 hover:bg-sky-50/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[260px]"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div className="p-4 bg-white rounded-full border border-slate-200 text-sky-600 shadow-xs mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click or Drag Cutting Tool Image Here'}
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  High-resolution optical photo of flank wear band
                </div>
              </div>

              {/* Input Preview */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-slate-500 flex items-center justify-between">
                  <span>INPUT PREVIEW</span>
                  {fileDetails && <span className="text-slate-400 font-normal">{fileDetails.size}</span>}
                </div>
                <div className="h-[260px] bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                  {localPreviewUrl ? (
                    <img src={localPreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-xs font-mono text-slate-400">No Image Selected</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => executeInspection()}
                disabled={!selectedFile || isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-mono text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>[ Run Image Inspection ]</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: LIVE CAMERA */}
        {inputMode === 'camera' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-mono font-bold text-sky-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                LIVE WEBCAM FEED
              </span>
              <span className="text-xs font-mono text-slate-400">Resolution: 1280 x 720</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Camera Video */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-slate-500">LIVE STREAM</div>
                <div className="h-[280px] bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden relative">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center text-rose-400 text-xs font-mono">
                      <AlertTriangle className="w-8 h-8 mb-2 text-rose-500" />
                      <div>{cameraError}</div>
                      <button
                        onClick={startCamera}
                        className="mt-3 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono hover:bg-slate-700"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Captured Frame */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-slate-500">CAPTURED FRAME</div>
                <div className="h-[280px] bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                  {capturedBlobUrl ? (
                    <img src={capturedBlobUrl} alt="Captured Frame" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-xs font-mono text-slate-400">Click [ Capture & Inspect ] to grab frame</div>
                  )}
                </div>
              </div>
            </div>

            {/* Camera Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {isCameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-mono text-xs font-bold transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>[ Stop Camera ]</span>
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-mono text-xs font-bold transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>[ Start Camera ]</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => captureFrame(false)}
                  disabled={!isCameraActive}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl font-mono text-xs font-bold transition disabled:opacity-50"
                >
                  [ Snapshot Frame ]
                </button>
                <button
                  onClick={() => captureFrame(true)}
                  disabled={!isCameraActive || isProcessing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-mono text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>[ Capture & Inspect ]</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: MULTIMODAL (IMAGE + SENSORS) */}
        {inputMode === 'multimodal' && (
          <div className="space-y-10">
            {/* STEP 1: Tool Image */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">1</span>
                  STEP 1: UPLOAD CUTTING TOOL IMAGE
                </div>
                <span className="text-xs font-mono text-slate-400">High-Resolution Insert Flank</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[200px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="p-3 bg-white rounded-full border border-emerald-200 text-emerald-600 shadow-xs mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Select or Drop Optical Tool Photo'}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">Image feeds Models 1, 2, 3 & 4</div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold uppercase text-slate-500">INPUT IMAGE PREVIEW</div>
                  <div className="h-[200px] bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                    {localPreviewUrl ? (
                      <img src={localPreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-xs font-mono text-slate-400">No Image Uploaded</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: Physical Sensor Data */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">2</span>
                  STEP 2: PHYSICAL SENSOR TELEMETRY & PROCESS PARAMETERS
                </div>

                {/* Subtabs for Manual vs CSV */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 font-mono text-xs">
                  <button
                    onClick={() => setSensorInputType('manual')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      sensorInputType === 'manual' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Manual Fields
                  </button>
                  <button
                    onClick={() => setSensorInputType('file')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      sensorInputType === 'file' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    CSV / JSON Upload
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-mono text-slate-500 font-bold">Quick Presets:</div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <button
                    onClick={() => applySensorPreset('nominal')}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                  >
                    [ Nominal Turning ]
                  </button>
                  <button
                    onClick={() => applySensorPreset('wear_anomaly')}
                    className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 rounded-lg transition font-bold"
                  >
                    [ High Wear Anomaly ]
                  </button>
                  <button
                    onClick={() => applySensorPreset('clear')}
                    className="px-2.5 py-1 text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* MANUAL SENSOR ENTRY FORM */}
              {sensorInputType === 'manual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  {/* Category 1: Vibration */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-sky-600" />
                        <span>VIBRATION (m/s²)</span>
                      </div>
                      {getSensorStatusBadge(sensorValues.vibration_x, [0.1, 3.0])}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">X-Axis</label>
                        <input
                          type="number"
                          step="0.01"
                          value={sensorValues.vibration_x}
                          onChange={(e) => setSensorValues({ ...sensorValues, vibration_x: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="m/s²"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">Y-Axis</label>
                        <input
                          type="number"
                          step="0.01"
                          value={sensorValues.vibration_y}
                          onChange={(e) => setSensorValues({ ...sensorValues, vibration_y: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="m/s²"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">Z-Axis</label>
                        <input
                          type="number"
                          step="0.01"
                          value={sensorValues.vibration_z}
                          onChange={(e) => setSensorValues({ ...sensorValues, vibration_z: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="m/s²"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Temperature */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-rose-600" />
                        <span>TEMPERATURE (°C)</span>
                      </div>
                      {getSensorStatusBadge(sensorValues.temperature, [20.0, 75.0])}
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block mb-1">Cutting Zone Thermal</label>
                      <input
                        type="number"
                        step="0.1"
                        value={sensorValues.temperature}
                        onChange={(e) => setSensorValues({ ...sensorValues, temperature: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                        placeholder="e.g. 52.4"
                      />
                    </div>
                  </div>

                  {/* Category 3: Machine Load */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-600" />
                        <span>MACHINE LOAD</span>
                      </div>
                      {getSensorStatusBadge(sensorValues.spindle_current, [1.0, 8.0])}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">Current (A)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={sensorValues.spindle_current}
                          onChange={(e) => setSensorValues({ ...sensorValues, spindle_current: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="Amps"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">Power (W)</label>
                        <input
                          type="number"
                          step="10"
                          value={sensorValues.spindle_power}
                          onChange={(e) => setSensorValues({ ...sensorValues, spindle_power: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="Watts"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category 4: Cutting Force */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-indigo-600" />
                        <span>CUTTING FORCE (N)</span>
                      </div>
                      {getSensorStatusBadge(sensorValues.cutting_force, [50, 200])}
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block mb-1">Resultant Force</label>
                      <input
                        type="number"
                        step="1"
                        value={sensorValues.cutting_force}
                        onChange={(e) => setSensorValues({ ...sensorValues, cutting_force: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                        placeholder="e.g. 135"
                      />
                    </div>
                  </div>

                  {/* Category 5: Process Parameters */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-5 space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-emerald-600" />
                        <span>MACHINING PROCESS REGIME</span>
                      </div>
                      {getSensorStatusBadge(sensorValues.rpm, [1000, 5000])}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">Spindle Speed (RPM)</label>
                        <input
                          type="number"
                          step="1"
                          value={sensorValues.rpm}
                          onChange={(e) => setSensorValues({ ...sensorValues, rpm: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="e.g. 3184"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">Feed Rate (mm/min)</label>
                        <input
                          type="number"
                          step="1"
                          value={sensorValues.feed_rate}
                          onChange={(e) => setSensorValues({ ...sensorValues, feed_rate: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="e.g. 360"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 block mb-1">Depth of Cut (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={sensorValues.depth_of_cut}
                          onChange={(e) => setSensorValues({ ...sensorValues, depth_of_cut: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          placeholder="e.g. 1.0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FILE UPLOAD SENSOR TAB */}
              {sensorInputType === 'file' && (
                <div
                  onClick={() => sensorFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <input
                    type="file"
                    ref={sensorFileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSensorFile(e.target.files[0]);
                      }
                    }}
                    accept=".csv,.txt,.json"
                    className="hidden"
                  />
                  <div className="p-3 bg-white rounded-full border border-slate-200 text-emerald-600 shadow-xs mb-2">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {sensorFile ? sensorFile.name : 'Upload Sensor Time-Series CSV / JSON'}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    Columns: vibration_x, vibration_y, vibration_z, temperature, current, force, rpm, feed_rate
                  </div>
                </div>
              )}
            </div>

            {/* Run Multimodal Action */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => executeInspection()}
                disabled={!selectedFile || isProcessing}
                className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-mono text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>[ Run Multimodal Inspection ]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MULTI-STAGE PROGRESS OVERLAY */}
      {isProcessing && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold flex items-center gap-2 text-sky-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              RUNNING MULTIMODAL INFERENCE PIPELINE
            </span>
            <span className="text-slate-400">Stage {processingStage} of 4</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
            <div className={`p-2 rounded border ${processingStage >= 1 ? 'bg-sky-950 border-sky-500 text-sky-300' : 'bg-slate-800/40 border-slate-800 text-slate-600'}`}>
              1. Tool Detection
            </div>
            <div className={`p-2 rounded border ${processingStage >= 2 ? 'bg-sky-950 border-sky-500 text-sky-300' : 'bg-slate-800/40 border-slate-800 text-slate-600'}`}>
              2. Wear & Sensors
            </div>
            <div className={`p-2 rounded border ${processingStage >= 3 ? 'bg-sky-950 border-sky-500 text-sky-300' : 'bg-slate-800/40 border-slate-800 text-slate-600'}`}>
              3. Health & RUL
            </div>
            <div className={`p-2 rounded border ${processingStage >= 4 ? 'bg-sky-950 border-sky-500 text-sky-300' : 'bg-slate-800/40 border-slate-800 text-slate-600'}`}>
              4. SQLite Audit
            </div>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY SECTION */}
      {currentResult && (
        <div className="space-y-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">INSPECTION RESULT</h2>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                ID: {currentResult.inspection_id} • Latency: {currentResult.performance?.latency_ms} ms • Mode: {currentResult.input_mode || 'IMAGE'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                  currentResult.health_prediction?.health_status === 'HEALTHY'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : currentResult.health_prediction?.health_status === 'FACE_DETECTED' || currentResult.tool_detection?.tool_eligibility === 'FACE_DETECTED_NO_TOOL'
                    ? 'bg-amber-100 text-amber-900 border-amber-400'
                    : currentResult.health_prediction?.health_status === 'WARNING'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                ● {currentResult.health_prediction?.health_status === 'FACE_DETECTED' || currentResult.tool_detection?.tool_eligibility === 'FACE_DETECTED_NO_TOOL'
                    ? 'FACE DETECTED (NO TOOL)'
                    : (currentResult.health_prediction?.health_status || 'UNKNOWN')}
              </span>
            </div>
          </div>

          {/* SPECIAL NOTICE: FACE DETECTED & NO TOOL DETECTED */}
          {(!currentResult.tool_detection?.detected && (currentResult.health_prediction?.health_status === 'FACE_DETECTED' || currentResult.tool_detection?.tool_eligibility === 'FACE_DETECTED_NO_TOOL' || currentResult.faces?.detected || (currentResult.faces?.faces_detected && currentResult.faces.faces_detected > 0))) && (
            <div className="p-5 bg-amber-50 border-2 border-amber-400 rounded-3xl flex items-start gap-4 shadow-xs">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 font-mono">
                <div className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                  ⚠ TOOL NOT DETECTED — OPERATOR FACE DETECTED
                </div>
                <p className="text-xs text-amber-800 font-sans leading-relaxed">
                  A human face was recognized in the camera view, but no CNC cutting insert was detected.
                  Please adjust camera angle and point directly at the tool insert flank to assess wear.
                </p>
              </div>
            </div>
          )}

          {/* 1. ORIGINAL vs AI ANALYZED IMAGE COMPARISON */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  1. ORIGINAL INPUT IMAGE
                </span>
                <span className="text-[11px] font-mono text-slate-400">Pre-Inference Raw Capture</span>
              </div>
              <div className="h-[320px] bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden">
                {currentResult.images?.original ? (
                  <img
                    src={getImageUrl(currentResult.images.original)}
                    alt="Original Image"
                    className="w-full h-full object-contain"
                  />
                ) : localPreviewUrl ? (
                  <img src={localPreviewUrl} alt="Original Image" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs font-mono text-slate-500">Image not available</div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  2. AI ANALYZED OUTPUT IMAGE
                </span>
                <span className="text-[11px] font-mono text-slate-400">YOLO11 Detection + HUD</span>
              </div>
              <div className="h-[320px] bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden">
                {currentResult.images?.annotated ? (
                  <img
                    src={getImageUrl(currentResult.images.annotated)}
                    alt="Analyzed Image"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs font-mono text-slate-500">Analysis visual not available</div>
                )}
              </div>
            </div>
          </div>

          {/* 2. VISION RESULTS & CORE METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs font-mono text-slate-400 uppercase">Flank Wear (VB)</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {currentResult.wear_analysis?.wear_value !== undefined && currentResult.wear_analysis?.wear_value !== null
                  ? `${currentResult.wear_analysis.wear_value.toFixed(3)} mm`
                  : 'N/A'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {currentResult.health_prediction?.wear_um !== undefined && currentResult.health_prediction?.wear_um !== null
                  ? `${currentResult.health_prediction.wear_um.toFixed(1)} µm (ISO Limit: 0.30 mm)`
                  : 'No wear data'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs font-mono text-slate-400 uppercase">Health Score</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {currentResult.health_prediction?.health_score !== undefined && currentResult.health_prediction?.health_score !== null
                  ? `${currentResult.health_prediction.health_score}%`
                  : 'N/A'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Condition: {currentResult.health_prediction?.health_status}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs font-mono text-slate-400 uppercase">Projected RUL</div>
              <div className="text-2xl font-black text-sky-700 mt-1">
                {currentResult.rul_prediction?.rul_value !== null && currentResult.rul_prediction?.rul_value !== undefined
                  ? `${currentResult.rul_prediction.rul_value} cyc`
                  : 'N/A'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {currentResult.rul_prediction?.wear_rate_um_per_cycle !== undefined && currentResult.rul_prediction?.wear_rate_um_per_cycle !== null
                  ? `Rate: ${currentResult.rul_prediction.wear_rate_um_per_cycle.toFixed(3)} µm/cycle`
                  : 'RUL N/A'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="text-xs font-mono text-slate-400 uppercase">Tool Detection</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {currentResult.tool_detection?.detected
                  ? 'Detected'
                  : (currentResult.health_prediction?.health_status === 'FACE_DETECTED' || currentResult.tool_detection?.tool_eligibility === 'FACE_DETECTED_NO_TOOL')
                  ? 'Face in View'
                  : 'No Tool'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {currentResult.tool_detection?.detected
                  ? `Confidence: ${currentResult.tool_detection?.confidence_percent || '100%'}`
                  : (currentResult.health_prediction?.health_status === 'FACE_DETECTED' || currentResult.tool_detection?.tool_eligibility === 'FACE_DETECTED_NO_TOOL')
                  ? 'Face detected, no tool'
                  : 'Tool not detected'}
              </div>
            </div>
          </div>

          {/* 3. SENSOR TELEMETRY BREAKDOWN (IF AVAILABLE) */}
          {currentResult.sensor_results?.available && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  PHYSICAL SENSOR TELEMETRY READINGS
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Source: {currentResult.sensor_results.source}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">VIBRATION RMS</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {currentResult.sensor_results.data.vibration_rms !== undefined && currentResult.sensor_results.data.vibration_rms !== null
                      ? `${currentResult.sensor_results.data.vibration_rms} m/s²`
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">TEMPERATURE</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {currentResult.sensor_results.data.temperature !== undefined && currentResult.sensor_results.data.temperature !== null
                      ? `${currentResult.sensor_results.data.temperature} °C`
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">SPINDLE CURRENT</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {currentResult.sensor_results.data.spindle_current !== undefined && currentResult.sensor_results.data.spindle_current !== null
                      ? `${currentResult.sensor_results.data.spindle_current} A`
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">CUTTING FORCE</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {currentResult.sensor_results.data.cutting_force !== undefined && currentResult.sensor_results.data.cutting_force !== null
                      ? `${currentResult.sensor_results.data.cutting_force} N`
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">SPINDLE SPEED</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {currentResult.sensor_results.data.rpm !== undefined && currentResult.sensor_results.data.rpm !== null
                      ? `${currentResult.sensor_results.data.rpm} RPM`
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">FEED RATE</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {currentResult.sensor_results.data.feed_rate !== undefined && currentResult.sensor_results.data.feed_rate !== null
                      ? `${currentResult.sensor_results.data.feed_rate} mm/min`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. CROSS-MODAL COMBINED INSIGHTS */}
          {currentResult.combined_insights && currentResult.combined_insights.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-mono font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  CROSS-MODAL SYNTHESIS & COMBINED INSIGHTS
                </span>
                <span className="text-xs font-mono text-slate-400">Vision + Telemetry Fusion</span>
              </div>

              <div className="space-y-3">
                {currentResult.combined_insights.map((ins, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900">{ins.title}</div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        {ins.confidence} CONFIDENCE
                      </span>
                    </div>
                    <p className="text-xs font-sans text-slate-700 leading-relaxed">{ins.narrative}</p>
                    {ins.recommended_action && (
                      <div className="text-xs font-mono text-sky-900 font-bold flex items-center gap-1.5 pt-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Action: {ins.recommended_action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. RECOMMENDED ACTION BANNER */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                OPERATIONAL RECOMMENDATION
              </div>
              <div className="text-base font-bold mt-0.5">
                {currentResult.health_prediction?.recommended_action || 'Continue standard production.'}
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <span>Verified Operator: {currentResult.operator_id || 'System'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. HISTORICAL AUDIT TRAIL TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">INSPECTION AUDIT HISTORY</h2>
            <p className="text-xs text-slate-500 font-mono">Itemized log of past optical and multimodal runs</p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl"
            >
              <option value="ALL">All Statuses</option>
              <option value="HEALTHY">Healthy</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        {loadingRecords ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">Loading audit records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">No inspection records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Inspection ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Tool</th>
                  <th className="p-3">Station</th>
                  <th className="p-3">Flank Wear</th>
                  <th className="p-3">Health</th>
                  <th className="p-3">RUL</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.slice(0, 10).map((r) => (
                  <tr key={r.inspection_id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">{r.inspection_id}</td>
                    <td className="p-3 text-slate-500">
                      {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'Just now'}
                    </td>
                    <td className="p-3 text-sky-700 font-bold">{r.tool_id}</td>
                    <td className="p-3 text-slate-600">{r.machine_id}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {r.wear_analysis?.wear_value !== undefined ? `${r.wear_analysis.wear_value.toFixed(3)} mm` : '-'}
                    </td>
                    <td className="p-3 font-bold text-emerald-600">{r.health_prediction?.health_score}%</td>
                    <td className="p-3 font-semibold text-sky-700">
                      {r.rul_prediction?.rul_value !== undefined && r.rul_prediction?.rul_value !== null
                        ? `${r.rul_prediction.rul_value} cyc`
                        : '-'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.health_prediction?.health_status === 'HEALTHY'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : r.health_prediction?.health_status === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {r.health_prediction?.health_status || 'HEALTHY'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedInspectionModal(r)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: INSPECTION DETAILS */}
      {selectedInspectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono text-sky-600 font-bold uppercase">AUDIT INSPECTION</span>
                <h3 className="text-xl font-bold text-slate-900">{selectedInspectionModal.inspection_id}</h3>
              </div>
              <button
                onClick={() => setSelectedInspectionModal(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="h-44 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                {selectedInspectionModal.images?.original ? (
                  <img
                    src={getImageUrl(selectedInspectionModal.images.original)}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs font-mono text-slate-500">Original</div>
                )}
              </div>
              <div className="h-44 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                {selectedInspectionModal.images?.annotated ? (
                  <img
                    src={getImageUrl(selectedInspectionModal.images.annotated)}
                    alt="Annotated"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs font-mono text-slate-500">Annotated</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400">TOOL</div>
                <div className="font-bold text-slate-900 mt-0.5">{selectedInspectionModal.tool_id}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400">WEAR (VB)</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedInspectionModal.wear_analysis?.wear_value?.toFixed(3) || '0.000'} mm
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400">HEALTH</div>
                <div className="font-bold text-emerald-600 mt-0.5">
                  {selectedInspectionModal.health_prediction?.health_score}%
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400">RUL</div>
                <div className="font-bold text-sky-700 mt-0.5">
                  {selectedInspectionModal.rul_prediction?.rul_value ?? '-'} cyc
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 space-y-1">
              <div><strong>Action:</strong> {selectedInspectionModal.health_prediction?.recommended_action || 'None'}</div>
              <div><strong>Machine:</strong> {selectedInspectionModal.machine_id}</div>
              <div><strong>Operator:</strong> {selectedInspectionModal.operator_id}</div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedInspectionModal(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-mono text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
