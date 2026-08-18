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
  ShieldAlert,
  ArrowUpRight,
  Activity,
  Layers,
} from 'lucide-react';
import { getManufacturingInsights } from '../services/api';
import { ManufacturingInsightsReport } from '../types/api';

export const ManufacturingInsights: React.FC = () => {
  const [report, setReport] = useState<ManufacturingInsightsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'candidates' | 'machines' | 'tools'>('insights');

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

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Manufacturing Insights Engine
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                  MODEL 5 INTELLIGENCE
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Predictive degradation tracking, wear acceleration detection, and plant optimization insights
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Insights
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <div className="text-sm font-semibold text-slate-800">Synthesizing Manufacturing History...</div>
          <div className="text-xs text-slate-500 font-mono mt-1">Analyzing wear slopes, cycle counts, and machine variances</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Error loading manufacturing insights</div>
            <div>{error}</div>
          </div>
        </div>
      ) : !report || !report.has_sufficient_data ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Insufficient Historical Data</h3>
          <p className="text-xs text-slate-500 font-mono max-w-md mx-auto mt-1">
            {report?.summary || 'No inspection records found in SQLite. Run cutting tool inspections to build historical telemetry.'}
          </p>
        </div>
      ) : (
        <>
          {/* Executive Summary Alert Box */}
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 text-slate-800 flex items-start gap-3.5 shadow-xs">
            <Lightbulb className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-sky-900 mb-0.5">Automated Facility Intelligence Summary</div>
              <div className="text-slate-700 leading-relaxed font-sans">{report.summary}</div>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Monitored Tools</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{report.kpis.total_tools}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{report.kpis.active_tools} active in shop floor</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Maintenance Req.</div>
              <div className={`text-2xl font-bold font-mono mt-1 ${report.kpis.tools_requiring_inspection > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {report.kpis.tools_requiring_inspection}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Warning or Critical state</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Average Wear</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {report.kpis.avg_wear_um !== null ? `${report.kpis.avg_wear_um} µm` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">EOL Limit: 300.0 µm</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Average Health</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {report.kpis.avg_health_score !== null ? `${Math.round(report.kpis.avg_health_score * 100)}%` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Across all inspections</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Average RUL</div>
              <div className="text-2xl font-bold font-mono text-sky-600 mt-1">
                {report.kpis.avg_rul_cycles !== null ? `${report.kpis.avg_rul_cycles} cyc` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Remaining cutting cycles</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Active Insights</div>
              <div className="text-2xl font-bold font-mono text-purple-600 mt-1">{report.insights.length}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Model-generated alerts</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            {[
              { id: 'insights', label: 'Actionable Insights', icon: Lightbulb, count: report.insights.length },
              { id: 'candidates', label: 'Maintenance Candidates', icon: Wrench, count: report.maintenance_candidates.length },
              { id: 'machines', label: 'Machine Comparison', icon: Cpu, count: report.machine_comparison.length },
              { id: 'tools', label: 'Tool Performance', icon: Layers, count: report.tool_comparison.length },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-sky-600 text-sky-700 font-bold bg-sky-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: Actionable Insights */}
          {activeTab === 'insights' && (
            <div className="space-y-3">
              {report.insights.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No critical anomalies or wear acceleration detected across current tool inspection records.
                </div>
              ) : (
                report.insights.map((item, idx) => {
                  const isCrit = item.severity === 'CRITICAL';
                  const isWarn = item.severity === 'WARNING';
                  const badgeColor = isCrit
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isWarn
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200';

                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border shrink-0 ${badgeColor}`}>
                          {isCrit ? <ShieldAlert className="w-4 h-4" /> : isWarn ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{item.title}</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                              {item.severity}
                            </span>
                            {item.tool_id && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                Tool: {item.tool_id}
                              </span>
                            )}
                            {item.machine_id && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                Machine: {item.machine_id}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 font-sans">{item.message}</p>
                          {item.data_evidence && (
                            <div className="text-[11px] font-mono text-slate-500 mt-1">
                              Evidence: {item.data_evidence}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Maintenance Candidates */}
          {activeTab === 'candidates' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Prioritized Tool Maintenance & Replacement Candidates
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
                      <th className="p-3">Tool ID</th>
                      <th className="p-3">Insert Name</th>
                      <th className="p-3">Machine</th>
                      <th className="p-3">Current Wear</th>
                      <th className="p-3">Remaining RUL</th>
                      <th className="p-3">Wear Rate</th>
                      <th className="p-3">Condition Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.maintenance_candidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                          No active tools currently exceed maintenance trigger thresholds.
                        </td>
                      </tr>
                    ) : (
                      report.maintenance_candidates.map((tool) => (
                        <tr key={tool.tool_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">{tool.tool_id}</td>
                          <td className="p-3 text-slate-700">{tool.tool_name}</td>
                          <td className="p-3 font-mono text-slate-600">{tool.machine_id}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {tool.current_wear_um} µm ({tool.current_wear_vb_mm} mm)
                          </td>
                          <td className="p-3 font-mono text-sky-700 font-semibold">
                            {tool.rul_cycles !== null ? `${tool.rul_cycles} cycles` : 'N/A'}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {tool.wear_rate !== null ? `${tool.wear_rate} µm/cyc` : 'N/A'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                tool.status === 'CRITICAL'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {tool.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Machine Comparison */}
          {activeTab === 'machines' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.machine_comparison.map((m) => (
                <div key={m.machine_id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-sm text-slate-900">{m.name}</div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {m.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mb-4">{m.machine_id}</div>

                  <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Total Inspections:</span>
                      <span className="font-bold text-slate-800">{m.total_inspections}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Average Wear:</span>
                      <span className="font-bold text-slate-800">{m.avg_wear_um} µm</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Critical Alerts:</span>
                      <span className={`font-bold ${m.critical_alerts > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {m.critical_alerts}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Tool Performance Comparison */}
          {activeTab === 'tools' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Tool Inventory Wear & Remaining Life Matrix
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
                      <th className="p-3">Tool ID</th>
                      <th className="p-3">Insert Type</th>
                      <th className="p-3">Material</th>
                      <th className="p-3">Coating</th>
                      <th className="p-3">Machine</th>
                      <th className="p-3">Wear (µm)</th>
                      <th className="p-3">RUL (Cycles)</th>
                      <th className="p-3">Inspections</th>
                      <th className="p-3">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.tool_comparison.map((t) => (
                      <tr key={t.tool_id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-900">{t.tool_id}</td>
                        <td className="p-3 text-slate-700">{t.tool_name}</td>
                        <td className="p-3 text-slate-600">{t.material}</td>
                        <td className="p-3 text-slate-600">{t.coating}</td>
                        <td className="p-3 font-mono text-slate-600">{t.machine_id}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{t.current_wear_um} µm</td>
                        <td className="p-3 font-mono font-semibold text-sky-700">
                          {t.rul_cycles !== null ? `${t.rul_cycles} cyc` : 'N/A'}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{t.total_inspections}</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              t.status === 'HEALTHY'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : t.status === 'WARNING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManufacturingInsights;
