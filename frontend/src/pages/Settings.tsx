import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Database,
  Camera,
  Cpu,
  Save,
  CheckCircle2,
  Bell,
  HardDrive,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getModelsStatus } from '../services/api';
import { ModelsStatusResponse } from '../types/api';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'thresholds' | 'notifications' | 'models' | 'system'>('general');
  const [detectionConf, setDetectionConf] = useState<number>(0.25);
  const [wearWarningUm, setWearWarningUm] = useState<number>(220);
  const [wearCriticalUm, setWearCriticalUm] = useState<number>(300);
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [webhookAlerts, setWebhookAlerts] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [modelsData, setModelsData] = useState<ModelsStatusResponse | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  useEffect(() => {
    getModelsStatus().then(setModelsData).catch(() => null);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const coreModelsList = [
    {
      id: 'tool_detection',
      name: 'Tool Detection',
      loaded: true,
      task: 'Tool presence localization & bounding box estimation',
      framework: 'Ultralytics YOLO11n',
      weights: 'result/tool_detection/yolo11_matwi_10epochs/weights/best.pt',
    },
    {
      id: 'wear_analysis',
      name: 'Wear Analysis',
      loaded: true,
      task: 'Multimodal flank wear land regression (VB mm & µm)',
      framework: 'PyTorch Phase3B Gated Model (EfficientNet-B0 + Sensor MLP)',
      weights: 'ai/wear_analysis/artifacts/final/wear_analysis_multimodal_final.pth',
    },
    {
      id: 'health_prediction',
      name: 'Health Prediction',
      loaded: true,
      task: 'Cutting edge condition diagnostic classification',
      framework: 'PyTorch Image-Only Regression Model',
      weights: 'models/health_prediction/image_only_wear/model.pt',
    },
    {
      id: 'face_detection',
      name: 'Face Detection',
      loaded: true,
      task: 'Operator facial presence & safety authorization',
      framework: 'YOLO11n Face Engine + OpenCV Verification',
      weights: 'yolo11n.pt',
    },
    {
      id: 'rul_prediction',
      name: 'RUL Prediction',
      loaded: true,
      task: 'Remaining Useful Life degradation cycle forecasting',
      framework: 'XGBoost 89-feature degradation regressor',
      weights: 'models/rul/final/xgb_rul_final.pkl',
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            SETTINGS & SYSTEM CONFIGURATION
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Configure operational thresholds, alerts, model diagnostic engines, and storage parameters
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved Successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'general' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'thresholds' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Thresholds
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'notifications' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'models' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Models
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'system' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          System
        </button>
      </div>

      {/* TAB CONTENT */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans pb-3 border-b border-slate-100">
              General Plant Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Facility Name</label>
                <input
                  type="text"
                  defaultValue="Precision Machining Plant #01"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Default CNC Station</label>
                <input
                  type="text"
                  defaultValue="CNC-LATHE-01"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Currency Symbol</label>
                <input
                  type="text"
                  defaultValue="₹"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Standard Machining Batch Size</label>
                <input
                  type="number"
                  defaultValue={50}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. THRESHOLDS TAB */}
        {activeTab === 'thresholds' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans pb-3 border-b border-slate-100">
              Tool Degradation Warning & Critical Limits
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700 uppercase">Warning Threshold</span>
                  <strong className="text-amber-600">{wearWarningUm} µm (0.22 mm)</strong>
                </div>
                <input
                  type="number"
                  value={wearWarningUm}
                  onChange={(e) => setWearWarningUm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
                <p className="text-[11px] text-slate-500 font-sans">Triggers maintenance scheduling notification.</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700 uppercase">Critical ISO EOL Limit</span>
                  <strong className="text-rose-600">{wearCriticalUm} µm (0.30 mm)</strong>
                </div>
                <input
                  type="number"
                  value={wearCriticalUm}
                  onChange={(e) => setWearCriticalUm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold"
                />
                <p className="text-[11px] text-slate-500 font-sans">Triggers immediate tool replacement alarm.</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans pb-3 border-b border-slate-100">
              Notification Channels
            </h2>

            <div className="space-y-4 font-mono text-xs">
              <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <div className="font-bold text-slate-900">Email Notifications for Critical Breaches</div>
                  <div className="text-slate-500 font-sans text-[11px]">Send automatic alerts to plant supervisor when a tool reaches 0.30 mm ISO wear limit.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookAlerts}
                  onChange={(e) => setWebhookAlerts(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <div>
                  <div className="font-bold text-slate-900">Webhook Integration (MES / SCADA)</div>
                  <div className="text-slate-500 font-sans text-[11px]">Publish MQTT/HTTP payload on tool state change.</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 4. MODELS TAB (TECHNICAL INFORMATION STAYS HERE) */}
        {activeTab === 'models' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 font-sans">
                AI Diagnostic Engine Models
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Technical diagnostic pipelines and weight artifact status
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {coreModelsList.map((m) => {
                const isExpanded = expandedModel === m.id;
                return (
                  <div
                    key={m.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 hover:bg-slate-50 transition space-y-2 cursor-pointer"
                    onClick={() => setExpandedModel(isExpanded ? null : m.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-slate-900 font-sans">{m.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Loaded
                        </span>
                      </div>
                      <button type="button" className="text-slate-400 p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600 font-sans">
                      {m.task}
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-700">
                        <div><span className="text-slate-400 font-bold">Framework:</span> {m.framework}</div>
                        <div><span className="text-slate-400 font-bold">Weights Path:</span> <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900">{m.weights}</code></div>
                        <div><span className="text-slate-400 font-bold">Status:</span> <strong className="text-emerald-700">Active & Serving on FastAPI</strong></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. SYSTEM TAB */}
        {activeTab === 'system' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans pb-3 border-b border-slate-100">
              System Health & Database
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Database Engine</div>
                <div className="text-base font-bold text-slate-900 mt-1">PostgreSQL</div>
                <div className="text-[10px] text-slate-500 mt-0.5">toolguard.db (Mounted)</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-slate-400 font-bold uppercase text-[10px]">FastAPI Backend</div>
                <div className="text-base font-bold text-emerald-600 mt-1">Online (Uvicorn)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Port 8000 • CORS Enabled</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Image Storage</div>
                <div className="text-base font-bold text-slate-900 mt-1">Local /storage/</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Uploaded & Processed HUD</div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold font-mono text-xs transition shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
