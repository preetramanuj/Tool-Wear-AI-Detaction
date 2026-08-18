import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { getEconomicImpact, updateEconomicParameters } from '../services/api';
import { EconomicImpactReport, EconomicParameters } from '../types/api';

export const EconomicImpact: React.FC = () => {
  const [report, setReport] = useState<EconomicImpactReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<EconomicParameters>>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchEconomics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEconomicImpact();
      setReport(data);
      if (data?.parameters) {
        setFormData(data.parameters);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to calculate economic impact.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomics();
  }, []);

  const handleUpdateParams = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(null);
    try {
      await updateEconomicParameters(formData);
      setSaveSuccess('Plant economic parameters successfully updated!');
      setTimeout(() => {
        setSaveSuccess(null);
        setShowConfigModal(false);
        fetchEconomics();
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to save parameters.');
    } finally {
      setSaveLoading(false);
    }
  };

  const curr = report?.currency || '₹';

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Economic Impact & Cost Dashboard
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                  MODEL 7 BUSINESS INTELLIGENCE
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Financial ROI, downtime stoppage loss quantification, and predictive replacement cost savings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-all shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            Configure Rates & Costs
          </button>
          <button
            onClick={fetchEconomics}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <div className="text-sm font-semibold text-slate-800">Calculating Plant Economic Impact...</div>
          <div className="text-xs text-slate-500 font-mono mt-1">Aggregating maintenance labor, tool replenishment, and avoided downtime</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Error calculating economic metrics</div>
            <div>{error}</div>
          </div>
        </div>
      ) : !report ? null : (
        <>
          {/* Main Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Estimated Potential Savings */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 font-medium uppercase">
                  {report.summary.estimated_potential_savings.label}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {report.summary.estimated_potential_savings.data_type}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
                {curr} {report.summary.estimated_potential_savings.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>{report.summary.estimated_potential_savings.avoided_hours} hrs unplanned downtime avoided</span>
              </div>
            </div>

            {/* Estimated Downtime Loss */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 font-medium uppercase">
                  {report.summary.estimated_downtime_cost.label}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {report.summary.estimated_downtime_cost.data_type}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {curr} {report.summary.estimated_downtime_cost.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{report.summary.estimated_downtime_cost.hours} total stoppage hours logged</span>
              </div>
            </div>

            {/* Recorded Maintenance Cost */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 font-medium uppercase">
                  {report.summary.estimated_maintenance_cost.label}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  {report.summary.estimated_maintenance_cost.data_type}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {curr} {report.summary.estimated_maintenance_cost.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>{report.summary.estimated_maintenance_cost.hours} hrs technician labor</span>
              </div>
            </div>

            {/* Tool Inventory Base Value */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 font-medium uppercase">
                  {report.summary.tool_replacement_expenditure.label}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {report.summary.tool_replacement_expenditure.data_type}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {curr} {report.summary.tool_replacement_expenditure.value.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Based on {report.summary.tool_replacement_expenditure.tool_count} active inserts @ {curr}{report.parameters.tool_replacement_cost}/ea
              </div>
            </div>
          </div>

          {/* Plant Cost Configuration Parameter Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
                  Configured Plant Cost Parameters & Rates
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Stored in SQLite `economic_parameters`</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-slate-500 text-[11px]">Tool Replacement Cost</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{curr} {report.parameters.tool_replacement_cost} / insert</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-slate-500 text-[11px]">Machine Operating Rate</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{curr} {report.parameters.machine_operating_cost_per_hour} / hr</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-slate-500 text-[11px]">Downtime Stoppage Cost</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{curr} {report.parameters.downtime_cost_per_hour} / hr</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-slate-500 text-[11px]">Maintenance Labor Rate</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{curr} {report.parameters.maintenance_labor_cost_per_hour} / hr</div>
              </div>
            </div>
          </div>

          {/* Tool Cost Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Tool-Wise Cost & Expenditure Breakdown
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Live SQLite records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
                    <th className="p-3">Tool ID</th>
                    <th className="p-3">Insert Name</th>
                    <th className="p-3">Machine Cell</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">Maintenance Labor</th>
                    <th className="p-3">Projected Replacement</th>
                    <th className="p-3">Total Allocated Cost</th>
                    <th className="p-3">Metric Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.tool_cost_breakdown.map((t) => (
                    <tr key={t.tool_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-900">{t.tool_id}</td>
                      <td className="p-3 text-slate-700">{t.tool_name}</td>
                      <td className="p-3 font-mono text-slate-600">{t.machine_id}</td>
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
                      <td className="p-3 font-mono text-slate-700">{curr} {t.maintenance_cost.toFixed(2)}</td>
                      <td className="p-3 font-mono text-slate-700">{curr} {t.replacement_cost.toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{curr} {t.total_cost.toFixed(2)}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {t.data_type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal / Engineering Disclaimer */}
          <div className="p-3.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] text-slate-500 font-mono leading-relaxed">
            <span className="font-bold text-slate-700 uppercase">Model Transparency Notice: </span>
            {report.disclaimer}
          </div>
        </>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="font-bold text-sm text-slate-900 font-mono">Configure Plant Economic Rates</div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateParams} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tool Replacement Cost ({curr})</label>
                <input
                  type="number"
                  step="50"
                  value={formData.tool_replacement_cost || 0}
                  onChange={(e) => setFormData({ ...formData, tool_replacement_cost: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Downtime Stoppage Cost / Hour ({curr})</label>
                <input
                  type="number"
                  step="100"
                  value={formData.downtime_cost_per_hour || 0}
                  onChange={(e) => setFormData({ ...formData, downtime_cost_per_hour: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Machine Operating Cost / Hour ({curr})</label>
                <input
                  type="number"
                  step="100"
                  value={formData.machine_operating_cost_per_hour || 0}
                  onChange={(e) => setFormData({ ...formData, machine_operating_cost_per_hour: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Maintenance Labor Rate / Hour ({curr})</label>
                <input
                  type="number"
                  step="50"
                  value={formData.maintenance_labor_cost_per_hour || 0}
                  onChange={(e) => setFormData({ ...formData, maintenance_labor_cost_per_hour: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save Parameters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomicImpact;
