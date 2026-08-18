import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  Clock,
  ShieldCheck,
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
import { Line, Bar } from 'react-chartjs-2';
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
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [ov, tr] = await Promise.all([
        getAnalyticsOverview().catch(() => null),
        getWearTrend().catch(() => []),
      ]);
      setOverview(ov);
      setTrendData(tr || []);
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

  const labels =
    trendData.length > 0
      ? trendData.map((d, i) => (d.timestamp ? d.timestamp.substring(11, 16) : `Cyc ${i + 1}`))
      : ['Cyc 1', 'Cyc 5', 'Cyc 10', 'Cyc 15', 'Cyc 20', 'Cyc 25', 'Cyc 30'];

  // 1. Wear Chart Data
  const wearChartData = {
    labels,
    datasets: [
      {
        label: 'Flank Wear VB (mm)',
        data: trendData.length > 0 ? trendData.map((d) => d.wear_vb_mm) : [0.05, 0.09, 0.14, 0.18, 0.22, 0.25, 0.28],
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#0284C7',
        borderWidth: 2.5,
      },
      {
        label: 'ISO Warning Limit (0.22 mm)',
        data: Array(labels.length).fill(0.22),
        borderColor: '#F59E0B',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        borderWidth: 1.5,
      },
      {
        label: 'ISO Critical Limit (0.30 mm)',
        data: Array(labels.length).fill(0.30),
        borderColor: '#EF4444',
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        borderWidth: 1.5,
      },
    ],
  };

  // 2. Health Chart Data
  const healthChartData = {
    labels,
    datasets: [
      {
        label: 'Tool Health Score (%)',
        data: trendData.length > 0 ? trendData.map((d) => d.health_score) : [98, 92, 85, 78, 70, 62, 55],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#10B981',
        borderWidth: 2.5,
      },
    ],
  };

  // 3. RUL Chart Data
  const rulChartData = {
    labels,
    datasets: [
      {
        label: 'Predicted RUL (Cycles Remaining)',
        data: trendData.length > 0 ? trendData.map((d) => d.rul_cycles ?? 50) : [130, 110, 95, 80, 65, 52, 42],
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#0284C7',
        borderWidth: 2.5,
      },
      {
        label: 'Critical Threshold (15 cycles)',
        data: Array(labels.length).fill(15),
        borderColor: '#EF4444',
        borderDash: [6, 6],
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  };

  // 4. Machine Comparison Data
  const machineChartData = {
    labels: ['CNC-LATHE-01 (Monarch)', 'CNC-MILL-02 (DMG MORI)', 'CNC-LATHE-03 (Okuma)'],
    datasets: [
      {
        label: 'Average Wear (µm)',
        data: [142, 98, 185],
        backgroundColor: '#0284C7',
        borderRadius: 8,
      },
      {
        label: 'Mean RUL (Cycles)',
        data: [88, 125, 46],
        backgroundColor: '#10B981',
        borderRadius: 8,
      },
    ],
  };

  // 5. Tool Performance Comparison Data
  const toolComparisonData = {
    labels: ['TL-CNMG-120408', 'TL-WNMG-080408', 'TL-DNMG-150608', 'TL-VBMT-160408'],
    datasets: [
      {
        label: 'Current Flank Wear (µm)',
        data: [280, 120, 190, 85],
        backgroundColor: '#0284C7',
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
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            ANALYTICS
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Wear progression curves, condition classifications, and machine comparisons
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* SECTION 1: WEAR ANALYSIS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              Wear Analysis
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Flank wear (VB) progression vs ISO 0.30 mm limit
            </p>
          </div>
        </div>
        <div className="h-[360px] w-full pt-2">
          <Line data={wearChartData} options={chartOptions} />
        </div>
      </div>

      {/* SECTION 2: HEALTH ANALYSIS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              Health Analysis
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Tool edge integrity score across cutting cycles
            </p>
          </div>
        </div>
        <div className="h-[360px] w-full pt-2">
          <Line data={healthChartData} options={chartOptions} />
        </div>
      </div>

      {/* SECTION 3: RUL ANALYSIS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              RUL Analysis
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Remaining Useful Life forecast in operational cycles
            </p>
          </div>
        </div>
        <div className="h-[360px] w-full pt-2">
          <Line data={rulChartData} options={chartOptions} />
        </div>
      </div>

      {/* SECTION 4: MACHINE PERFORMANCE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              Machine Performance
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Average tool wear and useful life across CNC stations
            </p>
          </div>
        </div>
        <div className="h-[360px] w-full pt-2">
          <Bar data={machineChartData} options={chartOptions} />
        </div>
      </div>

      {/* SECTION 5: TOOL PERFORMANCE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans">
              Tool Performance
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Current micrometer wear across active inserts
            </p>
          </div>
        </div>
        <div className="h-[360px] w-full pt-2">
          <Bar data={toolComparisonData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
