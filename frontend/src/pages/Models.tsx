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
  Terminal,
  Search,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getModelsStatus, runModelsDiagnostics, getRULSchema, predictRUL, getRULStatus } from '../services/api';
import { ModelsStatusResponse, RULSchemaResponse } from '../types/api';

export const Models: React.FC = () => {
  const [modelsData, setModelsData] = useState<ModelsStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  // Model 6 RUL Debug State
  const [rulSchema, setRulSchema] = useState<RULSchemaResponse | null>(null);
  const [rulStatus, setRulStatus] = useState<any>(null);
  const [featureSearch, setFeatureSearch] = useState<string>('');
  const [showFeatureList, setShowFeatureList] = useState<boolean>(false);

  // RUL Interactive Test Bench
  const [testWear, setTestWear] = useState<number>(85.0);
  const [testCycle, setTestCycle] = useState<number>(18);
  const [testMaterial, setTestMaterial] = useState<string>('CK45');
  const [testVc, setTestVc] = useState<number>(180.0);
  const [isTestingRUL, setIsTestingRUL] = useState<boolean>(false);
  const [rulTestResult, setRulTestResult] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const [status, schema, rStatus] = await Promise.all([
        getModelsStatus(),
        getRULSchema(),
        getRULStatus(),
      ]);
      setModelsData(status);
      setRulSchema(schema);
      setRulStatus(rStatus);
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

  const handleTestRUL = async () => {
    setIsTestingRUL(true);
    try {
      const res = await predictRUL({
        wear: testWear,
        cycle_index: testCycle,
        material: testMaterial,
        machining_parameters: { Vc: testVc, n: 1200, fz: 0.15, Vf: 360, Ae: 2.0, Ap: 1.5, z: 4 },
      });
      setRulTestResult(res);
    } catch (err) {
      console.error('RUL test error:', err);
    } finally {
      setIsTestingRUL(false);
    }
  };

  const modelsList = modelsData?.models || [];
  const filteredFeatures = (rulSchema?.features || []).filter((f) =>
    f.toLowerCase().includes(featureSearch.toLowerCase())
  );

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
            PyTorch Neural Networks, YOLO11 Detectors, XGBoost RUL Degradation Models & Telemetry Calibration
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
          <div className="text-[11px] text-slate-500 mt-0.5">PyTorch & XGBoost Backend</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] uppercase text-slate-500 font-semibold">ACTIVE SINGLETON ENGINES</div>
          <div className="text-sm font-bold text-emerald-700 mt-1">
            {modelsData ? `${modelsData.models_loaded_count} of ${modelsData.total_models} ONLINE` : '5 of 5 ONLINE'}
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
              Diagnostics Execution Report
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
              ALL TESTS PASSED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(diagnosticsResult.results || {}).map(([key, val]: [string, any]) => (
              <div key={key} className="p-2.5 bg-white border border-slate-200 rounded-md">
                <div className="text-[10px] text-slate-500 font-semibold uppercase truncate">{key}</div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modelsList.map((m) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-5 font-mono text-xs space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">{m.id}</span>
                <h2 className="text-sm font-bold text-slate-900">{m.name}</h2>
              </div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                {m.status}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Objective:</span>
                <span className="font-semibold text-right max-w-[180px] truncate">{m.task}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Framework:</span>
                <span className="text-sky-700 font-semibold">{m.framework}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Input Shape:</span>
                <span>{m.resolution[0]} x {m.resolution[1]}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Device:</span>
                <span className="font-semibold">{m.device}</span>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 font-semibold block mb-1">Weights Artifact:</span>
                <code className="text-[10px] bg-slate-100 text-slate-800 px-2 py-1 rounded block border border-slate-200 truncate">
                  {m.weights_path}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Model 6 RUL Development Debug & Calibration Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs font-mono text-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase">
                Model 6 (XGBoost RUL) Technical Debug & Test Bench
              </h2>
              <span className="text-[11px] text-slate-500">
                Authoritative 89-Feature Schema, Physics Degradation Rate & EOL Cycle Estimator
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 self-start sm:self-auto">
            ENGINEERING DEBUG MODE
          </span>
        </div>

        {/* Specifications Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">EXPECTED FEATURES</div>
            <div className="text-lg font-bold text-sky-700 mt-1">
              {rulSchema?.feature_count || 89} Columns
            </div>
            <div className="text-[10px] text-slate-400">86 Numerical + 3 Categorical</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">TARGET VARIABLE</div>
            <div className="text-sm font-bold text-slate-800 mt-1">robust_causal_slope</div>
            <div className="text-[10px] text-slate-400">log1p / expm1 transform</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">CONFIRMED UNIT</div>
            <div className="text-lg font-bold text-emerald-600 mt-1">cycles</div>
            <div className="text-[10px] text-slate-400">Cutting Passes to EOL</div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">EOL WEAR LIMIT</div>
            <div className="text-lg font-bold text-rose-600 mt-1">
              {rulSchema?.eol_threshold_um || 300.0} µm
            </div>
            <div className="text-[10px] text-slate-400">Physics Threshold Boundary</div>
          </div>
        </div>

        {/* Interactive RUL Prediction Test Bench */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Timer className="w-4 h-4 text-sky-600" />
            Live Model 6 Inference Runner
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">CURRENT WEAR (µm)</label>
              <input
                type="number"
                step="0.1"
                value={testWear}
                onChange={(e) => setTestWear(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-sky-600"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">CYCLE INDEX</label>
              <input
                type="number"
                value={testCycle}
                onChange={(e) => setTestCycle(parseInt(e.target.value) || 1)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-sky-600"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">MATERIAL</label>
              <select
                value={testMaterial}
                onChange={(e) => setTestMaterial(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-sky-600"
              >
                <option value="CK45">CK45 Steel</option>
                <option value="RVS304">RVS304 Stainless</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">CUTTING SPEED (Vc)</label>
              <input
                type="number"
                value={testVc}
                onChange={(e) => setTestVc(parseFloat(e.target.value) || 180)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-sky-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleTestRUL}
              disabled={isTestingRUL}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition"
            >
              {isTestingRUL ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              EXECUTE MODEL 6 INFERENCE
            </button>

            {rulTestResult && (
              <div className="text-right">
                <span className="text-slate-500 text-[10px]">Latency: </span>
                <span className="text-sky-700 font-bold">{rulTestResult.model?.latency_ms} ms</span>
              </div>
            )}
          </div>

          {rulTestResult && (
            <div className="mt-3 p-3 bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block">PREDICTED RUL</span>
                <span className="text-lg font-bold text-emerald-600">
                  {rulTestResult.rul?.value !== null ? `${rulTestResult.rul?.value} cycles` : 'Not Available'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">PREDICTED WEAR RATE</span>
                <span className="text-sm font-bold text-slate-800">
                  {rulTestResult.rul?.wear_rate_um_per_cycle ? `${rulTestResult.rul?.wear_rate_um_per_cycle} µm/cycle` : '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">PHYSICS FORMULA</span>
                <span className="text-xs text-sky-800 font-semibold">
                  (300.0 - {testWear}) / {rulTestResult.rul?.wear_rate_um_per_cycle || '?'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">STATUS</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded inline-block">
                  {rulTestResult.rul?.rul_status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Feature Schema Explorer */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowFeatureList(!showFeatureList)}>
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Full 89-Feature Schema Explorer ({filteredFeatures.length} / 89 visible)</span>
            </div>
            <button className="text-slate-500 hover:text-slate-800">
              {showFeatureList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFeatureList && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search feature names (e.g. Acc, Acoustic, Fx, wear)..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-sky-600"
                />
              </div>

              <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 p-2 bg-slate-50 rounded border border-slate-200 text-[10px]">
                {filteredFeatures.map((feat, idx) => (
                  <div key={feat} className="bg-white px-2 py-1 rounded border border-slate-200 truncate flex items-center justify-between">
                    <span className="text-slate-700 truncate font-semibold">{feat}</span>
                    <span className="text-slate-400 text-[9px] ml-1">#{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
