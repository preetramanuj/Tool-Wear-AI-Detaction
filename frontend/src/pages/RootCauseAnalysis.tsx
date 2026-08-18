import React, { useState, useEffect } from 'react';
import {
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Thermometer,
  Gauge,
  Zap,
  Info,
  ShieldCheck,
  Play,
} from 'lucide-react';
import { analyzeRootCause, getTools } from '../services/api';
import { RootCauseReport, Tool } from '../types/api';

export const RootCauseAnalysis: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');
  const [selectedIssue, setSelectedIssue] = useState<string>('Abnormal Wear');
  const [report, setReport] = useState<RootCauseReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToolsList = async () => {
    try {
      const data = await getTools();
      setTools(data || []);
      if (data && data.length > 0 && !selectedToolId) {
        setSelectedToolId(data[0].tool_id);
      }
    } catch (e) {
      console.error(e);
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

  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedToolId) {
      executeAnalysis(selectedToolId);
    }
  };

  const factors = report?.contributing_factors || (report as any)?.ranked_factors || [];

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            ROOT CAUSE ANALYSIS
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Why might this problem be happening?
          </p>
        </div>

        <button
          onClick={() => executeAnalysis(selectedToolId)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-Analyze</span>
        </button>
      </div>

      {/* Target Selection Form */}
      <form onSubmit={handleRunAnalysis} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 font-bold">
            DIAGNOSTIC TARGET SELECTION
          </span>
          <h2 className="text-lg font-bold text-slate-900 font-sans mt-0.5">
            Select Tool & Issue
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-mono text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1.5 uppercase">
              Tool
            </label>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-sky-600/20"
            >
              {tools.map((t) => (
                <option key={t.tool_id} value={t.tool_id}>
                  {t.tool_id} ({t.tool_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1.5 uppercase">
              Issue
            </label>
            <select
              value={selectedIssue}
              onChange={(e) => setSelectedIssue(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-sky-600/20"
            >
              <option value="Abnormal Wear">Abnormal Wear</option>
              <option value="Premature RUL Degradation">Premature RUL Degradation</option>
              <option value="Vibration Anomaly">Vibration Anomaly</option>
              <option value="Thermal Limit Breach">Thermal Limit Breach</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold font-mono text-xs transition shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>[ Analyze ]</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Analysis Output */}
      {error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 text-xs font-mono">
          {error}
        </div>
      ) : report ? (
        <div className="space-y-8">
          {/* TOP CONTRIBUTING FACTORS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  FACTOR CONTRIBUTION
                </span>
                <h2 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
                  TOP CONTRIBUTING FACTORS
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Statistical influence</span>
            </div>

            <div className="space-y-6">
              {factors.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-mono">
                  No abnormal deviations recorded for this tool.
                </div>
              ) : (
                factors.map((factor: any, idx: number) => {
                  const percent = factor.relative_contribution_percent || 0;
                  const factorName = factor.name || factor.factor_name || factor.feature || 'Parameter';
                  const observedVal = factor.current_value ?? factor.observed_value ?? 0;
                  return (
                    <div key={idx} className="space-y-2 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 text-sm">
                          {factorName}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-500">
                            Observed: <strong className="text-slate-800">{observedVal} {factor.unit || ''}</strong>
                          </span>
                          <span className="font-bold text-sky-700 w-16 text-right text-base">
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-sky-600 rounded-full transition-all duration-500 shadow-inner"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI EXPLANATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900 font-sans">
                AI EXPLANATION
              </h2>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 font-sans">
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                "{report.explanation}"
              </p>
              <div className="pt-2 text-xs font-mono text-slate-500 border-t border-slate-200">
                {report.disclaimer || 'Root Cause Analysis highlights statistical correlations and process parameter deviations to assist maintenance engineering.'}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RootCauseAnalysis;
