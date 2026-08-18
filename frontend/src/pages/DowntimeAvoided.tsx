import React, { useState, useEffect } from 'react';
import {
  Timer,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Cpu,
  TrendingDown,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { getDowntimeAnalytics, logDowntimeEvent, getTools } from '../services/api';
import { DowntimeReport, Tool } from '../types/api';

export const DowntimeAvoided: React.FC = () => {
  const [report, setReport] = useState<DowntimeReport | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    machine_id: 'CNC-LATHE-01',
    tool_id: 'TL-CNMG-120408',
    cause: 'Scheduled Tool Replacement',
    is_unplanned: false,
    duration_hours: 0.5,
    cost_per_hour: 4500,
    estimated_avoided_hours: 2.5,
  });
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);

  const fetchDowntime = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dtData, toolsData] = await Promise.all([
        getDowntimeAnalytics(),
        getTools().catch(() => []),
      ]);
      setReport(dtData);
      setTools(toolsData);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch downtime analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDowntime();
  }, []);

  const handleLogEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogLoading(true);
    setLogSuccess(null);
    try {
      const payload = {
        ...formData,
        total_loss: formData.duration_hours * formData.cost_per_hour,
      };
      await logDowntimeEvent(payload);
      setLogSuccess('Downtime event logged successfully.');
      setTimeout(() => {
        setLogSuccess(null);
        setShowLogModal(false);
        fetchDowntime();
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to log event.');
    } finally {
      setLogLoading(false);
    }
  };

  const curr = report?.summary?.currency || '₹';

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-sm">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Machine Downtime & Avoidance Analysis
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                  MODEL 8 RELIABILITY
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Stoppage tracking, planned maintenance efficiency, and estimated avoided downtime quantification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-all shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Log Downtime Event
          </button>
          <button
            onClick={fetchDowntime}
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
          <div className="text-sm font-semibold text-slate-800">Analyzing Machine Stoppage Telemetry...</div>
          <div className="text-xs text-slate-500 font-mono mt-1">Cross-referencing RUL pre-emptions and maintenance records</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">Error loading downtime records</div>
            <div>{error}</div>
          </div>
        </div>
      ) : !report ? null : (
        <>
          {/* KPI Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Estimated Downtime Avoided</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                {report.summary.estimated_downtime_avoided_hours} hrs
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Saved {curr} {report.summary.estimated_avoided_cost.toLocaleString()} in production loss
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Total Stoppage Time</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {report.summary.total_downtime_hours} hrs
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Total plant downtime across {report.summary.total_events_count} events
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Planned Maintenance</div>
              <div className="text-2xl font-bold font-mono text-sky-600 mt-1">
                {report.summary.planned_downtime_hours} hrs
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Pre-emptive scheduled servicing</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-[11px] font-mono text-slate-500 font-medium uppercase">Unplanned Breakdowns</div>
              <div className={`text-2xl font-bold font-mono mt-1 ${report.summary.unplanned_downtime_hours > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {report.summary.unplanned_downtime_hours} hrs
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Unscheduled emergency stoppages</div>
            </div>
          </div>

          {/* Machine-Wise Downtime Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Machine-Wise Downtime & Avoidance Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
                    <th className="p-3">Machine</th>
                    <th className="p-3">Cell Name</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Total Downtime</th>
                    <th className="p-3">Planned Time</th>
                    <th className="p-3">Unplanned Time</th>
                    <th className="p-3">Estimated Avoided</th>
                    <th className="p-3">Financial Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {report.machine_breakdown.map((m) => (
                    <tr key={m.machine_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{m.machine_id}</td>
                      <td className="p-3 text-slate-700 font-sans">{m.machine_name}</td>
                      <td className="p-3 text-slate-500 font-sans">{m.location}</td>
                      <td className="p-3 text-slate-800 font-bold">{m.total_downtime_hours} hrs</td>
                      <td className="p-3 text-sky-700">{m.planned_hours} hrs</td>
                      <td className="p-3 text-rose-600">{m.unplanned_hours} hrs</td>
                      <td className="p-3 text-emerald-600 font-bold">{m.estimated_avoided_hours} hrs</td>
                      <td className="p-3 font-bold text-slate-900">{curr} {m.financial_loss.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Downtime Events Log Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                Historical Downtime & Maintenance Events
              </h3>
              <span className="text-[10px] font-mono text-slate-500">{report.events.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500">
                    <th className="p-3">Event ID</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Machine</th>
                    <th className="p-3">Tool</th>
                    <th className="p-3">Cause / Activity</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Estimated Avoided</th>
                    <th className="p-3">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.events.map((ev) => (
                    <tr key={ev.downtime_id} className="hover:bg-slate-50/50 font-mono">
                      <td className="p-3 font-bold text-slate-900">{ev.downtime_id}</td>
                      <td className="p-3 text-slate-500">{ev.timestamp}</td>
                      <td className="p-3 text-slate-700">{ev.machine_id}</td>
                      <td className="p-3 text-slate-600">{ev.tool_id}</td>
                      <td className="p-3 text-slate-800 font-sans">{ev.cause}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            ev.is_unplanned
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {ev.type_label}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{ev.duration_hours} hrs</td>
                      <td className="p-3 text-emerald-600 font-bold">{ev.estimated_avoided_hours} hrs</td>
                      <td className="p-3 font-bold text-slate-900">{curr} {ev.total_loss.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="font-bold text-sm text-slate-900 font-mono">Log Machine Downtime / Maintenance</div>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {logSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{logSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLogEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Machine Cell</label>
                <select
                  value={formData.machine_id}
                  onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                >
                  <option value="CNC-LATHE-01">CNC-LATHE-01 (Monarch)</option>
                  <option value="CNC-MILL-02">CNC-MILL-02 (DMG MORI)</option>
                  <option value="CNC-LATHE-03">CNC-LATHE-03 (Okuma)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Associated Tool ID</label>
                <select
                  value={formData.tool_id}
                  onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                >
                  {tools.map((t) => (
                    <option key={t.tool_id} value={t.tool_id}>
                      {t.tool_id} - {t.tool_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Cause / Description</label>
                <input
                  type="text"
                  value={formData.cause}
                  onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-sky-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Estimated Avoided (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.estimated_avoided_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_avoided_hours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-sky-600"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.is_unplanned}
                    onChange={(e) => setFormData({ ...formData, is_unplanned: e.target.checked })}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Unplanned Emergency Stoppage (Tick if unscheduled breakdown)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logLoading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-semibold disabled:opacity-50"
                >
                  {logLoading ? 'Saving...' : 'Log Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DowntimeAvoided;
