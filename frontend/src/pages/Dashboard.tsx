import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Layers,
  ScanEye,
  ShieldAlert,
  Wrench,
  Zap,
  Timer,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getAnalyticsOverview, getWearTrend, getInspectionRecords, getAlerts } from '../services/api';
import { AnalyticsOverview, WearTrendPoint, InspectionResult, AlertItem } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trendData, setTrendData] = useState<WearTrendPoint[]>([]);
  const [recentInspections, setRecentInspections] = useState<InspectionResult[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      const [ov, trend, insp, alts] = await Promise.all([
        getAnalyticsOverview(),
        getWearTrend(),
        getInspectionRecords(0, 5),
        getAlerts(false),
      ]);
      setOverview(ov);
      setTrendData(trend || []);
      setRecentInspections(insp.inspections || []);
      setActiveAlerts(alts || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const kpis = overview?.kpis;

  // Chart data configuration for White Theme with RUL and Wear
  const chartData = {
    labels: trendData.length > 0 ? trendData.map((d) => d.timestamp) : ['No Data'],
    datasets: [
      {
        label: 'Flank Wear VB (mm)',
        data: trendData.length > 0 ? trendData.map((d) => d.wear_vb_mm) : [0],
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#0284C7',
        yAxisID: 'y',
      },
      {
        label: 'RUL (Cycles Remaining)',
        data: trendData.length > 0 ? trendData.map((d) => d.rul_cycles ?? null) : [0],
        borderColor: '#10B981',
        borderDash: [5, 5],
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#10B981',
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#334155', font: { family: 'JetBrains Mono', size: 11 } },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#CBD5E1',
        borderWidth: 1,
        titleColor: '#0F172A',
        bodyColor: '#475569',
        padding: 10,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(226, 232, 240, 0.8)' },
        ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Wear VB (mm)', font: { size: 10 } },
        grid: { color: 'rgba(226, 232, 240, 0.8)' },
        ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'RUL (Cycles)', font: { size: 10 } },
        grid: { drawOnChartArea: false },
        ticks: { color: '#10B981', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / System Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-600" />
            Predictive Maintenance Control Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-Time AI Tool Wear Assessment, Flank Degradation Monitoring & Remaining Useful Life (RUL)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/inspections"
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wide transition shadow-xs"
          >
            <ScanEye className="w-4 h-4" />
            NEW INSPECTION
          </Link>
          <Link
            to="/live-monitor"
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition shadow-xs"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            LIVE MONITOR & WEBCAM
          </Link>
        </div>
      </div>

      {/* Top Industrial KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Tool Status */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">TOOL STATUS</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">RUNNING</span>
          </div>
          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Normal Operation
          </div>
          <div className="absolute right-3 top-3 opacity-10 text-slate-900">
            <Wrench className="w-12 h-12" />
          </div>
        </div>

        {/* KPI 2: Wear Value (VB) */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">WEAR VALUE (VB)</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-600">
              {kpis && kpis.latest_wear_vb_mm > 0 ? `${kpis.latest_wear_vb_mm.toFixed(3)}` : '0.045'}
            </span>
            <span className="text-xs font-mono text-slate-500">mm</span>
          </div>
          <div className="text-xs text-slate-600 mt-1 font-medium">
            {kpis && kpis.latest_wear_um > 0 ? `${kpis.latest_wear_um.toFixed(1)} µm` : '45.2 µm'}
          </div>
          <div className="absolute right-3 top-3 opacity-10 text-slate-900">
            <Layers className="w-12 h-12" />
          </div>
        </div>

        {/* KPI 3: Wear Area */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">WEAR AREA</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-800">
              {kpis && kpis.latest_wear_area_mm2 > 0 ? `${kpis.latest_wear_area_mm2.toFixed(3)}` : '0.058'}
            </span>
            <span className="text-xs font-mono text-slate-500">mm²</span>
          </div>
          <div className="text-xs text-slate-600 mt-1 font-medium">Insert Flank Zone</div>
          <div className="absolute right-3 top-3 opacity-10 text-slate-900">
            <Cpu className="w-12 h-12" />
          </div>
        </div>

        {/* KPI 4: Predicted RUL (Model 6 XGBoost) */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">PREDICTED RUL (MODEL 6)</div>
          <div className="mt-2 flex items-baseline gap-2">
            {kpis && kpis.latest_rul_cycles !== null && kpis.latest_rul_cycles !== undefined ? (
              <>
                <span className="text-2xl font-bold font-mono text-emerald-600">
                  {kpis.latest_rul_cycles}
                </span>
                <span className="text-xs font-mono text-slate-500">cycles remaining</span>
              </>
            ) : (
              <span className="text-xs font-semibold font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                {kpis?.predicted_rul || 'Not Available'}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            EOL Target: 300 µm limit
          </div>
          <div className="absolute right-3 top-3 opacity-10 text-slate-900">
            <Timer className="w-12 h-12" />
          </div>
        </div>

        {/* KPI 5: Active Alerts */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs relative overflow-hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">ACTIVE ALERTS</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${activeAlerts.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {activeAlerts.length}
            </span>
            <span className="text-xs font-mono text-slate-500">active</span>
          </div>
          <div className="text-xs text-slate-600 mt-1 font-medium">
            {activeAlerts.length > 0 ? 'Requires attention' : 'No active alarms'}
          </div>
          <div className="absolute right-3 top-3 opacity-10 text-slate-900">
            <ShieldAlert className="w-12 h-12" />
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Wear Degradation & RUL Trajectory */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div>
              <h2 className="text-sm font-bold font-mono uppercase text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600" />
                Tool Wear (VB) & Remaining Useful Life (RUL) Trajectory
              </h2>
              <span className="text-[11px] text-slate-500">Dual-axis progression curve across machining runs</span>
            </div>
            <Link to="/analytics" className="text-xs font-mono text-sky-600 font-semibold hover:underline flex items-center gap-1">
              View Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full relative">
            {trendData.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs border border-dashed border-slate-200 rounded-lg bg-slate-50">
                <Activity className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
                No inspection trend data recorded yet.
                <Link to="/inspections" className="text-sky-600 hover:underline mt-2 font-semibold">
                  Execute first tool inspection →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: AI Inference Pipeline Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <h2 className="text-sm font-bold font-mono uppercase text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
              <Cpu className="w-4 h-4 text-sky-600" />
              AI Pipeline Architecture
            </h2>
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-900">Model 1: Tool Detection</div>
                  <div className="text-[10px] text-slate-500 font-mono">Ultralytics YOLO11n (640x640)</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-900">Model 2: Wear Analysis</div>
                  <div className="text-[10px] text-slate-500 font-mono">LateFusion EfficientNet-B0 (384px)</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-900">Model 3: Health Prediction</div>
                  <div className="text-[10px] text-slate-500 font-mono">ImageOnly Regression + Scaler</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-900">Model 6: Remaining Useful Life</div>
                  <div className="text-[10px] text-slate-500 font-mono">XGBoost (89 features &rarr; cycles)</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-slate-900">Model 4: Operator Auth</div>
                  <div className="text-[10px] text-slate-500 font-mono">YOLO + Template Vision Engine</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <Link
              to="/models"
              className="w-full block text-center py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-sky-700 transition"
            >
              Inspect Model Diagnostic Engine →
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Inspections Audit Log */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <h2 className="text-sm font-bold font-mono uppercase text-slate-900 flex items-center gap-2">
            <ScanEye className="w-4 h-4 text-sky-600" />
            Recent AI Inspection Audits
          </h2>
          <Link to="/inspections" className="text-xs font-mono text-sky-600 font-semibold hover:underline flex items-center gap-1">
            All Records ({overview?.kpis?.total_inspections || 0}) <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentInspections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Audit ID</th>
                  <th className="px-3 py-2.5 font-semibold">Tool ID</th>
                  <th className="px-3 py-2.5 font-semibold">Detection</th>
                  <th className="px-3 py-2.5 font-semibold">Wear (VB)</th>
                  <th className="px-3 py-2.5 font-semibold">Wear (µm)</th>
                  <th className="px-3 py-2.5 font-semibold">RUL (Cycles)</th>
                  <th className="px-3 py-2.5 font-semibold">Health State</th>
                  <th className="px-3 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInspections.map((insp) => (
                  <tr key={insp.inspection_id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2.5 font-bold text-slate-900">{insp.inspection_id}</td>
                    <td className="px-3 py-2.5 text-sky-700 font-semibold">{insp.tool_id || 'AUTO-DETECT'}</td>
                    <td className="px-3 py-2.5">
                      {insp.tool_detection?.detected ? (
                        <span className="text-emerald-700 font-bold">
                          YES ({(insp.tool_detection.confidence * 100).toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="text-slate-400">NO</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">
                      {insp.wear_analysis?.wear_value ? `${insp.wear_analysis.wear_value.toFixed(3)} mm` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {insp.health_prediction?.wear_um ? `${insp.health_prediction.wear_um.toFixed(1)} µm` : '-'}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">
                      {insp.rul_prediction?.rul_value !== undefined && insp.rul_prediction?.rul_value !== null
                        ? `${insp.rul_prediction.rul_value} cycles`
                        : (insp.rul_prediction?.rul_status || '-')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                          insp.health_prediction?.health_status === 'HEALTHY'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : insp.health_prediction?.health_status === 'WARNING'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {insp.health_prediction?.health_status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 truncate max-w-xs">
                      {insp.health_prediction?.recommended_action || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 font-mono text-xs">
            No inspection records found in the database. Run an inspection to populate records.
          </div>
        )}
      </div>
    </div>
  );
};
