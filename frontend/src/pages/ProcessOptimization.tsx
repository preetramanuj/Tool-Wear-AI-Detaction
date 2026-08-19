import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Clock,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  ArrowRight,
  FileDown,
  FileCheck,
  Check,
  X,
} from 'lucide-react';
import {
  getTools,
  optimizeProcessParameters,
  getOptimizationConstraints,
  getOptimizationHistory,
  approveOptimizationRecommendation,
} from '../services/api';
import {
  Tool,
  ProcessOptimizationResult,
  ProcessOptimizationRecord,
  ProcessOptimizationParameters,
} from '../types/api';

export const ProcessOptimization: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');
  const [selectedMachine, setSelectedMachine] = useState<string>('CNC-LATHE-01');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('CK45 / Alloy Steel');
  const [selectedObjective, setSelectedObjective] = useState<'MAXIMIZE_TOOL_LIFE' | 'MAXIMIZE_PRODUCTIVITY' | 'BALANCED'>('MAXIMIZE_TOOL_LIFE');

  // Current Parameters
  const [rpm, setRpm] = useState<number>(3184);
  const [feedRate, setFeedRate] = useState<number>(0.050);
  const [depthOfCut, setDepthOfCut] = useState<number>(1.0);

  // Optimization State
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationStage, setOptimizationStage] = useState<number>(0);
  const [result, setResult] = useState<ProcessOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);

  // History & Audit Table
  const [history, setHistory] = useState<ProcessOptimizationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [selectedModalRecord, setSelectedModalRecord] = useState<ProcessOptimizationRecord | null>(null);

  useEffect(() => {
    getTools().then(setTools).catch(() => null);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const records = await getOptimizationHistory(0, 50);
      setHistory(records || []);
    } catch (err) {
      console.error('Failed to load optimization history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setError(null);
    setResult(null);
    setIsApproved(false);
    setOptimizationStage(1);

    const timer1 = setTimeout(() => setOptimizationStage(2), 400);
    const timer2 = setTimeout(() => setOptimizationStage(3), 800);
    const timer3 = setTimeout(() => setOptimizationStage(4), 1200);

    try {
      const res = await optimizeProcessParameters({
        tool_id: selectedToolId,
        machine_id: selectedMachine,
        material: selectedMaterial,
        objective: selectedObjective,
        parameters: {
          n: Number(rpm),
          fz: Number(feedRate),
          Ap: Number(depthOfCut),
        },
      });
      setResult(res);
      fetchHistory();
    } catch (err: any) {
      console.error('Optimization failed:', err);
      setError(err?.response?.data?.detail || err?.message || 'Process parameter optimization failed.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsOptimizing(false);
      setOptimizationStage(0);
    }
  };

  const handleApprove = async () => {
    if (!result) return;
    try {
      await approveOptimizationRecommendation(result.optimization_id, true);
      setIsApproved(true);
      fetchHistory();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  return (
    <div className="p-6 md:p-12 space-y-12 max-w-6xl mx-auto font-sans text-slate-800">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">
              MODEL 10
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              PROCESS PARAMETER OPTIMIZATION
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-mono">
            Constrained process parameter recommendation based on empirical tool wear dynamics.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Decision Support — Engineer Approval Required
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TARGET CONFIGURATION (TOOL, MACHINE, MATERIAL) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
            STEP 1 — TARGET CONFIGURATION
          </span>
          <h2 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
            Select Tool, Machine Station & Workpiece Material
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
          <div className="space-y-2">
            <label className="text-slate-500 font-bold block">1. Cutting Tool</label>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white transition"
            >
              {tools.map((t) => (
                <option key={t.tool_id} value={t.tool_id}>
                  {t.tool_id} ({t.tool_name})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-slate-500 font-bold block">2. Machine Station</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white transition"
            >
              <option value="CNC-LATHE-01">CNC-LATHE-01 (Heavy Turning)</option>
              <option value="CNC-MILL-02">CNC-MILL-02 (5-Axis Milling)</option>
              <option value="CNC-LATHE-03">CNC-LATHE-03 (Precision Lathe)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-slate-500 font-bold block">3. Workpiece Material</label>
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white transition"
            >
              <option value="CK45 / Alloy Steel">CK45 / Alloy Steel (Standard)</option>
              <option value="RVS304 / Stainless Steel">RVS304 / Stainless Steel</option>
              <option value="Mild Steel (AISI 1045)">Mild Steel (AISI 1045)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. CURRENT PARAMETERS & OBJECTIVE SELECTION */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CURRENT PARAMETERS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6 font-mono">
          <div>
            <span className="text-xs uppercase tracking-wider text-sky-600 font-bold">
              STEP 2 — CURRENT PARAMETERS
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
              Enter Current Machine Telemetry
            </h2>
          </div>

          <div className="space-y-5">
            {/* RPM */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">Spindle Speed (n):</span>
                <span className="text-sky-700 font-black text-sm">{rpm} RPM</span>
              </div>
              <input
                type="range"
                min="2000"
                max="5000"
                step="50"
                value={rpm}
                onChange={(e) => setRpm(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Min: 2547 RPM</span>
                <span>Max: 3705 RPM</span>
              </div>
            </div>

            {/* Feed Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">Feed per Tooth (fz):</span>
                <span className="text-sky-700 font-black text-sm">{feedRate.toFixed(3)} mm/tooth</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.10"
                step="0.005"
                value={feedRate}
                onChange={(e) => setFeedRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Min: 0.030 mm/tooth</span>
                <span>Max: 0.080 mm/tooth</span>
              </div>
            </div>

            {/* Depth of Cut */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">Depth of Cut (Ap):</span>
                <span className="text-sky-700 font-black text-sm">{depthOfCut.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.0"
                step="0.1"
                value={depthOfCut}
                onChange={(e) => setDepthOfCut(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Min: 0.5 mm</span>
                <span>Max: 1.0 mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* OPTIMIZATION OBJECTIVE */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
              STEP 3 — OPTIMIZATION OBJECTIVE
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
              Select Pareto Target Goal
            </h2>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Objective 1 */}
            <button
              type="button"
              onClick={() => setSelectedObjective('MAXIMIZE_TOOL_LIFE')}
              className={`w-full text-left p-4 rounded-2xl border transition ${
                selectedObjective === 'MAXIMIZE_TOOL_LIFE'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900'
                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm">
                <span>1. Maximize Tool Life</span>
                <span className="text-xs text-emerald-700">90% Wear / 10% Prod</span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Minimizes flank wear rate (µm/cycle) to maximize the number of cutting cycles before insert replacement.
              </p>
            </button>

            {/* Objective 2 */}
            <button
              type="button"
              onClick={() => setSelectedObjective('MAXIMIZE_PRODUCTIVITY')}
              className={`w-full text-left p-4 rounded-2xl border transition ${
                selectedObjective === 'MAXIMIZE_PRODUCTIVITY'
                  ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 text-sky-900'
                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm">
                <span>2. Maximize Productivity</span>
                <span className="text-xs text-sky-700">90% Prod / 10% Wear</span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Maximizes Material Removal Rate (MRR) to achieve fastest machining cycle times and throughput.
              </p>
            </button>

            {/* Objective 3 */}
            <button
              type="button"
              onClick={() => setSelectedObjective('BALANCED')}
              className={`w-full text-left p-4 rounded-2xl border transition ${
                selectedObjective === 'BALANCED'
                  ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900'
                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-sm">
                <span>3. Balanced Tradeoff</span>
                <span className="text-xs text-indigo-700">50% Prod / 50% Wear</span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Equally balances throughput with wear longevity on the empirical Pareto frontier.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. RUN OPTIMIZATION BUTTON & PROGRESS */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-sans">
              Execute Model 10 Optimization
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Empirical candidate search evaluating 14 verified configurations against ISO 300 µm wear limits.
            </p>
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            className="flex items-center justify-center gap-2.5 px-8 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-sm font-bold font-mono transition shadow-xs disabled:opacity-50"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Optimizing Parameters...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>[ Run Process Optimization ]</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-mono flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PROGRESS STAGES */}
        {isOptimizing && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100 font-mono text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>✓ Input validated</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 1 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400'}`}>
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
              <span>● Searching candidates</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 2 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400'}`}>
              <span>○ Checking constraints</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 3 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400'}`}>
              <span>○ Scoring Pareto front</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 4 ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-400'}`}>
              <span>○ Selecting best</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. OPTIMIZATION RESULT: CURRENT VS RECOMMENDED */}
      {/* ============================================================ */}
      {result && (
        <div className="space-y-10 animate-in fade-in duration-200">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CURRENT PARAMETERS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                    BASELINE TELEMETRY
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
                    CURRENT PARAMETERS
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Configured
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Spindle Speed</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {result.current_parameters.n}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">RPM</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Feed per Tooth</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {result.current_parameters.fz.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">mm/tooth</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Depth of Cut</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {result.current_parameters.Ap.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">mm</div>
                </div>
              </div>
            </div>

            {/* RECOMMENDED PARAMETERS */}
            <div className="bg-white border-2 border-sky-500 rounded-3xl p-8 shadow-sm space-y-6 relative overflow-hidden">
              <div className="pb-4 border-b border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
                    MODEL 10 RECOMMENDATION
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
                    RECOMMENDED PARAMETERS
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                  Score: {result.optimization_score?.toFixed(4) || 'Optimal'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-2xl">
                  <div className="text-[10px] text-sky-700 font-bold uppercase">Spindle Speed</div>
                  <div className="text-2xl font-black text-sky-900 mt-1">
                    {result.recommended_parameters.n}
                  </div>
                  <div className="text-[10px] text-sky-600 mt-0.5">RPM</div>
                </div>

                <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-2xl">
                  <div className="text-[10px] text-sky-700 font-bold uppercase">Feed per Tooth</div>
                  <div className="text-2xl font-black text-sky-900 mt-1">
                    {result.recommended_parameters.fz.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-sky-600 mt-0.5">mm/tooth</div>
                </div>

                <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-2xl">
                  <div className="text-[10px] text-sky-700 font-bold uppercase">Depth of Cut</div>
                  <div className="text-2xl font-black text-sky-900 mt-1">
                    {result.recommended_parameters.Ap.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-sky-600 mt-0.5">mm</div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 6. EXPECTED IMPACT METRICS */}
          {/* ============================================================ */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
                EXPECTED IMPACT
              </span>
              <h2 className="text-2xl font-bold text-slate-900 font-sans mt-0.5">
                Empirical Performance Projections
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 font-mono">
              {/* Wear Rate */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  Estimated Wear Rate
                </div>
                <div className="text-2xl font-black text-emerald-600">
                  {result.expected_impact.recommended_wear_rate_um_per_cycle.toFixed(4)} µm/cyc
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  From {result.expected_impact.current_wear_rate_um_per_cycle.toFixed(4)} µm/cyc ({result.expected_impact.estimated_wear_reduction_percent > 0 ? `-${result.expected_impact.estimated_wear_reduction_percent}% wear` : 'Optimal'})
                </div>
              </div>

              {/* Productivity (MRR) */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  Productivity (MRR)
                </div>
                <div className="text-2xl font-black text-sky-800">
                  {result.expected_impact.recommended_mrr.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  Baseline: {result.expected_impact.current_mrr.toFixed(1)} ({result.expected_impact.estimated_mrr_change_percent >= 0 ? `+${result.expected_impact.estimated_mrr_change_percent}%` : `${result.expected_impact.estimated_mrr_change_percent}%`})
                </div>
              </div>

              {/* Projected Cycles */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Projected Life to EOL
                </div>
                <div className="text-2xl font-black text-indigo-700">
                  {result.expected_impact.recommended_projected_rul_cycles} cyc
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  Estimated +{result.expected_impact.estimated_cycle_life_gain} cycles gain to 300 µm
                </div>
              </div>

              {/* Data Provenance */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-500" />
                  Data Provenance
                </div>
                <div className="text-lg font-black text-slate-800 mt-1">
                  Empirical Pareto
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  14 Experimental Runs Validated
                </div>
              </div>
            </div>

            {/* Explanation & Reasoning Card */}
            <div className="p-6 bg-sky-50/50 border border-sky-200 rounded-2xl space-y-2 font-mono text-xs">
              <div className="font-bold text-sky-900 uppercase text-[11px] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-600" />
                WHY THIS RECOMMENDATION?
              </div>
              <p className="text-slate-700 font-sans leading-relaxed text-sm">
                {result.explanation}
              </p>
            </div>

            {/* Engineer Approval Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>AI Recommendation — Engineer Approval Required</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isApproved}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-xs ${
                    isApproved
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isApproved ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Approved by Engineer</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>[ Approve & Log Recommendation ]</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. OPTIMIZATION HISTORY AUDIT LEDGER */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-sans">
              Process Optimization History ({history.length})
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Click any recommendation to inspect parameter adjustments and impact logs
            </p>
          </div>

          <button
            onClick={fetchHistory}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold transition border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="p-4">Opt ID</th>
                <th className="p-4">Tool</th>
                <th className="p-4">Objective</th>
                <th className="p-4">Current (RPM / fz / Ap)</th>
                <th className="p-4">Recommended (RPM / fz / Ap)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-mono">
                    No parameter optimization history found.
                  </td>
                </tr>
              ) : (
                history.map((rec) => (
                  <tr
                    key={rec.optimization_id}
                    onClick={() => setSelectedModalRecord(rec)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="p-4 font-bold text-slate-900">{rec.optimization_id}</td>
                    <td className="p-4 font-bold text-sky-700">{rec.tool_id}</td>
                    <td className="p-4 font-bold text-slate-700">{rec.objective.replace(/_/g, ' ')}</td>
                    <td className="p-4 text-slate-600">
                      {rec.current_parameters?.n} / {rec.current_parameters?.fz} / {rec.current_parameters?.Ap}
                    </td>
                    <td className="p-4 font-bold text-sky-800">
                      {rec.recommended_parameters?.n} / {rec.recommended_parameters?.fz} / {rec.recommended_parameters?.Ap}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          rec.approved_by_operator
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        ● {rec.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-500 font-sans">
                      {rec.timestamp ? rec.timestamp.replace('T', ' ').substring(0, 16) : 'Recently'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 8. DETAIL MODAL */}
      {/* ============================================================ */}
      {selectedModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  OPTIMIZATION AUDIT DOSSIER
                </span>
                <h3 className="text-2xl font-bold text-slate-900">
                  {selectedModalRecord.optimization_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedModalRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Tool ID</span>
                <strong className="text-slate-900 text-sm">{selectedModalRecord.tool_id}</strong>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Machine</span>
                <strong className="text-slate-900 text-sm">{selectedModalRecord.machine_id}</strong>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Objective</span>
                <strong className="text-sky-700 text-sm">{selectedModalRecord.objective}</strong>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Approval Status</span>
                <strong className="text-emerald-700 text-sm">{selectedModalRecord.status}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-400 font-bold block uppercase text-[10px] mb-1">Current Parameters</span>
                <div>RPM: <strong>{selectedModalRecord.current_parameters?.n}</strong></div>
                <div>Feed fz: <strong>{selectedModalRecord.current_parameters?.fz}</strong> mm/tooth</div>
                <div>Depth Ap: <strong>{selectedModalRecord.current_parameters?.Ap}</strong> mm</div>
              </div>

              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200">
                <span className="text-sky-700 font-bold block uppercase text-[10px] mb-1">Recommended Parameters</span>
                <div>RPM: <strong>{selectedModalRecord.recommended_parameters?.n}</strong></div>
                <div>Feed fz: <strong>{selectedModalRecord.recommended_parameters?.fz}</strong> mm/tooth</div>
                <div>Depth Ap: <strong>{selectedModalRecord.recommended_parameters?.Ap}</strong> mm</div>
              </div>
            </div>

            {selectedModalRecord.explanation && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 font-sans leading-relaxed">
                <strong>Reasoning:</strong> {selectedModalRecord.explanation}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedModalRecord(null)}
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

export default ProcessOptimization;
