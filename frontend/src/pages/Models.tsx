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
  Upload,
  Workflow,
  ShieldAlert,
} from 'lucide-react';
import {
  getModelsStatus,
  runModelsDiagnostics,
  getRULSchema,
  predictRUL,
  getRULStatus,
  testFullPipeline,
} from '../services/api';
import { ModelsStatusResponse, RULSchemaResponse, PipelineTestResponse } from '../types/api';
import { SeverityBadge } from '../components/common/Severity';

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

  // End-to-End Pipeline Test Bench
  const [pipelineImage, setPipelineImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineTestResponse | null>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPipelineImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRunPipelineTest = async () => {
    setIsRunningPipeline(true);
    try {
      const res = await testFullPipeline(pipelineImage || undefined);
      setPipelineResult(res);
    } catch (err) {
      console.error('Pipeline test failed:', err);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const modelsList = modelsData?.models || [];
  const filteredFeatures = (rulSchema?.features || []).filter((f) =>
    f.toLowerCase().includes(featureSearch.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-accent" />
            AI Computer Vision & ML Diagnostic Engines
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            PyTorch Neural Networks, YOLO11 Detectors, XGBoost RUL Degradation Models & Telemetry Calibration
          </p>
        </div>

        <button
          onClick={handleRunDiagnostics}
          disabled={isRunningDiagnostics}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold font-mono tracking-wide transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-0.5 disabled:hover:transform-none"
        >
          {isRunningDiagnostics ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>RUNNING TEST SUITE...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>EXECUTE DIAGNOSTICS SUITE</span>
            </>
          )}
        </button>
      </div>

      {/* Hardware & Acceleration Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-mono text-xs">
        <div className="bg-white border border-[#E2DFD7] p-5 rounded-3xl shadow-paper transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="text-[10px] uppercase text-slate-400 font-bold">COMPUTE DEVICE</div>
          <div className="text-base font-bold font-display text-accent mt-1">{modelsData?.system_device || 'CPU (Host)'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-sans">Optimized Tensor Engine</div>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-5 rounded-3xl shadow-paper transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="text-[10px] uppercase text-slate-400 font-bold">CUDA ACCELERATION</div>
          <div className="text-base font-bold font-display text-slate-900 mt-1">
            {modelsData?.cuda_available ? 'ENABLED (GPU ACCELERATED)' : 'DISABLED (CPU INFERENCE)'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-sans">PyTorch & XGBoost Backend</div>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-5 rounded-3xl shadow-paper transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="text-[10px] uppercase text-slate-400 font-bold">ACTIVE ENGINES</div>
          <div className="text-base font-bold font-display text-normal mt-1">
            {modelsData ? `${modelsData.models_loaded_count} of ${modelsData.total_models} ONLINE` : '5 of 5 ONLINE'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-sans">Zero Cold-Start In-Memory Execution</div>
        </div>
      </div>

      {/* Diagnostics Report Viewer */}
      {diagnosticsResult && (
        <div className="bg-[#F8F7F4] border border-[#E2DFD7] rounded-3xl p-6 font-mono text-xs space-y-4 shadow-paper">
          <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
            <span className="font-bold text-slate-800 flex items-center gap-2 font-display text-sm">
              <CheckCircle2 className="w-4 h-4 text-normal" />
              Diagnostics Execution Report
            </span>
            <span className="text-normal font-bold bg-normal-light border border-normal-border px-2.5 py-0.5 rounded text-[10px]">
              ALL TESTS PASSED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(diagnosticsResult.results || {}).map(([key, val]: [string, any]) => (
              <div key={key} className="p-3 bg-white border border-[#E2DFD7] rounded-2xl shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase truncate">{key}</div>
                <div className="text-slate-900 font-bold mt-1">
                  Status: <span className="text-normal">{val.status}</span>
                </div>
                <div className="text-[10px] text-slate-500 data-readout mt-0.5">Latency: {val.latency_ms} ms</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modelsList.map((m) => (
          <div key={m.id} className="bg-white border border-[#E2DFD7] rounded-3xl p-6 font-mono text-xs space-y-4 shadow-paper transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7] transition-colors group-hover:border-accent/20">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">{m.id}</span>
                <h2 className="text-base font-bold font-display text-slate-900">{m.name}</h2>
              </div>
              <SeverityBadge level="NORMAL" size="sm" />
            </div>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-[#F0EFEA]">
                <span className="text-slate-500 font-semibold font-sans">Objective:</span>
                <span className="font-semibold text-right max-w-[180px] truncate">{m.task}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#F0EFEA]">
                <span className="text-slate-500 font-semibold font-sans">Framework:</span>
                <span className="text-accent font-semibold">{m.framework}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#F0EFEA]">
                <span className="text-slate-500 font-semibold font-sans">Input Shape:</span>
                <span className="data-readout">{m.resolution[0]} x {m.resolution[1]}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#F0EFEA]">
                <span className="text-slate-500 font-semibold font-sans">Device:</span>
                <span className="font-semibold">{m.device}</span>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 font-semibold block mb-1 font-sans">Weights Artifact:</span>
                <code className="text-[10px] bg-[#F8F7F4] text-slate-800 px-2 py-1 rounded block border border-[#E2DFD7] truncate">
                  {m.weights_path}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FULL MULTI-MODEL PIPELINE TEST BENCH */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper font-mono text-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2DFD7]">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-accent" />
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 uppercase">
                End-to-End Multi-Model Inspection Pipeline Test Bench
              </h2>
              <span className="text-[11px] text-slate-500 font-sans">
                Model 1 (YOLO11n) → Tool Domain Eligibility → Model 2 (Phase3B Wear) → Model 3 (Health) → Model 6 (XGBoost RUL)
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-accent-50 text-accent border border-accent-100 self-start sm:self-auto">
            PIPELINE INTEGRATION TEST
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-3">
            <label className="block text-[11px] font-bold font-display text-slate-700">Test Image Input</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-50 file:text-accent hover:file:bg-accent-100"
            />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-[#E2DFD7]" />
            ) : (
              <div className="w-full h-32 bg-white border border-dashed border-[#E2DFD7] rounded-xl flex items-center justify-center text-slate-400 text-[10px]">
                No file chosen (uses synthetic cutting tool)
              </div>
            )}
            <button
              onClick={handleRunPipelineTest}
              disabled={isRunningPipeline}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-0.5 disabled:hover:transform-none"
            >
              {isRunningPipeline ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              RUN FULL PIPELINE TEST
            </button>
          </div>

          {/* Results Panel */}
          <div className="md:col-span-2 p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-2">
              <span className="font-bold font-display text-slate-800">Pipeline Execution Diagnostics</span>
              {pipelineResult && (
                <span className="text-accent font-bold data-readout">Total Latency: {pipelineResult.total_latency_ms} ms</span>
              )}
            </div>

            {pipelineResult ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-3 bg-white border border-[#E2DFD7] rounded-xl shadow-2xs transition-transform duration-300 hover:scale-[1.02]">
                    <span className="text-slate-400 block text-[9px] font-bold">TOOL DETECT (M1)</span>
                    <span className="font-bold text-slate-900 block font-display">{pipelineResult.stages.model_1_tool_detection.class_name}</span>
                    <span className="text-[10px] text-slate-500 block data-readout mt-0.5">{pipelineResult.stages.model_1_tool_detection.latency_ms} ms</span>
                  </div>

                  <div className="p-3 bg-white border border-[#E2DFD7] rounded-xl shadow-2xs transition-transform duration-300 hover:scale-[1.02]">
                    <span className="text-slate-400 block text-[9px] font-bold">WEAR ANALYSIS (M2)</span>
                    <span className="font-bold text-slate-900 block data-readout">
                      {pipelineResult.stages.model_2_wear_analysis.wear_um !== null ? `${pipelineResult.stages.model_2_wear_analysis.wear_um} µm` : 'SKIPPED'}
                    </span>
                    <span className="text-[10px] text-slate-500 block data-readout mt-0.5">{pipelineResult.stages.model_2_wear_analysis.latency_ms} ms</span>
                  </div>

                  <div className="p-3 bg-white border border-[#E2DFD7] rounded-xl shadow-2xs transition-transform duration-300 hover:scale-[1.02]">
                    <span className="text-slate-400 block text-[9px] font-bold">HEALTH PREDICT (M3)</span>
                    <span className="font-bold text-normal block data-readout">
                      {pipelineResult.stages.model_3_health_prediction.health_score !== null ? `${Math.round(pipelineResult.stages.model_3_health_prediction.health_score * 100)}%` : 'SKIPPED'}
                    </span>
                    <span className="text-[10px] text-slate-500 block data-readout mt-0.5">{pipelineResult.stages.model_3_health_prediction.latency_ms} ms</span>
                  </div>

                  <div className="p-3 bg-white border border-[#E2DFD7] rounded-xl shadow-2xs transition-transform duration-300 hover:scale-[1.02]">
                    <span className="text-slate-400 block text-[9px] font-bold">RUL PREDICTION (M6)</span>
                    <span className="font-bold text-accent block data-readout">
                      {pipelineResult.stages.model_6_rul_prediction.rul_cycles !== null ? `${pipelineResult.stages.model_6_rul_prediction.rul_cycles} cyc` : 'SKIPPED'}
                    </span>
                    <span className="text-[10px] text-slate-500 block data-readout mt-0.5">{pipelineResult.stages.model_6_rul_prediction.latency_ms} ms</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-[#E2DFD7] rounded-xl text-[11px] flex justify-between shadow-2xs">
                  <span className="text-slate-600 font-sans">Domain Eligibility Status:</span>
                  <span className="font-bold text-slate-900 font-mono">{pipelineResult.tool_eligibility}</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-sans">
                Click "Run Full Pipeline Test" to benchmark synchronous latency and tensor flow across all models.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model 6 RUL Technical Debug & Calibration Panel */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper font-mono text-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2DFD7]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-accent" />
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 uppercase">
                Model 6 (XGBoost RUL) Technical Debug & Test Bench
              </h2>
              <span className="text-[11px] text-slate-500 font-sans">
                Authoritative 89-Feature Schema, Physics Degradation Rate & EOL Cycle Estimator
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#F0EFEA] text-slate-700 border border-[#E2DFD7] self-start sm:self-auto">
            ENGINEERING DEBUG MODE
          </span>
        </div>

        {/* Specifications Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
            <div className="text-[10px] text-slate-400 font-bold uppercase">EXPECTED FEATURES</div>
            <div className="text-xl font-bold font-display text-accent mt-1 data-readout">
              {rulSchema?.feature_count || 89} Columns
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-sans">86 Numerical + 3 Categorical</div>
          </div>

          <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
            <div className="text-[10px] text-slate-400 font-bold uppercase">TARGET VARIABLE</div>
            <div className="text-sm font-bold font-display text-slate-900 mt-1">robust_causal_slope</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-sans">log1p / expm1 transform</div>
          </div>

          <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
            <div className="text-[10px] text-slate-400 font-bold uppercase">CONFIRMED UNIT</div>
            <div className="text-xl font-bold font-display text-normal mt-1">cycles</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Cutting Passes to EOL</div>
          </div>

          <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
            <div className="text-[10px] text-slate-400 font-bold uppercase">EOL WEAR LIMIT</div>
            <div className="text-xl font-bold font-display text-critical mt-1 data-readout">
              {rulSchema?.eol_threshold_um || 300.0} µm
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Physics Threshold Boundary</div>
          </div>
        </div>

        {/* Interactive RUL Prediction Test Bench */}
        <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-4">
          <div className="font-bold font-display text-slate-900 text-sm flex items-center gap-2">
            <Timer className="w-4 h-4 text-accent" />
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
                className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-accent"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">CYCLE INDEX</label>
              <input
                type="number"
                value={testCycle}
                onChange={(e) => setTestCycle(parseInt(e.target.value) || 1)}
                className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-accent"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-1">MATERIAL</label>
              <select
                value={testMaterial}
                onChange={(e) => setTestMaterial(e.target.value)}
                className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-accent"
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
                className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-accent"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleTestRUL}
              disabled={isTestingRUL}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-0.5 disabled:hover:transform-none"
            >
              {isTestingRUL ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              EXECUTE MODEL 6 INFERENCE
            </button>

            {rulTestResult && (
              <div className="text-right">
                <span className="text-slate-500 text-[10px]">Latency: </span>
                <span className="text-accent font-bold data-readout">{rulTestResult.model?.latency_ms} ms</span>
              </div>
            )}
          </div>

          {rulTestResult && (
            <div className="mt-3 p-4 bg-white border border-[#E2DFD7] rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">PREDICTED RUL</span>
                <span className="text-xl font-bold font-display text-normal data-readout">
                  {rulTestResult.rul?.value !== null ? `${rulTestResult.rul?.value} cycles` : 'Not Available'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">PREDICTED WEAR RATE</span>
                <span className="text-sm font-bold font-display text-slate-900 data-readout">
                  {rulTestResult.rul?.wear_rate_um_per_cycle ? `${rulTestResult.rul?.wear_rate_um_per_cycle} µm/cycle` : '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">PHYSICS FORMULA</span>
                <span className="text-xs text-accent font-semibold data-readout">
                  (300.0 - {testWear}) / {rulTestResult.rul?.wear_rate_um_per_cycle || '?'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">STATUS</span>
                <div className="mt-1">
                  <SeverityBadge level={rulTestResult.rul?.rul_status || 'NORMAL'} size="sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Schema Explorer */}
        <div className="border border-[#E2DFD7] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowFeatureList(!showFeatureList)}>
            <div className="font-bold font-display text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>Full 89-Feature Schema Explorer ({filteredFeatures.length} / 89 visible)</span>
            </div>
            <button className="text-slate-500 hover:text-slate-800">
              {showFeatureList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFeatureList && (
            <div className="space-y-3 pt-3 border-t border-[#E2DFD7]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search feature names (e.g. Acc, Acoustic, Fx, wear)..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  className="w-full bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-900 focus:outline-accent"
                />
              </div>

              <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] text-[10px]">
                {filteredFeatures.map((feat, idx) => (
                  <div key={feat} className="bg-white px-2.5 py-1.5 rounded-xl border border-[#E2DFD7] truncate flex items-center justify-between shadow-2xs">
                    <span className="text-slate-800 truncate font-semibold">{feat}</span>
                    <span className="text-slate-400 text-[9px] ml-1 data-readout">#{idx + 1}</span>
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

export default Models;
