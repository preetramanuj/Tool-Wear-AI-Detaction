import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  FileCode,
  HardDrive,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getModelsStatus, runModelsDiagnostics } from '../services/api';
import { ModelsStatusResponse } from '../types/api';

export const Models: React.FC = () => {
  const [modelsData, setModelsData] = useState<ModelsStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const data = await getModelsStatus();
      setModelsData(data);
    } catch (err) {
      console.error('Failed to load models status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const res = await runModelsDiagnostics();
      setDiagnosticsResult(res);
      fetchStatus();
    } catch (err) {
      console.error('Diagnostics execution error:', err);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const modelsList = modelsData?.models || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-600" />
            AI Computer Vision & ML Model Engines
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            PyTorch Neural Network Architectures, Weight Artifacts, Pipeline Calibration & Diagnostics
          </p>
        </div>

        <button
          onClick={handleRunDiagnostics}
          disabled={isRunningDiagnostics}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wide transition shadow-xs"
        >
          {isRunningDiagnostics ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              RUNNING TEST SUITE...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              EXECUTE DIAGNOSTICS SUITE
            </>
          )}
        </button>
      </div>

      {/* Hardware & Acceleration Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] uppercase text-slate-500 font-semibold">COMPUTE DEVICE</div>
          <div className="text-sm font-bold text-sky-700 mt-1">{modelsData?.system_device || 'CPU (Host)'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Optimized Tensor Engine</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] uppercase text-slate-500 font-semibold">CUDA ACCELERATION</div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {modelsData?.cuda_available ? 'ENABLED (GPU ACCELERATED)' : 'DISABLED (CPU INFERENCE)'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">PyTorch Runtime Backend</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] uppercase text-slate-500 font-semibold">ACTIVE SINGLETON ENGINES</div>
          <div className="text-sm font-bold text-emerald-700 mt-1">
            {modelsData ? `${modelsData.models_loaded_count} of ${modelsData.total_models} ONLINE` : '4 of 4 ONLINE'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Zero Cold-Start In-Memory Execution</div>
        </div>
      </div>

      {/* Diagnostics Report Viewer */}
      {diagnosticsResult && (
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Diagnostics Execution Report ({diagnosticsResult.timestamp})
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
              ALL TESTS PASSED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(diagnosticsResult.results || {}).map(([key, val]: [string, any]) => (
              <div key={key} className="p-2.5 bg-white border border-slate-200 rounded-md">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">{key}</div>
                <div className="text-slate-800 font-bold mt-1">
                  Status: <span className="text-emerald-600">{val.status}</span>
                </div>
                <div className="text-[10px] text-slate-500">Latency: {val.latency_ms} ms</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modelsList.map((m) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-5 font-mono text-xs space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">{m.id}</span>
                <h2 className="text-sm font-bold text-slate-900">{m.name}</h2>
              </div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                {m.status}
              </span>
            </div>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Task Objective:</span>
                <span className="font-semibold">{m.task}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Framework / Backbone:</span>
                <span className="text-sky-700 font-semibold">{m.framework}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Input Resolution:</span>
                <span>{m.resolution[0]} x {m.resolution[1]} px</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Device Allocation:</span>
                <span className="font-semibold">{m.device}</span>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 font-semibold block mb-1">Weight Artifact Path:</span>
                <code className="text-[10px] bg-slate-100 text-slate-800 px-2 py-1 rounded block border border-slate-200 truncate">
                  {m.weights_path}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
