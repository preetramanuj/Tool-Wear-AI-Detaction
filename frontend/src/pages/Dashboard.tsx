import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  Play,
  RefreshCw,
  ShieldCheck,
  Wrench,
  Sliders,
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
import {
  getAnalyticsOverview,
  getWearTrend,
  getInspectionRecords,
  getAlerts,
  getTools,
  getImageUrl,
} from '../services/api';
import { AnalyticsOverview, WearTrendPoint, InspectionResult, AlertItem, Tool } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trendData, setTrendData] = useState<WearTrendPoint[]>([]);
  const [recentInspections, setRecentInspections] = useState<InspectionResult[]>([]);
  const [latestInspection, setLatestInspection] = useState<InspectionResult | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      const [ov, trend, inspRes, alts, toolsRes] = await Promise.all([
        getAnalyticsOverview().catch(() => null),
        getWearTrend().catch(() => []),
        getInspectionRecords(0, 10).catch(() => ({ count: 0, inspections: [] })),
        getAlerts(false).catch(() => []),
        getTools().catch(() => []),
      ]);

      if (ov) setOverview(ov);
      if (trend) setTrendData(trend);
      if (inspRes && inspRes.inspections && inspRes.inspections.length > 0) {
        setRecentInspections(inspRes.inspections);
        setLatestInspection(inspRes.inspections[0]);
      }
      if (alts) setActiveAlerts(alts);
      if (toolsRes) setTools(toolsRes);
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

  const currentTool = tools.find((t) => t.tool_id === latestInspection?.tool_id) || tools[0] || null;

  const toolWearMm =
    (latestInspection as any)?.wear_analysis?.wear_value ??
    (latestInspection as any)?.wear_value ??
    (currentTool?.current_wear_vb_mm ?? 0.28);
  const toolWearUm =
    (latestInspection as any)?.wear_analysis?.wear_um ??
    (latestInspection as any)?.wear_um ??
    (currentTool?.current_wear_um ?? 280);
  const toolRulCycles =
    (latestInspection as any)?.rul_prediction?.rul_value ??
    (latestInspection as any)?.rul_cycles ??
    (currentTool?.current_rul_cycles ?? 42);
  const toolHealthScore =
    (latestInspection as any)?.health_prediction?.health_score ??
    (latestInspection as any)?.health_score ??
    (toolWearUm > 0 ? Math.max(10, Math.round(100 - (toolWearUm / 300) * 100)) : 82);
  const toolStatus =
    (latestInspection as any)?.health_prediction?.health_status ??
    (latestInspection as any)?.health_status ??
    (currentTool?.status ?? 'HEALTHY');

  // AI Insight & Action
  let aiInsightText = `Tool ${currentTool?.tool_id || 'T-014'} shows a gradual increase in wear across recent inspections.`;
  let recommendedActionText = 'Continue operation and inspect at the next maintenance interval.';

  if (toolStatus === 'CRITICAL' || toolWearMm >= 0.28) {
    aiInsightText = `Tool ${currentTool?.tool_id || 'T-014'} flank wear has reached critical degradation limit (0.30 mm). Edge breakdown imminent.`;
    recommendedActionText = 'Replace tool cutting insert before starting the next production batch.';
  } else if (toolStatus === 'WARNING' || toolWearMm >= 0.22) {
    aiInsightText = `Tool ${currentTool?.tool_id || 'T-014'} wear slope is accelerating. Approaching ISO maintenance threshold.`;
    recommendedActionText = 'Schedule tool inspection and prepare replacement insert for upcoming shift change.';
  }

  // Chart 1: Wear Trend Data
  const wearChartLabels =
    trendData.length > 0
      ? trendData.map((d, i) => (d.timestamp ? d.timestamp.substring(11, 16) : `Insp ${i + 1}`))
      : ['Insp 1', 'Insp 5', 'Insp 10', 'Insp 15', 'Insp 20', 'Insp 25', 'Insp 30'];

  const wearChartValues =
    trendData.length > 0
      ? trendData.map((d) => d.wear_vb_mm || (d.wear_um ? d.wear_um / 1000 : 0.0))
      : [0.05, 0.09, 0.14, 0.18, 0.22, 0.25, 0.28];

  const wearChartData = {
    labels: wearChartLabels,
    datasets: [
      {
        label: 'Flank Wear (mm)',
        data: wearChartValues,
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.06)',
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: '#0284C7',
        borderWidth: 3,
      },
      {
        label: 'ISO Warning Threshold (0.22 mm)',
        data: Array(wearChartLabels.length).fill(0.22),
        borderColor: '#F59E0B',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        borderWidth: 1.5,
      },
      {
        label: 'ISO Critical Threshold (0.30 mm)',
        data: Array(wearChartLabels.length).fill(0.30),
        borderColor: '#EF4444',
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
        borderWidth: 2,
      },
    ],
  };

  // Chart 2: RUL Trend Data
  const rulChartValues =
    trendData.length > 0
      ? trendData.map((d) => d.rul_cycles ?? Math.max(0, Math.round((0.30 - (d.wear_vb_mm || 0.1)) / 0.003)))
      : [120, 105, 90, 75, 60, 50, 42];

  const rulChartData = {
    labels: wearChartLabels,
    datasets: [
      {
        label: 'Remaining Useful Life (Cycles)',
        data: rulChartValues,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.06)',
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: '#10B981',
        borderWidth: 3,
      },
      {
        label: 'Critical Threshold (15 cycles)',
        data: Array(wearChartLabels.length).fill(15),
        borderColor: '#F59E0B',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        borderWidth: 1.5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#334155',
          font: { family: 'Inter', size: 12, weight: 600 },
          padding: 16,
        },
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
    <div className="p-6 md:p-12 space-y-12 max-w-6xl mx-auto font-sans text-slate-800">
      {/* ============================================================ */}
      {/* SECTION 1 — PAGE HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              ToolGuard-AI
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System: ● Online
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-600 font-mono">
            Predictive Tool Maintenance
          </div>
          <p className="text-xs text-slate-500 font-sans">
            AI-powered tool inspection and predictive maintenance.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SECTION 2 — CURRENT INSPECTION (LARGE HERO SECTION) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-sky-600 font-bold">
              CURRENT INSPECTION
            </span>
            <h2 className="text-2xl font-bold text-slate-900 font-sans mt-0.5">
              Current Monitored Tool
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Station: {currentTool?.machine_id || 'CNC-LATHE-01'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* LEFT: Large Latest Tool Image */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200 shadow-inner">
              {latestInspection?.images?.annotated || (latestInspection as any)?.annotated_image_path ? (
                <img
                  src={getImageUrl(latestInspection?.images?.annotated || (latestInspection as any)?.annotated_image_path)}
                  alt="Current Tool Inspection"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <Wrench className="w-16 h-16 text-slate-600 mx-auto" />
                  <div className="text-sm font-mono text-slate-300 font-bold">
                    Tool: {currentTool?.tool_id || 'T-014'} (Carbide Insert)
                  </div>
                  <div className="text-xs text-slate-500 font-sans">
                    Optical Macro Vision Feed Active
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Tool Status & Large Metrics */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-1.5 pb-4 border-b border-slate-100">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                CURRENT TOOL
              </span>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight font-sans">
                  {currentTool?.tool_id || 'T-014'}
                </h3>
                <span
                  className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                    toolStatus === 'HEALTHY'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : toolStatus === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  ● {toolStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {currentTool?.tool_name || 'Carbide Insert'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 font-mono">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Wear</div>
                <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                  {toolWearMm.toFixed(2)} <span className="text-xs font-normal text-slate-500">mm</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{toolWearUm.toFixed(0)} µm</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Health</div>
                <div className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">
                  {toolHealthScore}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Condition</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">RUL</div>
                <div className="text-2xl md:text-3xl font-black text-sky-600 mt-1">
                  {toolRulCycles !== null ? toolRulCycles : '42'} <span className="text-xs font-normal text-slate-500">cyc</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">To Limit</div>
              </div>
            </div>

            <Link
              to="/tools"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs font-mono transition shadow-xs"
            >
              <span>[ View Tool Details ]</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3 — FOUR KPI CARDS (ONLY FOUR CARDS) */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            OPERATIONAL STATUS
          </span>
          <h2 className="text-xl font-bold text-slate-900 font-sans mt-0.5">
            Key Performance Indicators
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
          {/* Card 1: Health */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px]">Health</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl md:text-4xl font-black text-emerald-600 pt-2">
              {overview?.kpis?.healthy_tools ? `${Math.round((overview.kpis.healthy_tools / (overview.kpis.total_tools || 1)) * 100)}%` : '82%'}
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              Fleet operating condition
            </p>
          </div>

          {/* Card 2: Wear */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px]">Wear</span>
              <Activity className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl md:text-4xl font-black text-slate-900 pt-2">
              {(overview?.kpis?.avg_wear_vb_mm ?? 0.14).toFixed(2)} <span className="text-xs font-normal text-slate-500">mm</span>
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              Average flank wear
            </p>
          </div>

          {/* Card 3: RUL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px]">RUL</span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl md:text-4xl font-black text-sky-600 pt-2">
              {overview?.kpis?.avg_rul_cycles ?? 109} <span className="text-xs font-normal text-slate-500">cyc</span>
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              Mean cycles to replacement
            </p>
          </div>

          {/* Card 4: Alerts */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px]">Alerts</span>
              <AlertTriangle className={`w-4 h-4 ${activeAlerts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div className={`text-3xl md:text-4xl font-black pt-2 ${activeAlerts.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {activeAlerts.length}
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              {activeAlerts.length === 0 ? 'All parameters normal' : 'Active notifications'}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 4 — WEAR TREND (LARGE FULL-WIDTH CHART) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-sans">
              Wear Trend
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Tool wear across inspections
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-600 self-start sm:self-auto">
            Limit: 0.30 mm ISO Threshold
          </span>
        </div>

        <div className="h-[400px] w-full pt-4">
          <Line data={wearChartData} options={chartOptions} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 5 — RUL TREND (LARGE FULL-WIDTH CHART) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-sans">
              Remaining Useful Life
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Predicted useful life over time
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-600 self-start sm:self-auto">
            Model: XGBoost Regressor
          </span>
        </div>

        <div className="h-[400px] w-full pt-4">
          <Line data={rulChartData} options={chartOptions} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 6 — AI INSIGHT (LARGE SIMPLE CARD) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <CheckCircle2 className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-bold text-slate-900 uppercase font-mono tracking-wide">
            AI Insight
          </h2>
        </div>

        <div className="space-y-6 font-sans">
          <div className="space-y-1.5">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              AI INSIGHT
            </div>
            <p className="text-base md:text-lg text-slate-900 font-medium leading-relaxed">
              "{aiInsightText}"
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-1.5">
            <div className="text-xs font-mono font-bold text-sky-700 uppercase tracking-wider">
              RECOMMENDED ACTION
            </div>
            <p className="text-base font-bold text-slate-900">
              "{recommendedActionText}"
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 7 — RECENT INSPECTIONS (SIMPLE TABLE) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-sans">
              Recent Inspections
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Verified optical inspection audit history
            </p>
          </div>
          <Link
            to="/inspections"
            className="text-xs font-mono font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="p-4">Inspection</th>
                <th className="p-4">Tool</th>
                <th className="p-4">Wear</th>
                <th className="p-4">Health</th>
                <th className="p-4">RUL</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInspections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Not enough historical data to generate an insight.
                  </td>
                </tr>
              ) : (
                recentInspections.slice(0, 5).map((r) => {
                  const status = (r as any).health_prediction?.health_status || (r as any).health_status || 'HEALTHY';
                  const wearMm = (r as any).wear_analysis?.wear_value ?? (r as any).wear_value ?? 0.0;
                  const healthScore = (r as any).health_prediction?.health_score ?? (r as any).health_score ?? 100;
                  const rulCycles = (r as any).rul_prediction?.rul_value ?? (r as any).rul_cycles ?? null;
                  return (
                    <tr key={r.inspection_id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 font-bold text-slate-900">{r.inspection_id}</td>
                      <td className="p-4 font-semibold text-sky-700">{r.tool_id || 'T-014'}</td>
                      <td className="p-4 font-bold text-slate-900">{wearMm.toFixed(2)} mm</td>
                      <td className="p-4 font-bold text-emerald-600">{healthScore}%</td>
                      <td className="p-4 text-slate-700">{rulCycles !== null ? `${rulCycles} cyc` : 'N/A'}</td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                            status === 'HEALTHY'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          ● {status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-500 font-sans">
                        {r.timestamp ? r.timestamp.replace('T', ' ').substring(0, 16) : 'Just now'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 8 — QUICK ACTIONS */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wide">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 font-mono">
          <Link
            to="/inspections"
            className="flex items-center justify-center gap-2.5 p-5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-xs transition shadow-xs"
          >
            <Play className="w-4 h-4" />
            <span>[ New Inspection ]</span>
          </Link>

          <Link
            to="/optimization"
            className="flex items-center justify-center gap-2.5 p-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl font-bold text-xs transition shadow-2xs"
          >
            <Sliders className="w-4 h-4 text-sky-600" />
            <span>[ Optimize Process ]</span>
          </Link>

          <Link
            to="/tools"
            className="flex items-center justify-center gap-2.5 p-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl font-bold text-xs transition shadow-2xs"
          >
            <Wrench className="w-4 h-4 text-slate-600" />
            <span>[ Tool Inventory ]</span>
          </Link>

          <Link
            to="/insights"
            className="flex items-center justify-center gap-2.5 p-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl font-bold text-xs transition shadow-2xs"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>[ Mfg Insights ]</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
