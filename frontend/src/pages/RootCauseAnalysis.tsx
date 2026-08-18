import React, { useState, useEffect } from 'react';
import {
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Gauge,
  Thermometer,
  Zap,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { analyzeRootCause, getTools } from '../services/api';
import { RootCauseReport, Tool } from '../types/api';

export const RootCauseAnalysis: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');
  const [report, setReport] = useState<RootCauseReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToolsList = async () => {
    try {
      const data = await getTools();
      setTools(data);
      if (data.length > 0 && !selectedToolId) {
        setSelectedToolId(data[0].tool_id);
      }
    } catch (e) {
      // Fallback
    }
  };

  const executeAnalysis = async (toolId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeRootCause(toolId);
      setReport(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to analyze root cause.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolsList();
    if (selectedToolId) {
      executeAnalysis(selectedToolId);
    }
  }, []);

  const handleToolChange = (toolId: string) => {
    setSelectedToolId(toolId);
    executeAnalysis(toolId);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                AI-Based Root Cause & Degradation Factor Analysis
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                  MODEL 9 DIAGNOSTICS
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Process parameter deviation analysis and statistical model feature contribution ranking
              </p>
            </div>
          </div>
        </div>

        {/* Tool Selector Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-xs">
            <span className="text-xs font-mono text-slate-500 font-semibold">Target Tool:</span>
            <select
              value={selectedToolId}
              onChange={(e) => handleToolChange(e.target.value)}
              className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-hidden"
            >
              {tools.map((t) => (
                <option key={t.tool_id} value={t.tool_id}>
                  {t.tool_id} ({t.tool_name})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => executeAnalysis(selectedToolId)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Run Analysis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <div className="text-sm font-semibold text-slate-800">Evaluating Feature Contributions...</div>
          <div className="text-xs text-slate-500 font-mono mt-1">Comparing sensor telemetry against nominal machining baselines</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Root Cause Analysis Error</div>
            <div>{error}</div>
          </div>
        </div>
      ) : !report ? null : (
        <>
          {/* Tool Profile & Status Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Tool Identity</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{report.tool_id}</div>
              <div className="text-xs text-slate-600 font-sans">{report.tool_name}</div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Machine Cell</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{report.machine_id}</div>
              <div className="text-xs text-slate-500 font-mono">Workpiece: {report.workpiece_material}</div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Flank Wear (VB)</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{report.current_wear_um} µm</div>
              <div className="text-xs text-slate-500 font-mono">Coating: {report.coating}</div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Estimated RUL</div>
              <div className="text-base font-bold font-mono text-sky-700 mt-0.5">
                {report.current_rul_cycles !== null ? `${report.current_rul_cycles} cycles` : 'N/A'}
              </div>
              <div className="text-xs text-slate-500 font-mono">Threshold: 300 µm</div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase">Health Classification</div>
              <div className="mt-1">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                    report.current_health_status === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : report.current_health_status === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {report.current_health_status}
                </span>
              </div>
            </div>
          </div>

          {/* AI Feature Contribution Summary Box */}
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 text-slate-800 flex items-start gap-3.5 shadow-xs">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-sky-900 mb-0.5">Statistical Degradation Driver Explanation</div>
              <div className="text-slate-700 leading-relaxed font-sans">{report.explanation}</div>
            </div>
          </div>

          {/* Ranked Contributing Factors List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Ranked Process Factors by Statistical Model Contribution
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {report.contributing_factors.map((factor, idx) => {
                const isHigh = factor.influence === 'HIGH';
                const isMod = factor.influence === 'MODERATE';
                const barColor = isHigh ? 'bg-rose-500' : isMod ? 'bg-amber-500' : 'bg-sky-500';
                const badgeColor = isHigh
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isMod
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200';

                return (
                  <div key={factor.feature} className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-mono font-bold text-xs">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{factor.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                          {factor.influence} INFLUENCE
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Observed: </span>
                          <span className="font-bold text-slate-900">{factor.current_value} {factor.unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Nominal: </span>
                          <span className="text-slate-700">{factor.nominal_value} {factor.unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Deviation: </span>
                          <span className={`font-bold ${factor.deviation_percent > 20 ? 'text-rose-600' : 'text-slate-800'}`}>
                            +{factor.deviation_percent}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Contribution: </span>
                          <span className="font-bold text-sky-700">{factor.relative_contribution_percent}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Contribution Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, factor.relative_contribution_percent * 2.5)}%` }}
                      />
                    </div>

                    <div className="text-xs text-slate-600 font-sans flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{factor.observation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Transparency / Non-Causal Engineering Disclaimer */}
          <div className="p-3.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] text-slate-500 font-mono leading-relaxed">
            <span className="font-bold text-slate-700 uppercase">Engineering Notice: </span>
            {report.disclaimer}
          </div>
        </>
      )}
    </div>
  );
};

export default RootCauseAnalysis;
