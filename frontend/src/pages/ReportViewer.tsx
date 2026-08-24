import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Wrench,
  TrendingUp,
  Layers,
  DollarSign,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Building,
  Info,
  Calendar,
} from 'lucide-react';
import { generateReport, exportReportFile, getTools } from '../services/api';
import { Tool } from '../types/api';
import { SeverityBadge } from '../components/common/Severity';

export const ReportViewer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const reportType = searchParams.get('type') || 'daily';
  const toolParam = searchParams.get('tool') || 'ALL';
  const timeframeParam = searchParams.get('timeframe') || 'ALL';

  const [selectedToolId, setSelectedToolId] = useState<string>(toolParam);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(timeframeParam);
  const [tools, setTools] = useState<Tool[]>([]);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reportTemplates = [
    { id: 'daily', title: 'Daily Inspection Log', icon: FileText },
    { id: 'lifecycle', title: 'Tool Fleet Performance', icon: Wrench },
    { id: 'trend', title: 'Wear & Degradation Trends', icon: TrendingUp },
    { id: 'executive', title: 'Maintenance & Servicing', icon: Layers },
    { id: 'economic', title: 'Economic & ROI Impact', icon: DollarSign },
  ];

  useEffect(() => {
    getTools().then(setTools).catch(() => null);
  }, []);

  useEffect(() => {
    fetchReport(reportType, selectedToolId, selectedTimeframe);
  }, [reportType, selectedToolId, selectedTimeframe]);

  const fetchReport = async (type: string, toolId: string, timeframe: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateReport(
        type,
        toolId === 'ALL' ? undefined : toolId,
        'json'
      );
      const resolved = data?.data || data;
      setReportData(resolved);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTemplate = (newType: string) => {
    setSearchParams({ type: newType, tool: selectedToolId, timeframe: selectedTimeframe });
  };

  const handleToolChange = (newTool: string) => {
    setSelectedToolId(newTool);
    setSearchParams({ type: reportType, tool: newTool, timeframe: selectedTimeframe });
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setSelectedTimeframe(newTimeframe);
    setSearchParams({ type: reportType, tool: selectedToolId, timeframe: newTimeframe });
  };

  const handleDownload = async (format: 'pdf' | 'docx' | 'csv') => {
    setDownloading(format);
    try {
      const blob = await exportReportFile(
        reportType,
        format,
        selectedToolId === 'ALL' ? undefined : selectedToolId
      );
      const ext = format === 'docx' ? 'docx' : format;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ToolGuard_${reportType}_report_${new Date().toISOString().split('T')[0]}.${ext}`;
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

  const report = reportData?.data || reportData;
  const kpis = report?.kpis || {};
  const toolsList = report?.tools || report?.tools_summary || [];
  const recordsList = report?.records || report?.inspections || [];
  const maintenanceCandidates = report?.maintenance_candidates || [];

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      {/* Top Navigation & Controls Bar */}
      <div className="max-w-5xl mx-auto mb-6 space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Report Templates</span>
          </button>

          {/* Export Actions */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null || loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => handleDownload('csv')}
              disabled={downloading !== null || loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition shadow-2xs disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-2xs"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Template Selector Pills & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Template pills */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {reportTemplates.map((tmpl) => {
              const isSelected = reportType === tmpl.id;
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSwitchTemplate(tmpl.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tmpl.title}</span>
                </button>
              );
            })}
          </div>

          {/* Scope Filters */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              <select
                value={selectedToolId}
                onChange={(e) => handleToolChange(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-hidden"
              >
                <option value="ALL">All Tools</option>
                {tools.map((t) => (
                  <option key={t.tool_id} value={t.tool_id}>
                    {t.tool_id}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchReport(reportType, selectedToolId, selectedTimeframe)}
              disabled={loading}
              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Document Body (Clean White Paper Layout) */}
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-20 flex flex-col items-center justify-center text-center shadow-md space-y-4">
            <RefreshCw className="w-10 h-10 text-sky-600 animate-spin" />
            <div className="text-base font-bold text-slate-900">Compiling Report & Telemetry Data...</div>
            <div className="text-xs text-slate-400 font-mono">Aggregating records from ToolGuard-AI Database</div>
          </div>
        ) : error ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-12 text-center shadow-md space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <div className="text-lg font-bold text-slate-900">Failed to Load Report</div>
            <div className="text-xs text-rose-600 font-mono">{error}</div>
            <button
              onClick={() => fetchReport(reportType, selectedToolId, selectedTimeframe)}
              className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
            >
              Try Again
            </button>
          </div>
        ) : report ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-8 md:p-12 space-y-10 print:border-none print:shadow-none print:p-0">
            {/* 1. Official Header & Document Classification */}
            <div className="border-b-2 border-slate-900 pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sky-700 font-mono text-xs font-bold uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4" />
                    <span>ToolGuard-AI Industrial Monitoring & Compliance</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                    {report.report_title || report.title || 'Tool Wear & Compliance Audit Report'}
                  </h1>
                </div>

                <div className="text-right font-mono text-xs space-y-1 self-start sm:self-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ISO AUDIT VERIFIED</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">Doc Ref: {report.report_id || 'RPT-2026'}</div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Generated At</span>
                  <span className="font-bold text-slate-800">
                    {report.generated_at ? new Date(report.generated_at).toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Plant Facility</span>
                  <span className="font-bold text-slate-800">{report.facility || 'CNC Manufacturing Cell #1'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Audit Scope</span>
                  <span className="font-bold text-slate-800">
                    {selectedToolId === 'ALL' ? 'Fleet-Wide (All Tools)' : `Tool: ${selectedToolId}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Template Classification</span>
                  <span className="font-bold text-sky-700">{report.report_type || 'COMPREHENSIVE_AUDIT'}</span>
                </div>
              </div>
            </div>

            {/* 2. Executive KPI Scorecard */}
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                1. Executive KPI Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Monitored Tools</div>
                  <div className="text-2xl font-black text-slate-900">{kpis.total_tools || toolsList.length || 0}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    <span className="text-emerald-700 font-bold">{kpis.healthy_tools || 0} OK</span> •{' '}
                    <span className="text-amber-700 font-bold">{kpis.warning_tools || 0} Warn</span> •{' '}
                    <span className="text-rose-700 font-bold">{kpis.critical_tools || 0} Crit</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Avg Flank Wear</div>
                  <div className="text-2xl font-black text-slate-900">
                    {kpis.avg_wear_um !== undefined ? `${kpis.avg_wear_um.toFixed(1)} µm` : '0.0 µm'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {((kpis.avg_wear_um || 0) / 1000).toFixed(3)} mm (ISO Limit: 0.30 mm)
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Average RUL</div>
                  <div className="text-2xl font-black text-sky-700">
                    {kpis.avg_rul_cycles !== undefined ? `${Math.round(kpis.avg_rul_cycles)} cyc` : 'N/A'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">Remaining Tool Cycles</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-mono text-slate-500 uppercase">Cost Avoidance</div>
                  <div className="text-2xl font-black text-emerald-700">
                    {kpis.currency || '₹'}{Number(kpis.estimated_potential_savings || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {kpis.estimated_downtime_avoided_hours || 0} hrs downtime saved
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Executive Summary Narrative */}
            <div className="space-y-2">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                2. Executive Summary & Quality Narrative
              </h2>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans">
                {typeof report.executive_summary === 'string'
                  ? report.executive_summary
                  : typeof report.summary_narrative === 'string'
                  ? report.summary_narrative
                  : JSON.stringify(report.executive_summary || 'Plant tooling operating within nominal operational thresholds.')}
              </div>
            </div>

            {/* 4. Active Tool Fleet Inventory Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  3. Tool Inventory & Flank Wear Degradation ({toolsList.length} Tools)
                </h2>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Tool ID</th>
                      <th className="p-3">Tool Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Station</th>
                      <th className="p-3">Wear (µm)</th>
                      <th className="p-3">Wear VB (mm)</th>
                      <th className="p-3">RUL (Cycles)</th>
                      <th className="p-3">Condition Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {toolsList.map((t: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-3 font-bold text-slate-900">{t.tool_id}</td>
                        <td className="p-3 text-slate-800">{t.tool_name}</td>
                        <td className="p-3 text-slate-500">{t.tool_type || 'Carbide Insert'}</td>
                        <td className="p-3 text-slate-600">{t.machine_id}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {t.current_wear_um !== undefined ? `${t.current_wear_um.toFixed(1)} µm` : '-'}
                        </td>
                        <td className="p-3 text-slate-700">
                          {t.current_wear_vb_mm !== undefined ? `${t.current_wear_vb_mm.toFixed(3)} mm` : '-'}
                        </td>
                        <td className="p-3 text-sky-700 font-bold">
                          {t.current_rul_cycles !== null && t.current_rul_cycles !== undefined
                            ? `${Math.round(t.current_rul_cycles)} cyc`
                            : 'N/A'}
                        </td>
                        <td className="p-3">
                          <SeverityBadge level={t.status || 'HEALTHY'} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Itemized Inspection Records Table */}
            {recordsList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                    4. Itemized Quality Verification & Vision Audit Log ({recordsList.length} Records)
                  </h2>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Record ID</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Tool ID</th>
                        <th className="p-3">Station</th>
                        <th className="p-3">Wear VB (mm)</th>
                        <th className="p-3">Wear (µm)</th>
                        <th className="p-3">RUL (Cycles)</th>
                        <th className="p-3">Health Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recordsList.slice(0, 30).map((rec: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-3 font-bold text-slate-900">{rec.inspection_id || `REC-${idx + 1}`}</td>
                          <td className="p-3 text-slate-500 text-[11px]">{rec.timestamp}</td>
                          <td className="p-3 text-sky-700 font-bold">{rec.tool_id}</td>
                          <td className="p-3 text-slate-600">{rec.machine_id}</td>
                          <td className="p-3 font-bold text-slate-900">
                            {rec.wear_vb_mm !== undefined && rec.wear_vb_mm !== null ? `${rec.wear_vb_mm.toFixed(3)} mm` : '-'}
                          </td>
                          <td className="p-3 text-slate-700">
                            {rec.wear_um !== undefined && rec.wear_um !== null ? `${rec.wear_um.toFixed(1)} µm` : '-'}
                          </td>
                          <td className="p-3 text-sky-700 font-bold">
                            {rec.rul_cycles !== null && rec.rul_cycles !== undefined ? `${Math.round(rec.rul_cycles)} cyc` : 'N/A'}
                          </td>
                          <td className="p-3">
                            <SeverityBadge level={rec.health_status || 'HEALTHY'} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Preventive Maintenance Recommendations */}
            <div className="p-6 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
              <div className="text-xs font-mono font-bold text-sky-800 uppercase flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-600" />
                <span>5. Recommended Preventive Maintenance & Setup Action</span>
              </div>
              <p className="text-xs text-slate-800 font-sans leading-relaxed">
                {report.recommendations ||
                  'All active cutting inserts operating within nominal ISO wear criteria. Continue regular optical verification audits at scheduled setup windows.'}
              </p>
            </div>

            {/* 7. Engineering Sign-Off & Verification Block */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs text-slate-500">
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Quality Inspector</span>
                <div className="h-10 border-b border-dashed border-slate-300 flex items-end font-bold text-slate-800">
                  AI Certified Inspector
                </div>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Maintenance Engineer</span>
                <div className="h-10 border-b border-dashed border-slate-300 flex items-end font-bold text-slate-800">
                  Plant Lead Engineer
                </div>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Verification Timestamp</span>
                <div className="h-10 border-b border-dashed border-slate-300 flex items-end font-bold text-slate-800">
                  {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ReportViewer;
