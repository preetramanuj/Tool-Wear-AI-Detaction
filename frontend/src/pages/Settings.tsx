import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Database,
  Camera,
  Cpu,
  Save,
  CheckCircle2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [detectionConf, setDetectionConf] = useState<number>(0.25);
  const [wearThresholdWarning, setWearThresholdWarning] = useState<number>(150);
  const [wearThresholdCritical, setWearThresholdCritical] = useState<number>(250);
  const [cameraFps, setCameraFps] = useState<number>(3);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-sky-600" />
            System Configuration & AI Hyperparameters
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inference Thresholds, Spatial Tolerances, SQLite Storage Paths & Pipeline Defaults
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg font-bold">
            <CheckCircle2 className="w-4 h-4" /> PARAMETERS SAVED
          </div>
        )}
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: AI Vision Inference Thresholds */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
              <Cpu className="w-4 h-4 text-sky-600" />
              AI Model Inference Thresholds
            </h2>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-600 font-semibold">Model 1 (YOLO11) Confidence Minimum</label>
                  <span className="font-bold text-sky-700">{(detectionConf * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={detectionConf}
                  onChange={(e) => setDetectionConf(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-600 font-semibold">Wear Warning Threshold (µm)</label>
                  <span className="font-bold text-amber-600">{wearThresholdWarning} µm</span>
                </div>
                <input
                  type="number"
                  value={wearThresholdWarning}
                  onChange={(e) => setWearThresholdWarning(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-600 font-semibold">Wear Critical Limit (µm)</label>
                  <span className="font-bold text-rose-600">{wearThresholdCritical} µm</span>
                </div>
                <input
                  type="number"
                  value={wearThresholdCritical}
                  onChange={(e) => setWearThresholdCritical(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Optical Stream & Hardware */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
              <Camera className="w-4 h-4 text-sky-600" />
              Live Webcam Stream Settings
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Target Streaming FPS</label>
                <select
                  value={cameraFps}
                  onChange={(e) => setCameraFps(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800"
                >
                  <option value={1}>1 FPS (Ultra Low Power)</option>
                  <option value={3}>3 FPS (Industrial Default)</option>
                  <option value={5}>5 FPS (Continuous Real-Time)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Database Storage Location</label>
                <input
                  type="text"
                  disabled
                  value="storage/toolguard.db (SQLite Embedded)"
                  className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Face Vector Registration Enclave</label>
                <input
                  type="text"
                  disabled
                  value="storage/face/registered/ (Local Directory)"
                  className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-bold tracking-wide transition shadow-xs"
          >
            <Save className="w-4 h-4" />
            SAVE SYSTEM CONFIGURATION
          </button>
        </div>
      </form>
    </div>
  );
};
