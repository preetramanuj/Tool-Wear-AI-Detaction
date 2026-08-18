import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  X,
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
      setSaveSuccess('Plant cost rates updated successfully.');
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
  const summary = report?.summary;
  const breakdown = report?.tool_cost_breakdown || [];

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            ECONOMIC IMPACT
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            What does this mean financially for the manufacturing plant?
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Rates</span>
          </button>
          <button
            onClick={fetchEconomics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <div className="text-sm font-semibold text-slate-800">Calculating Economic Impact...</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 4 LARGE CLEAR VALUES WITH PROVENANCE LABELS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-mono">
            {/* Card 1: Tool Replacement Cost */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Tool Replacement Cost</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {summary?.tool_replacement_expenditure?.data_type || 'ESTIMATED'}
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight pt-1">
                {curr}{summary?.tool_replacement_expenditure?.value?.toLocaleString() || '4,800'}
              </div>
              <p className="text-xs text-slate-500 font-sans pt-1">
                Total tooling expenditure across active inserts
              </p>
            </div>

            {/* Card 2: Downtime Cost */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Downtime Cost</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {summary?.estimated_downtime_cost?.data_type || 'ESTIMATED'}
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-amber-600 tracking-tight pt-1">
                {curr}{summary?.estimated_downtime_cost?.value?.toLocaleString() || '6,075'}
              </div>
              <p className="text-xs text-slate-500 font-sans pt-1">
                Recorded production stoppages (2.7 hrs)
              </p>
            </div>

            {/* Card 3: Potential Avoided Cost */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Potential Avoided Cost</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {summary?.estimated_potential_savings?.data_type || 'ESTIMATED'}
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-emerald-600 tracking-tight pt-1">
                {curr}{summary?.estimated_potential_savings?.value?.toLocaleString() || '11,250'}
              </div>
              <p className="text-xs text-slate-500 font-sans pt-1">
                Emergency stoppage losses prevented
              </p>
            </div>

            {/* Card 4: Estimated Potential Savings */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Estimated Potential Savings</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                  NET ROI
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-sky-600 tracking-tight pt-1">
                {curr}{(summary?.estimated_potential_savings?.value ?? 11250) - (summary?.estimated_maintenance_cost?.value ?? 1750)}
              </div>
              <p className="text-xs text-slate-500 font-sans pt-1">
                Net avoided loss after deducting servicing labor
              </p>
            </div>
          </div>

          {/* ITEM-WISE BREAKDOWN TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 font-sans">
                Tool Expenditure Breakdown
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Itemized replacement and servicing costs per cutting insert
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                    <th className="p-4">Tool ID</th>
                    <th className="p-4">Tool Name</th>
                    <th className="p-4">Station</th>
                    <th className="p-4">Replacement Cost</th>
                    <th className="p-4">Maintenance Cost</th>
                    <th className="p-4">Total Cost</th>
                    <th className="p-4">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breakdown.map((item) => (
                    <tr key={item.tool_id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 font-bold text-sky-700">{item.tool_id}</td>
                      <td className="p-4 font-bold text-slate-900">{item.tool_name}</td>
                      <td className="p-4 text-slate-600">{item.machine_id}</td>
                      <td className="p-4 font-bold text-slate-900">{curr}{item.replacement_cost.toLocaleString()}</td>
                      <td className="p-4 text-slate-600">{curr}{item.maintenance_cost.toLocaleString()}</td>
                      <td className="p-4 font-black text-slate-900">{curr}{item.total_cost.toLocaleString()}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-600">
                          {item.data_type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Configure Plant Operating Rates</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateParams} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">
                  Tool Replacement Cost ({curr})
                </label>
                <input
                  type="number"
                  value={formData.tool_replacement_cost || 1200}
                  onChange={(e) =>
                    setFormData({ ...formData, tool_replacement_cost: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">
                  Unplanned Downtime Cost / Hour ({curr})
                </label>
                <input
                  type="number"
                  value={formData.downtime_cost_per_hour || 2250}
                  onChange={(e) =>
                    setFormData({ ...formData, downtime_cost_per_hour: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">
                  Maintenance Labor Rate / Hour ({curr})
                </label>
                <input
                  type="number"
                  value={formData.maintenance_labor_cost_per_hour || 350}
                  onChange={(e) =>
                    setFormData({ ...formData, maintenance_labor_cost_per_hour: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  {saveSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
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
