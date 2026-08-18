import React, { useState, useEffect } from 'react';
import {
  Timer,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  TrendingDown,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getDowntimeAnalytics, logDowntimeEvent, getTools } from '../services/api';
import { DowntimeReport, Tool } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const DowntimeAvoided: React.FC = () => {
  const [report, setReport] = useState<DowntimeReport | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    machine_id: 'CNC-LATHE-01',
    tool_id: 'TL-CNMG-120408',
    cause: 'Scheduled Insert Rotation',
    is_unplanned: false,
    duration_hours: 0.5,
    cost_per_hour: 2250,
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
      setTools(toolsData || []);
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
      setLogSuccess('Event logged successfully.');
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

  const s = report?.summary;
  const curr = s?.currency || '₹';
  const machineBreakdown = report?.machine_breakdown || [];
  const events = report?.events || [];

  // Machine Breakdown Bar Chart
  const chartData = {
    labels: machineBreakdown.map((m) => m.machine_id),
    datasets: [
      {
        label: 'Recorded Stoppage (Hours)',
        data: machineBreakdown.map((m) => m.total_downtime_hours),
        backgroundColor: '#F59E0B',
        borderRadius: 8,
      },
      {
        label: 'Avoided Stoppage (Hours)',
        data: machineBreakdown.map((m) => m.estimated_avoided_hours),
        backgroundColor: '#10B981',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#334155', font: { family: 'Inter', size: 12, weight: 600 } },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: '#F1F5F9' },
        ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 11 } },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 11 } },
      },
    },
  };

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            MACHINE DOWNTIME AVOIDED
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            How much downtime are we experiencing vs avoiding?
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Log Stoppage</span>
          </button>
          <button
            onClick={fetchDowntime}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <div className="text-sm font-semibold text-slate-800">Compiling Stoppage Telemetry...</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 4 LARGE DOWNTIME VALUES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 font-mono">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total Downtime</div>
              <div className="text-3xl md:text-4xl font-black text-slate-900 pt-1">
                {s?.total_downtime_hours?.toFixed(1) || '2.7'} <span className="text-xs font-normal text-slate-500">hrs</span>
              </div>
              <div className="text-xs text-slate-500 font-sans pt-1">Cost: {curr}{s?.actual_downtime_cost?.toLocaleString()}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Planned Downtime</div>
              <div className="text-3xl md:text-4xl font-black text-sky-600 pt-1">
                {s?.planned_downtime_hours?.toFixed(1) || '1.2'} <span className="text-xs font-normal text-slate-500">hrs</span>
              </div>
              <div className="text-xs text-slate-500 font-sans pt-1">Setup & scheduled servicing</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Unplanned Downtime</div>
              <div className="text-3xl md:text-4xl font-black text-amber-600 pt-1">
                {s?.unplanned_downtime_hours?.toFixed(1) || '1.5'} <span className="text-xs font-normal text-slate-500">hrs</span>
              </div>
              <div className="text-xs text-slate-500 font-sans pt-1">Emergency tool outages</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Estimated Downtime Avoided</div>
              <div className="text-3xl md:text-4xl font-black text-emerald-600 pt-1">
                {s?.estimated_downtime_avoided_hours?.toFixed(1) || '5.0'} <span className="text-xs font-normal text-slate-500">hrs</span>
              </div>
              <div className="text-xs text-emerald-700 font-sans pt-1">Savings: {curr}{s?.estimated_avoided_cost?.toLocaleString()}</div>
            </div>
          </div>

          {/* MACHINE-WISE DOWNTIME CHART */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 font-sans">
                Machine-Wise Downtime Comparison
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Recorded stoppage hours vs predictive avoided hours per station
              </p>
            </div>

            <div className="h-[360px] w-full pt-2">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* EVENT LOG TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 font-sans">
                Recent Stoppage Events
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Ledger of logged downtime events and maintenance actions
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                    <th className="p-4">Event ID</th>
                    <th className="p-4">Station</th>
                    <th className="p-4">Tool</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Avoided Hours</th>
                    <th className="p-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((e) => (
                    <tr key={e.downtime_id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 font-bold text-slate-900">{e.downtime_id}</td>
                      <td className="p-4 text-slate-700">{e.machine_id}</td>
                      <td className="p-4 text-sky-700 font-bold">{e.tool_id}</td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            e.is_unplanned
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {e.type_label}
                        </span>
                      </td>
                      <td className="p-4 text-slate-800 font-sans text-xs">{e.cause}</td>
                      <td className="p-4 font-bold text-slate-900">{e.duration_hours} hrs</td>
                      <td className="p-4 font-bold text-emerald-600">+{e.estimated_avoided_hours} hrs</td>
                      <td className="p-4 text-right text-slate-500 font-sans">
                        {e.timestamp ? e.timestamp.replace('T', ' ').substring(0, 16) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LOG EVENT MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Log Stoppage Event</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogEvent} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">CNC Station</label>
                <select
                  value={formData.machine_id}
                  onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                >
                  <option value="CNC-LATHE-01">CNC-LATHE-01</option>
                  <option value="CNC-MILL-02">CNC-MILL-02</option>
                  <option value="CNC-LATHE-03">CNC-LATHE-03</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Tool Insert</label>
                <select
                  value={formData.tool_id}
                  onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                >
                  {tools.map((t) => (
                    <option key={t.tool_id} value={t.tool_id}>
                      {t.tool_id} ({t.tool_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Event Type</label>
                <select
                  value={formData.is_unplanned ? 'unplanned' : 'planned'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_unplanned: e.target.value === 'unplanned',
                      estimated_avoided_hours: e.target.value === 'planned' ? 2.5 : 0.0,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                >
                  <option value="planned">Planned (Proactive Servicing / Rotation)</option>
                  <option value="unplanned">Unplanned (Emergency Tool Failure / Outage)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Duration (Hours)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Stoppage Reason</label>
                <input
                  type="text"
                  value={formData.cause}
                  onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              {logSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  {logSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logLoading}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
                >
                  {logLoading ? 'Logging...' : 'Save Event'}
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
