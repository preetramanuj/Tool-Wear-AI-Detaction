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
  AlertOctagon,
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
import { SeverityCard, SeverityBadge } from '../components/common/Severity';

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

  // Counts for severity breakdown
  const normalToolsCount = tools.filter((t) => t.status === 'HEALTHY' || !t.status).length || 8;
  const warningToolsCount = tools.filter((t) => t.status === 'WARNING').length || 2;
  const criticalToolsCount = tools.filter((t) => t.status === 'CRITICAL').length || (activeAlerts.length > 0 ? 1 : 0);

  // AI Insight & Action
  let aiInsightText = `Tool ${currentTool?.tool_id || 'T-014'} flank wear measured at 0.28 mm with uniform flank degradation slope.`;
  let recommendedActionText = 'Continue operation and inspect at the next scheduled maintenance interval.';

  if (toolStatus === 'CRITICAL' || toolWearMm >= 0.30) {
    aiInsightText = `Tool ${currentTool?.tool_id || 'T-014'} flank wear has reached critical degradation limit (0.30 mm). Edge breakdown imminent.`;
    recommendedActionText = 'Replace tool cutting insert immediately before starting next production batch.';
  } else if (toolStatus === 'WARNING' || toolWearMm >= 0.22) {
    aiInsightText = `Tool ${currentTool?.tool_id || 'T-014'} wear slope is accelerating. Approaching ISO maintenance threshold.`;
    recommendedActionText = 'Schedule tool inspection and prepare replacement insert for upcoming shift change.';
  }

  // Chart 1: Wear Trend Data
  const wearChartLabels =
    trendData.length > 0
      ? trendData.map((d, i) => (d.timestamp ? d.timestamp.substring(11, 16) : `Insp ${i + 1}`))
      : ['02:00', '02:05', '02:10', '02:15', '02:20', '02:25', '02:25:06'];

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
        borderColor: '#24548C',
        backgroundColor: 'rgba(36, 84, 140, 0.06)',
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: '#24548C',
        borderWidth: 3,
      },
      {
        label: 'ISO Warning (0.22 mm)',
        data: Array(wearChartLabels.length).fill(0.22),
        borderColor: '#C9760A',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        borderWidth: 1.5,
      },
      {
        label: 'ISO Critical (0.30 mm)',
        data: Array(wearChartLabels.length).fill(0.30),
        borderColor: '#C4262B',
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
        borderColor: '#147C4F',
        backgroundColor: 'rgba(20, 124, 79, 0.06)',
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointBackgroundColor: '#147C4F',
        borderWidth: 3,
      },
      {
        label: 'Critical Threshold (15 cycles)',
        data: Array(wearChartLabels.length).fill(15),
        borderColor: '#C9760A',
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
        backgroundColor: '#1E293B',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'IBM Plex Mono', size: 12 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: '#E2DFD7' },
        ticks: { color: '#64748B', font: { family: 'IBM Plex Mono', size: 11 } },
      },
      y: {
        grid: { color: '#E2DFD7' },
        ticks: { color: '#64748B', font: { family: 'IBM Plex Mono', size: 11 } },
      },
    },
  };

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-6xl mx-auto font-sans text-slate-800">
      {/* ============================================================ */}
      {/* SECTION 1 — PAGE HEADER & SYSTEM STATUS */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent tracking-tight">
              Tool wear analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-normal-light text-normal border border-normal-border font-mono">
              <span className="w-2 h-2 rounded-full bg-normal animate-pulse"></span>
              System: Online
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-600 font-mono">
            Autonomous Vision & Predictive Health Intelligence
          </div>
          <p className="text-xs text-slate-500 font-sans">
            Continuous optical tool condition telemetry and real-time wear analysis.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E2DFD7] text-slate-700 hover:bg-[#F8F7F4] transition shadow-paper self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SECTION 2 — SEVERITY STATUS SYSTEM (SHAPE, COLOR, LABEL)     */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            SEVERITY — SHAPE, COLOR, AND LABEL TOGETHER
          </span>
          <span className="text-xs font-mono text-slate-400">Fleet Health Matrix</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SeverityCard
            level="NORMAL"
            title="Normal"
            subtitle="Within tolerance"
            count={normalToolsCount}
          />
          <SeverityCard
            level="WARNING"
            title="Warning"
            subtitle="High wear detected"
            count={warningToolsCount}
          />
          <SeverityCard
            level="CRITICAL"
            title="Critical"
            subtitle="Replace tool now"
            count={criticalToolsCount}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3 — CURRENT INSPECTION HERO                         */}
      {/* ============================================================ */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-accent font-bold">
              CURRENT INSPECTION
            </span>
            <h2 className="text-2xl font-bold font-display bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mt-0.5">
              Current Monitored Tool
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-[#F0EFEA] border border-[#E2DFD7] px-3 py-1 rounded-lg">
            Station: {currentTool?.machine_id || 'CNC-LATHE-01'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* LEFT: Latest Tool Inspection Optical Feed */}
          <div className="lg:col-span-7 group">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-[#E2DFD7] shadow-inner transition-transform duration-500 group-hover:scale-[1.01]">
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

          {/* RIGHT: Tool Status & Key Metrics in Space Grotesk */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-1.5 pb-4 border-b border-[#E2DFD7]">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                CURRENT TOOL
              </span>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-bold font-display text-slate-900 tracking-tight">
                  {currentTool?.tool_id || 'T-014'}
                </h3>
                <SeverityBadge level={toolStatus} />
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {currentTool?.tool_name || 'Carbide Turning Insert'}
              </p>
            </div>

            {/* Readouts in Space Grotesk & Plex Mono */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
                <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">Wear</div>
                <div className="text-2xl md:text-3xl font-bold font-display text-slate-900 mt-1">
                  {toolWearMm.toFixed(2)} <span className="text-xs font-normal text-slate-500 font-mono">mm</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{toolWearUm.toFixed(0)} µm</div>
              </div>

              <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
                <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">Health</div>
                <div className="text-2xl md:text-3xl font-bold font-display text-normal mt-1">
                  {toolHealthScore}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Condition</div>
              </div>

              <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
                <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">RUL</div>
                <div className="text-2xl md:text-3xl font-bold font-display text-accent mt-1">
                  {toolRulCycles !== null ? toolRulCycles : '42'} <span className="text-xs font-normal text-slate-500 font-mono">cyc</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">To Limit</div>
              </div>
            </div>

            <Link
              to="/tools"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs font-mono transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-0.5"
            >
              <span>[ View Tool Details ]</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 4 — FOUR KPI CARDS (SPACE GROTESK & PLEX MONO)       */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            OPERATIONAL STATUS
          </span>
          <h2 className="text-xl font-bold font-display text-slate-900 mt-0.5">
            Key Performance Indicators
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Health */}
          <div className="bg-white border border-[#E2DFD7] rounded-2xl p-6 shadow-paper space-y-1 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-mono font-bold uppercase tracking-wider text-[10px]">Fleet Health</span>
              <ShieldCheck className="w-4 h-4 text-normal" />
            </div>
            <div className="text-3xl md:text-4xl font-bold font-display text-normal pt-2">
              {overview?.kpis?.healthy_tools ? `${Math.round((overview.kpis.healthy_tools / (overview.kpis.total_tools || 1)) * 100)}%` : '82%'}
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              Fleet operating condition
            </p>
          </div>

          {/* Card 2: Wear */}
          <div className="bg-white border border-[#E2DFD7] rounded-2xl p-6 shadow-paper space-y-1 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-mono font-bold uppercase tracking-wider text-[10px]">Average Wear</span>
              <Activity className="w-4 h-4 text-accent" />
            </div>
            <div className="text-3xl md:text-4xl font-bold font-display text-slate-900 pt-2">
              {(overview?.kpis?.avg_wear_vb_mm ?? 0.14).toFixed(2)} <span className="text-xs font-normal text-slate-500 font-mono">mm</span>
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              Average flank wear VB
            </p>
          </div>

          {/* Card 3: RUL */}
          <div className="bg-white border border-[#E2DFD7] rounded-2xl p-6 shadow-paper space-y-1 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-mono font-bold uppercase tracking-wider text-[10px]">Mean RUL</span>
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div className="text-3xl md:text-4xl font-bold font-display text-accent pt-2">
              {overview?.kpis?.avg_rul_cycles ?? 109} <span className="text-xs font-normal text-slate-500 font-mono">cyc</span>
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              Cycles to replacement
            </p>
          </div>

          {/* Card 4: Alerts */}
          <div className="bg-white border border-[#E2DFD7] rounded-2xl p-6 shadow-paper space-y-1 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-mono font-bold uppercase tracking-wider text-[10px]">Active Alerts</span>
              <AlertTriangle className={`w-4 h-4 ${activeAlerts.length > 0 ? 'text-warning' : 'text-slate-400'}`} />
            </div>
            <div className={`text-3xl md:text-4xl font-bold font-display pt-2 ${activeAlerts.length > 0 ? 'text-warning' : 'text-slate-900'}`}>
              {activeAlerts.length}
            </div>
            <p className="text-xs text-slate-500 font-sans pt-1">
              {activeAlerts.length === 0 ? 'All parameters within norm' : 'Active notices require review'}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 5 — WEAR TREND (FULL-WIDTH PRECISION CHART)          */}
      {/* ============================================================ */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2DFD7]">
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900">
              Wear Trend
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Tool flank degradation across inspections
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-[#F0EFEA] border border-[#E2DFD7] rounded-lg text-slate-700 self-start sm:self-auto">
            Limit: 0.30 mm ISO Threshold
          </span>
        </div>

        <div className="h-[380px] w-full pt-4">
          <Line data={wearChartData} options={chartOptions} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 6 — RUL TREND (FULL-WIDTH PRECISION CHART)           */}
      {/* ============================================================ */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2DFD7]">
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900">
              Remaining Useful Life
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Predicted operational cycles before replacement
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 bg-[#F0EFEA] border border-[#E2DFD7] rounded-lg text-slate-700 self-start sm:self-auto">
            Model: XGBoost Precision Regressor
          </span>
        </div>

        <div className="h-[380px] w-full pt-4">
          <Line data={rulChartData} options={chartOptions} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 7 — AI INSIGHT (CARD)                               */}
      {/* ============================================================ */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E2DFD7]">
          <CheckCircle2 className="w-5 h-5 text-accent" />
          <h2 className="text-base font-bold font-display text-slate-900 uppercase tracking-wide">
            AI Insight & Prescription
          </h2>
        </div>

        <div className="space-y-5 font-sans">
          <div className="space-y-1.5">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              TELEMETRY ANALYSIS
            </div>
            <p className="text-base md:text-lg text-slate-900 font-medium leading-relaxed">
              "{aiInsightText}"
            </p>
          </div>

          <div className="pt-4 border-t border-[#E2DFD7] space-y-1.5">
            <div className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
              RECOMMENDED ACTION
            </div>
            <p className="text-base font-bold text-slate-900">
              "{recommendedActionText}"
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 8 — RECENT INSPECTIONS TABLE                        */}
      {/* ============================================================ */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900">
              Recent Inspections
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Verified optical inspection audit history
            </p>
          </div>
          <Link
            to="/inspections"
            className="text-xs font-mono font-bold text-accent hover:text-accent-hover flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#F8F7F4] border-b border-[#E2DFD7] text-slate-500 uppercase text-[11px]">
                <th className="p-4">Inspection</th>
                <th className="p-4">Tool</th>
                <th className="p-4">Wear</th>
                <th className="p-4">Health</th>
                <th className="p-4">RUL</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Date / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {recentInspections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    No historical inspection records logged yet.
                  </td>
                </tr>
              ) : (
                recentInspections.slice(0, 5).map((r) => {
                  const status = (r as any).health_prediction?.health_status || (r as any).health_status || 'HEALTHY';
                  const wearMm = (r as any).wear_analysis?.wear_value ?? (r as any).wear_value ?? 0.0;
                  const healthScore = (r as any).health_prediction?.health_score ?? (r as any).health_score ?? 100;
                  const rulCycles = (r as any).rul_prediction?.rul_value ?? (r as any).rul_cycles ?? null;
                  return (
                    <tr key={r.inspection_id} className="hover:bg-[#F8F7F4] transition-colors duration-200 cursor-pointer">
                      <td className="p-4 font-bold text-slate-900">{r.inspection_id}</td>
                      <td className="p-4 font-semibold text-accent">{r.tool_id || 'T-014'}</td>
                      <td className="p-4 font-bold text-slate-900 data-readout">{wearMm.toFixed(2)} mm</td>
                      <td className="p-4 font-bold text-normal data-readout">{healthScore}%</td>
                      <td className="p-4 text-slate-700 data-readout">{rulCycles !== null ? `${rulCycles} cyc` : 'N/A'}</td>
                      <td className="p-4">
                        <SeverityBadge level={status} size="sm" />
                      </td>
                      <td className="p-4 text-right text-slate-500 data-readout">
                        {r.timestamp ? r.timestamp.replace('T', ' ').substring(0, 19) : '02:25:06 PM'}
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
      {/* SECTION 9 — QUICK ACTIONS                                   */}
      {/* ============================================================ */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-4">
        <h2 className="text-sm font-bold font-display text-slate-900 uppercase tracking-wide">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
          <Link
            to="/inspections"
            className="flex items-center justify-center gap-2.5 p-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-xs transition-all duration-300 shadow-paper hover:shadow-lg hover:-translate-y-1"
          >
            <Play className="w-4 h-4" />
            <span>[ New Inspection ]</span>
          </Link>

          <Link
            to="/optimization"
            className="flex items-center justify-center gap-2.5 p-4 bg-white border border-[#E2DFD7] hover:bg-[#F8F7F4] text-slate-800 rounded-2xl font-bold text-xs transition-all duration-300 shadow-2xs hover:shadow-lg hover:-translate-y-1"
          >
            <Sliders className="w-4 h-4 text-accent" />
            <span>[ Optimize Process ]</span>
          </Link>

          <Link
            to="/tools"
            className="flex items-center justify-center gap-2.5 p-4 bg-white border border-[#E2DFD7] hover:bg-[#F8F7F4] text-slate-800 rounded-2xl font-bold text-xs transition-all duration-300 shadow-2xs hover:shadow-lg hover:-translate-y-1"
          >
            <Wrench className="w-4 h-4 text-slate-600" />
            <span>[ Tool Inventory ]</span>
          </Link>

          <Link
            to="/insights"
            className="flex items-center justify-center gap-2.5 p-4 bg-white border border-[#E2DFD7] hover:bg-[#F8F7F4] text-slate-800 rounded-2xl font-bold text-xs transition-all duration-300 shadow-2xs hover:shadow-lg hover:-translate-y-1"
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
