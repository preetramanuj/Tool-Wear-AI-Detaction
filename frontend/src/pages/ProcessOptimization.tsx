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
  Circle,
  CircleDot
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Sliders className="w-7 h-7 text-accent" />
            <h1 className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
              Process Parameter Optimization
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-mono">
            Constrained process parameter recommendation based on empirical tool wear dynamics.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-warning-light text-warning-dark border border-warning-border font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-warning" />
            Decision Support — Engineer Approval Required
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TARGET CONFIGURATION (TOOL, MACHINE, MATERIAL) */}
      {/* ============================================================ */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-8 md:p-10 shadow-paper space-y-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
            STEP 1 — TARGET CONFIGURATION
          </span>
          <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">
            Select Tool, Machine Station & Workpiece Material
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
          <div className="space-y-2">
            <label className="text-slate-500 font-bold block">1. Cutting Tool</label>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="w-full px-4 py-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-accent transition shadow-inner"
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
              className="w-full px-4 py-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-accent transition shadow-inner"
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
              className="w-full px-4 py-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-accent transition shadow-inner"
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
        <div className="bg-white border border-[#E2DFD7] rounded-3xl p-8 shadow-paper space-y-6 font-mono">
          <div>
            <span className="text-xs uppercase tracking-wider text-accent font-bold">
              STEP 2 — CURRENT PARAMETERS
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">
              Enter Current Machine Telemetry
            </h2>
          </div>

          <div className="space-y-6">
            {/* RPM */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold">Spindle Speed (n):</span>
                <span className="text-accent font-bold font-display text-sm data-readout">{rpm} RPM</span>
              </div>
              <input
                type="range"
                min="2000"
                max="5000"
                step="50"
                value={rpm}
                onChange={(e) => setRpm(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
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
                <span className="text-accent font-bold font-display text-sm data-readout">{feedRate.toFixed(3)} mm/tooth</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.10"
                step="0.005"
                value={feedRate}
                onChange={(e) => setFeedRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
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
                <span className="text-accent font-bold font-display text-sm data-readout">{depthOfCut.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.0"
                step="0.1"
                value={depthOfCut}
                onChange={(e) => setDepthOfCut(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Min: 0.5 mm</span>
                <span>Max: 1.0 mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* OPTIMIZATION OBJECTIVE */}
        <div className="bg-white border border-[#E2DFD7] rounded-3xl p-8 shadow-paper space-y-6">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
              STEP 3 — OPTIMIZATION OBJECTIVE
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">
              Select Pareto Target Goal
            </h2>
          </div>

          <div className="space-y-3 font-mono text-xs flex flex-col h-full">
            {/* Objective 1 */}
            <button
              type="button"
              onClick={() => setSelectedObjective('MAXIMIZE_TOOL_LIFE')}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${selectedObjective === 'MAXIMIZE_TOOL_LIFE'
                ? 'bg-normal-light border-normal ring-1 ring-normal text-normal'
                : 'bg-[#F8F7F4] border-[#E2DFD7] text-slate-700 hover:bg-white'
                }`}
            >
              <div className="flex items-center justify-between font-bold font-display text-sm">
                <span>1. Maximize Tool Life</span>
                <span className="text-xs text-normal">90% Wear / 10% Prod</span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Minimizes flank wear rate (µm/cycle) to maximize the number of cutting cycles before insert replacement.
              </p>
            </button>

            {/* Objective 2 */}
            <button
              type="button"
              onClick={() => setSelectedObjective('MAXIMIZE_PRODUCTIVITY')}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${selectedObjective === 'MAXIMIZE_PRODUCTIVITY'
                ? 'bg-accent-50 border-accent ring-1 ring-accent text-accent'
                : 'bg-[#F8F7F4] border-[#E2DFD7] text-slate-700 hover:bg-white'
                }`}
            >
              <div className="flex items-center justify-between font-bold font-display text-sm">
                <span>2. Maximize Productivity</span>
                <span className="text-xs text-accent">90% Prod / 10% Wear</span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Maximizes Material Removal Rate (MRR) to achieve fastest machining cycle times and throughput.
              </p>
            </button>

            {/* Objective 3 */}
            <button
              type="button"
              onClick={() => setSelectedObjective('BALANCED')}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${selectedObjective === 'BALANCED'
                ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400 text-slate-800'
                : 'bg-[#F8F7F4] border-[#E2DFD7] text-slate-700 hover:bg-white'
                }`}
            >
              <div className="flex items-center justify-between font-bold font-display text-sm">
                <span>3. Balanced Tradeoff</span>
                <span className="text-xs text-slate-600">50% Prod / 50% Wear</span>
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
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-8 shadow-paper space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900">
              Execute Model 10 Optimization
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Empirical candidate search evaluating 14 verified configurations against ISO 300 µm wear limits.
            </p>
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            className="flex items-center justify-center gap-2.5 px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl text-sm font-bold font-mono transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:transform-none"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Optimizing Parameters...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span> Run Process Optimization</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-critical-light border border-critical-border rounded-2xl text-critical text-xs font-mono flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-critical shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PROGRESS STAGES */}
        {isOptimizing && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-[#E2DFD7] font-mono text-xs">
            <div className="p-3 rounded-xl bg-normal-light text-normal-dark border border-normal-border font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-normal" />
              <span>Input validated</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 1 ? 'bg-accent-50 text-accent border-accent-border' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <span>Searching candidates</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 2 ? 'bg-accent-50 text-accent border-accent-border' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              {optimizationStage >= 2 ? <CircleDot className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              <span>Checking constraints</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 3 ? 'bg-accent-50 text-accent border-accent-border' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              {optimizationStage >= 3 ? <CircleDot className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              <span>Scoring Pareto front</span>
            </div>
            <div className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${optimizationStage >= 4 ? 'bg-accent-50 text-accent border-accent-border' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              {optimizationStage >= 4 ? <CircleDot className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              <span>Selecting best</span>
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
            <div className="bg-white border border-[#E2DFD7] rounded-3xl p-8 shadow-paper space-y-6">
              <div className="pb-4 border-b border-[#E2DFD7] flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                    BASELINE TELEMETRY
                  </span>
                  <h3 className="text-xl font-bold font-display text-slate-900 mt-0.5">
                    CURRENT PARAMETERS
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-[#F8F7F4] border border-[#E2DFD7] px-3 py-1 rounded-full">
                  Configured
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl shadow-inner">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Spindle Speed</div>
                  <div className="text-2xl font-bold font-display text-slate-900 mt-1 data-readout">
                    {result.current_parameters.n}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">RPM</div>
                </div>

                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl shadow-inner">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Feed per Tooth</div>
                  <div className="text-2xl font-bold font-display text-slate-900 mt-1 data-readout">
                    {result.current_parameters.fz.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">mm/tooth</div>
                </div>

                <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl shadow-inner">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Depth of Cut</div>
                  <div className="text-2xl font-bold font-display text-slate-900 mt-1 data-readout">
                    {result.current_parameters.Ap.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">mm</div>
                </div>
              </div>
            </div>

            {/* RECOMMENDED PARAMETERS */}
            <div className="bg-white border-2 border-accent rounded-3xl p-8 shadow-paper space-y-6 relative overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <div className="pb-4 border-b border-[#E2DFD7] flex items-center justify-between relative">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
                    MODEL 10 RECOMMENDATION
                  </span>
                  <h3 className="text-xl font-bold font-display text-slate-900 mt-0.5">
                    RECOMMENDED PARAMETERS
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-accent bg-accent-50 px-3 py-1 rounded-full border border-accent-100">
                  Score: {result.optimization_score?.toFixed(4) || 'Optimal'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 font-mono">
                <div className="p-4 bg-accent-50 border border-accent-100 rounded-2xl shadow-inner">
                  <div className="text-[10px] text-accent font-bold uppercase">Spindle Speed</div>
                  <div className="text-2xl font-bold font-display text-accent-dark mt-1 data-readout">
                    {result.recommended_parameters.n}
                  </div>
                  <div className="text-[10px] text-accent-dark mt-0.5">RPM</div>
                </div>

                <div className="p-4 bg-accent-50 border border-accent-100 rounded-2xl shadow-inner">
                  <div className="text-[10px] text-accent font-bold uppercase">Feed per Tooth</div>
                  <div className="text-2xl font-bold font-display text-accent-dark mt-1 data-readout">
                    {result.recommended_parameters.fz.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-accent-dark mt-0.5">mm/tooth</div>
                </div>

                <div className="p-4 bg-accent-50 border border-accent-100 rounded-2xl shadow-inner">
                  <div className="text-[10px] text-accent font-bold uppercase">Depth of Cut</div>
                  <div className="text-2xl font-bold font-display text-accent-dark mt-1 data-readout">
                    {result.recommended_parameters.Ap.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-accent-dark mt-0.5">mm</div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 6. EXPECTED IMPACT METRICS */}
          {/* ============================================================ */}
          <div className="bg-white border border-[#E2DFD7] rounded-3xl p-8 md:p-10 shadow-paper space-y-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
                EXPECTED IMPACT
              </span>
              <h2 className="text-2xl font-bold font-display text-slate-900 mt-0.5">
                Empirical Performance Projections
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 font-mono">
              {/* Wear Rate */}
              <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-2 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-normal" />
                  Estimated Wear Rate
                </div>
                <div className="text-2xl font-bold font-display text-normal data-readout">
                  {result.expected_impact.recommended_wear_rate_um_per_cycle.toFixed(4)} µm/cyc
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  From {result.expected_impact.current_wear_rate_um_per_cycle.toFixed(4)} µm/cyc ({result.expected_impact.estimated_wear_reduction_percent > 0 ? `-${result.expected_impact.estimated_wear_reduction_percent}% wear` : 'Optimal'})
                </div>
              </div>

              {/* Productivity (MRR) */}
              <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-2 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Productivity (MRR)
                </div>
                <div className="text-2xl font-bold font-display text-accent-dark data-readout">
                  {result.expected_impact.recommended_mrr.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  Baseline: {result.expected_impact.current_mrr.toFixed(1)} ({result.expected_impact.estimated_mrr_change_percent >= 0 ? `+${result.expected_impact.estimated_mrr_change_percent}%` : `${result.expected_impact.estimated_mrr_change_percent}%`})
                </div>
              </div>

              {/* Projected Cycles */}
              <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-2 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-warning" />
                  Projected Life to EOL
                </div>
                <div className="text-2xl font-bold font-display text-warning-dark data-readout">
                  {result.expected_impact.recommended_projected_rul_cycles} cyc
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  Estimated +{result.expected_impact.estimated_cycle_life_gain} cycles gain to 300 µm
                </div>
              </div>

              {/* Data Provenance */}
              <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl space-y-2 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-500" />
                  Data Provenance
                </div>
                <div className="text-lg font-bold font-display text-slate-800 mt-1">
                  Empirical Pareto
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  14 Experimental Runs Validated
                </div>
              </div>
            </div>

            {/* Explanation & Reasoning Card */}
            <div className="p-6 bg-accent-50 border border-accent-100 rounded-2xl space-y-2 font-mono text-xs">
              <div className="font-bold text-accent-dark uppercase text-[11px] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-accent" />
                WHY THIS RECOMMENDATION?
              </div>
              <p className="text-slate-700 font-sans leading-relaxed text-sm">
                {result.explanation}
              </p>
            </div>

            {/* Engineer Approval Action Bar */}
            <div className="pt-4 border-t border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldCheck className="w-4 h-4 text-warning shrink-0" />
                <span>AI Recommendation — Engineer Approval Required</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isApproved}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition shadow-paper ${isApproved
                    ? 'bg-normal text-white cursor-default'
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
      <div className="bg-white border border-[#E2DFD7] rounded-3xl shadow-paper overflow-hidden p-6 md:p-8 space-y-6">
        <div className="pb-4 border-b border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900 uppercase">
              Process Optimization History ({history.length})
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Click any recommendation to inspect parameter adjustments and impact logs
            </p>
          </div>

          <button
            onClick={fetchHistory}
            className="flex items-center gap-2 px-4 py-2 bg-[#F8F7F4] hover:bg-[#F0EFEA] text-slate-700 rounded-xl text-xs font-mono font-bold transition border border-[#E2DFD7] shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#F8F7F4] border-b border-[#E2DFD7] text-slate-500 uppercase text-[10px]">
                <th className="p-4 font-bold">Opt ID</th>
                <th className="p-4 font-bold">Tool</th>
                <th className="p-4 font-bold">Objective</th>
                <th className="p-4 font-bold">Current (RPM / fz / Ap)</th>
                <th className="p-4 font-bold">Recommended (RPM / fz / Ap)</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
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
                    className="hover:bg-[#F8F7F4] transition-colors duration-200 cursor-pointer group"
                  >
                    <td className="p-4 font-bold text-slate-900 group-hover:text-accent transition-colors">{rec.optimization_id}</td>
                    <td className="p-4 font-bold text-accent">{rec.tool_id}</td>
                    <td className="p-4 font-bold text-slate-700 font-display">{rec.objective.replace(/_/g, ' ')}</td>
                    <td className="p-4 text-slate-600 data-readout">
                      {rec.current_parameters?.n} / {rec.current_parameters?.fz} / {rec.current_parameters?.Ap}
                    </td>
                    <td className="p-4 font-bold text-accent-dark data-readout">
                      {rec.recommended_parameters?.n} / {rec.recommended_parameters?.fz} / {rec.recommended_parameters?.Ap}
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${rec.approved_by_operator
                          ? 'bg-normal-light text-normal border-normal-border'
                          : 'bg-accent-50 text-accent border-accent-border'
                          }`}
                      >
                        {rec.approved_by_operator ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {rec.status}
                      </div>
                    </td>
                    <td className="p-4 text-right text-slate-500 data-readout">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DFD7] rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
                  OPTIMIZATION AUDIT DOSSIER
                </span>
                <h3 className="text-2xl font-bold font-display text-slate-900 mt-1">
                  {selectedModalRecord.optimization_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedModalRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#F8F7F4] transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] shadow-2xs">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Tool ID</span>
                <strong className="text-slate-900 text-sm mt-0.5 block">{selectedModalRecord.tool_id}</strong>
              </div>

              <div className="p-4 bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] shadow-2xs">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Machine</span>
                <strong className="text-slate-900 text-sm mt-0.5 block">{selectedModalRecord.machine_id}</strong>
              </div>

              <div className="p-4 bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] shadow-2xs">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Objective</span>
                <strong className="text-accent text-sm mt-0.5 block font-display">{selectedModalRecord.objective}</strong>
              </div>

              <div className="p-4 bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] shadow-2xs">
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Approval Status</span>
                <strong className="text-normal text-sm mt-0.5 block">{selectedModalRecord.status}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-5 bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] shadow-2xs space-y-2">
                <span className="text-slate-400 font-bold block uppercase text-[10px] mb-1">Current Parameters</span>
                <div className="flex justify-between"><span>RPM:</span> <strong className="data-readout">{selectedModalRecord.current_parameters?.n}</strong></div>
                <div className="flex justify-between"><span>Feed fz:</span> <strong className="data-readout">{selectedModalRecord.current_parameters?.fz} mm/t</strong></div>
                <div className="flex justify-between"><span>Depth Ap:</span> <strong className="data-readout">{selectedModalRecord.current_parameters?.Ap} mm</strong></div>
              </div>

              <div className="p-5 bg-accent-50 rounded-2xl border border-accent-100 shadow-2xs space-y-2">
                <span className="text-accent-dark font-bold block uppercase text-[10px] mb-1">Recommended Parameters</span>
                <div className="flex justify-between text-accent-dark"><span>RPM:</span> <strong className="data-readout">{selectedModalRecord.recommended_parameters?.n}</strong></div>
                <div className="flex justify-between text-accent-dark"><span>Feed fz:</span> <strong className="data-readout">{selectedModalRecord.recommended_parameters?.fz} mm/t</strong></div>
                <div className="flex justify-between text-accent-dark"><span>Depth Ap:</span> <strong className="data-readout">{selectedModalRecord.recommended_parameters?.Ap} mm</strong></div>
              </div>
            </div>

            {selectedModalRecord.explanation && (
              <div className="p-5 bg-[#F8F7F4] rounded-2xl border border-[#E2DFD7] text-xs text-slate-700 font-sans leading-relaxed shadow-inner">
                <strong className="text-slate-900 block mb-1">Reasoning:</strong> {selectedModalRecord.explanation}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedModalRecord(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold font-mono text-xs transition shadow-paper"
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
