import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { getAnalyticsOverview, getWearTrend, getHealthDistribution } from '../services/api';
import { AnalyticsOverview, WearTrendPoint } from '../types/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Analytics: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trendData, setTrendData] = useState<WearTrendPoint[]>([]);
  const [distribution, setDistribution] = useState<{ name: string; count: number; color: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    try {
      const [ov, tr, dist] = await Promise.all([
        getAnalyticsOverview(),
        getWearTrend(),
        getHealthDistribution(),
      ]);
      setOverview(ov);
      setTrendData(tr || []);
      setDistribution(dist.distribution || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpis = overview?.kpis;

  // 1. Wear Trend Line Chart
  const lineChartData = {
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
      },
    ],
  };

  // 2. Health Distribution Doughnut Chart
  const doughnutData = {
    labels: distribution.map((d) => d.name),
    datasets: [
      {
        data: distribution.map((d) => d.count),
        backgroundColor: distribution.map((d) => d.color),
        borderColor: '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  // 3. Tool Wear by ID Bar Chart
  const barData = {
    labels: trendData.length > 0 ? trendData.map((d) => d.tool_id) : ['No Data'],
    datasets: [
      {
        label: 'Measured Wear (µm)',
        data: trendData.length > 0 ? trendData.map((d) => d.wear_um) : [0],
        backgroundColor: '#0284C7',
        borderColor: '#0284C7',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 10 } },
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
        grid: { color: 'rgba(226, 232, 240, 0.8)' },
        ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            Cutting Tool Analytics & Wear Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Statistical Wear Degradation Metrics & Fleet Health Distribution
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
          REFRESH METRICS
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">AVERAGE FLANK WEAR (VB)</div>
          <div className="text-2xl font-bold font-mono text-sky-600 mt-2">
            {kpis?.avg_wear_vb_mm ? `${kpis.avg_wear_vb_mm.toFixed(3)} mm` : '0.000 mm'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all inspection audits</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">AVERAGE WEAR (µm)</div>
          <div className="text-2xl font-bold font-mono text-slate-800 mt-2">
            {kpis?.avg_wear_um ? `${kpis.avg_wear_um.toFixed(1)} µm` : '0.0 µm'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Direct regression measurement</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">TOTAL INSPECTION RUNS</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            {kpis?.total_inspections || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Persisted audit records</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
          <div className="text-[10px] font-mono uppercase text-slate-500 font-semibold">FLEET HEALTH COMPLIANCE</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            {kpis && kpis.total_tools > 0
              ? `${((kpis.healthy_tools / kpis.total_tools) * 100).toFixed(0)}%`
              : '100%'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Healthy vs Total active tools</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Wear Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
          <h2 className="text-xs font-bold font-mono uppercase text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            Flank Wear Degradation Trajectory (VB)
          </h2>
          <div className="h-64 relative">
            {trendData.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                No inspection trend data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Health Distribution Donut */}
        <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex flex-col">
          <h2 className="text-xs font-bold font-mono uppercase text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <PieIcon className="w-4 h-4 text-amber-500" />
            Tool Health State Breakdown
          </h2>
          <div className="h-64 relative flex items-center justify-center">
            {distribution.some((d) => d.count > 0) ? (
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#475569', font: { family: 'JetBrains Mono', size: 10 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="text-slate-400 font-mono text-xs text-center">
                No health distribution data recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Wear by Tool ID Bar Chart */}
      <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm">
        <h2 className="text-xs font-bold font-mono uppercase text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
          <BarChart3 className="w-4 h-4 text-sky-600" />
          Tool Degradation Comparison (Measured Wear µm)
        </h2>
        <div className="h-64 relative">
          {trendData.length > 0 ? (
            <Bar data={barData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
              No tool comparison data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
