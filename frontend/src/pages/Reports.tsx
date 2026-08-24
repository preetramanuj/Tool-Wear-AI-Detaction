import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Layers,
  Wrench,
  TrendingUp,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Eye,
  CheckCircle2,
  DollarSign,
  Activity,
} from 'lucide-react';
import { exportReportFile, getTools } from '../services/api';
import { Tool } from '../types/api';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [selectedToolId, setSelectedToolId] = useState<string>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('ALL');
  const [tools, setTools] = useState<Tool[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    getTools().then(setTools).catch(() => null);
  }, []);

  const handleOpenReport = (type: string) => {
    navigate(`/reports/view?type=${type}&tool=${selectedToolId}&timeframe=${selectedTimeframe}`);
  };

  const handleDownloadFile = async (type: string, format: 'pdf' | 'docx' | 'csv') => {
    setDownloading(`${type}-${format}`);
    try {
      const blob = await exportReportFile(
        type,
        format,
        selectedToolId === 'ALL' ? undefined : selectedToolId
      );
      const ext = format === 'docx' ? 'docx' : format;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ToolGuard_${type}_report_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to export ${format.toUpperCase()} report: ` + (err.message || 'Error'));
    } finally {
      setDownloading(null);
    }
  };

  const reportCards = [
    {
      id: 'daily',
      title: 'Daily Inspection Report',
      tag: 'DAILY_INSPECTIONS',
      desc: 'Itemized verification log of all optical inspection runs, wear metrics, and operator audits.',
      icon: FileText,
      badge: 'Operational Log',
      color: 'sky',
    },
    {
      id: 'lifecycle',
      title: 'Tool Fleet Performance',
      tag: 'COMPREHENSIVE_AUDIT',
      desc: 'Inventory lifecycle review tracking tool health, cutting cycle wear, and degradation status.',
      icon: Wrench,
      badge: 'Asset Health',
      color: 'emerald',
    },
    {
      id: 'trend',
      title: 'Wear Degradation Trends',
      tag: 'DEGRADATION_TRENDS',
      desc: 'Longitudinal degradation analysis comparing wear slopes against ISO 0.30 mm limits.',
      icon: TrendingUp,
      badge: 'Predictive Analytics',
      color: 'amber',
    },
    {
      id: 'executive',
      title: 'Maintenance & Servicing',
      tag: 'ECONOMIC_RELIABILITY',
      desc: 'Preventive servicing schedules, tool change recommendations, and machine station summaries.',
      icon: Layers,
      badge: 'Station Maintenance',
      color: 'indigo',
    },
    {
      id: 'economic',
      title: 'Economic Impact & ROI',
      tag: 'ECONOMIC_RELIABILITY',
      desc: 'Quantification of tooling expenditure, downtime losses, and predictive cost avoidance savings.',
      icon: DollarSign,
      badge: 'Financial Audit',
      color: 'violet',
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Industrial Compliance & Quality Export Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            COMPLIANCE & AUDIT REPORTS
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Select a template below to view the dedicated interactive audit report or export directly.
          </p>
        </div>

        {/* Global Quick Export */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => handleOpenReport('daily')}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>[ View Master Audit ]</span>
          </button>
        </div>
      </div>

      {/* SCOPE & FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <span className="text-slate-500 font-bold">Scope Filter:</span>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-hidden"
            >
              <option value="ALL">All Tools (Fleet-Wide Audit)</option>
              {tools.map((t) => (
                <option key={t.tool_id} value={t.tool_id}>
                  {t.tool_id} ({t.tool_name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-bold">Timeframe:</span>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-hidden"
            >
              <option value="ALL">All Recorded History</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="text-slate-500 text-xs font-mono">
          <span>Monitored Tools: <strong className="text-slate-900">{tools.length}</strong></span>
        </div>
      </div>

      {/* 5 REPORT TEMPLATE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((rc) => {
          const Icon = rc.icon;
          return (
            <div
              key={rc.id}
              className="bg-white border border-slate-200 hover:border-sky-300 rounded-3xl p-6 shadow-xs hover:shadow-md flex flex-col justify-between space-y-5 transition duration-150"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-sky-50 text-sky-700 rounded-2xl border border-sky-100">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {rc.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{rc.title}</h3>
                  <p className="text-xs text-slate-500 font-sans mt-1.5 leading-relaxed">{rc.desc}</p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 font-mono text-xs">
                {/* Primary Button: Open Dedicated Report View */}
                <button
                  onClick={() => handleOpenReport(rc.id)}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Full Report</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>

                {/* Direct Export Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownloadFile(rc.id, 'pdf')}
                    disabled={downloading !== null}
                    className="py-2 px-3 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    title="Export PDF Document"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownloadFile(rc.id, 'csv')}
                    disabled={downloading !== null}
                    className="py-2 px-3 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    title="Export CSV Spreadsheet"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reports;
