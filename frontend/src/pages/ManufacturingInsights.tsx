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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            MANUFACTURING INSIGHTS
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            What is the system noticing on the shop floor?
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Insights</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <div className="text-sm font-semibold text-slate-800">Analyzing Telemetry Trends...</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KEY INSIGHTS SECTION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 font-bold">
                AUTOMATED OBSERVATIONS
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
                KEY INSIGHTS
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
                        isWarning ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="p-2.5 bg-white rounded-xl shrink-0 shadow-2xs">
                        {isWarning ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-base font-sans">
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-sans">
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                      <th className="p-4">Tool ID</th>
                      <th className="p-4">Station</th>
                      <th className="p-4">Wear</th>
                      <th className="p-4">RUL</th>
                      <th className="p-4">Trigger Reason</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((cand: any) => (
                      <tr key={cand.tool_id} className="hover:bg-slate-50/70 transition">
                        <td className="p-4 font-bold text-sky-700">{cand.tool_id}</td>
                        <td className="p-4 text-slate-600">{cand.machine_id}</td>
                        <td className="p-4 font-bold text-slate-900">
                          {cand.current_wear_vb_mm?.toFixed(2)} mm
                        </td>
                        <td className="p-4 font-bold text-rose-600">
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
