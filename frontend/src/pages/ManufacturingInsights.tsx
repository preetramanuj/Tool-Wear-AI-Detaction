import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Wrench,
  Cpu,
  RefreshCw,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { getManufacturingInsights } from '../services/api';
import { ManufacturingInsightsReport } from '../types/api';
import { SeverityBadge } from '../components/common/Severity';

export const ManufacturingInsights: React.FC = () => {
  const [report, setReport] = useState<ManufacturingInsightsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getManufacturingInsights();
      setReport(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load manufacturing insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const insights = report?.insights || [];
  const candidates = report?.maintenance_candidates || [];

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-slate-900 tracking-tight">
            Manufacturing Insights & Observations
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Shop floor condition intelligence, anomaly diagnostics, and maintenance queues
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2DFD7] text-slate-700 hover:bg-[#F8F7F4] transition shadow-paper self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Insights</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E2DFD7] rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-paper">
          <RefreshCw className="w-8 h-8 text-accent animate-spin mb-3" />
          <div className="text-sm font-semibold font-display text-slate-800">Analyzing Telemetry Trends...</div>
        </div>
      ) : error ? (
        <div className="bg-critical-light border border-critical-border rounded-2xl p-6 text-critical text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KEY INSIGHTS SECTION */}
          <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6">
            <div className="pb-4 border-b border-[#E2DFD7]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-bold">
                AUTOMATED OBSERVATIONS
              </span>
              <h2 className="text-xl font-bold font-display text-slate-900 mt-0.5">
                Key Machine Insights
              </h2>
            </div>

            {insights.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                Not enough historical data to generate insights.
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((item: any, idx: number) => {
                  const isWarning = item.severity === 'WARNING' || item.severity === 'CRITICAL';
                  return (
                    <div
                      key={idx}
                      className={`p-6 rounded-2xl border flex items-start gap-4 ${
                        isWarning
                          ? 'bg-warning-light border-warning-border text-slate-900'
                          : 'bg-normal-light border-normal-border text-slate-900'
                      }`}
                    >
                      <div className="p-2.5 bg-white rounded-xl shrink-0 shadow-2xs border border-[#E2DFD7]">
                        {isWarning ? (
                          <AlertTriangle className="w-5 h-5 text-warning" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-normal" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-base font-display">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed font-sans">
                          {item.message}
                        </p>

                        {/* WHY? Section */}
                        <div className="pt-2 border-t border-slate-200/60 text-xs font-mono space-y-1">
                          <div className="font-bold text-slate-900 uppercase">WHY?</div>
                          <p className="text-slate-600 font-sans">
                            {item.data_evidence || item.recommendation || 'Continuous telemetry tracking indicates stable flank wear slope.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PRIORITIZED MAINTENANCE QUEUE */}
          <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4">
            <div className="pb-4 border-b border-[#E2DFD7] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900">
                  Maintenance Attention Candidates ({candidates.length})
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Tools exceeding standard warning boundaries
                </p>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                All registered tools are currently within safe limits.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#F8F7F4] border-b border-[#E2DFD7] text-slate-500 uppercase text-[11px]">
                      <th className="p-4">Tool ID</th>
                      <th className="p-4">Station</th>
                      <th className="p-4">Wear</th>
                      <th className="p-4">RUL</th>
                      <th className="p-4">Trigger Reason</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DFD7]">
                    {candidates.map((cand: any) => (
                      <tr key={cand.tool_id} className="hover:bg-[#F8F7F4] transition">
                        <td className="p-4 font-bold text-accent">{cand.tool_id}</td>
                        <td className="p-4 text-slate-600">{cand.machine_id}</td>
                        <td className="p-4 font-bold text-slate-900 data-readout">
                          {cand.current_wear_vb_mm?.toFixed(2)} mm
                        </td>
                        <td className="p-4 font-bold text-critical data-readout">
                          {cand.rul_cycles !== undefined && cand.rul_cycles !== null
                            ? `${cand.rul_cycles} cyc`
                            : cand.current_rul_cycles !== null
                            ? `${cand.current_rul_cycles} cyc`
                            : 'N/A'}
                        </td>
                        <td className="p-4 text-slate-700 font-sans text-xs">{cand.reason || 'Approaching wear threshold'}</td>
                        <td className="p-4 font-bold text-slate-900 font-sans">{cand.action || 'Schedule Replacement'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturingInsights;
