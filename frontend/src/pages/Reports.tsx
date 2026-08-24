import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Eye,
} from 'lucide-react';
import { generateReport, exportReportFile, getTools } from '../services/api';
import { Tool } from '../types/api';
import { SeverityBadge } from '../components/common/Severity';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<string>('daily');
  const [selectedToolId, setSelectedToolId] = useState<string>('ALL');
  const [tools, setTools] = useState<Tool[]>([]);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTools().then(setTools).catch(() => null);
    handleGenerateReport('daily');
  }, []);

  const handleGenerateReport = async (typeToRun?: string) => {
    const targetType = typeToRun || reportType;
    setReportType(targetType);
    setLoading(true);
    setError(null);
    try {
      const data = await generateReport(
        targetType,
        selectedToolId === 'ALL' ? undefined : selectedToolId,
        'json'
      );
      setReportData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
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
      title: 'Inspection Report',
      desc: 'Itemized verification log of all optical inspection runs, wear metrics, and operator audits.',
      icon: FileText,
    },
    {
      id: 'lifecycle',
      title: 'Tool Performance',
      desc: 'Inventory lifecycle review tracking tool health, cutting cycle wear, and degradation status.',
      icon: Wrench,
    },
    {
      id: 'trend',
      title: 'Wear Summary',
      desc: 'Longitudinal degradation analysis comparing wear slopes against ISO 0.30 mm limits.',
      icon: TrendingUp,
    },
    {
      id: 'executive',
      title: 'Maintenance Report',
      desc: 'Preventive servicing schedules, tool change recommendations, and machine station summaries.',
      icon: Layers,
    },
    {
      id: 'economic',
      title: 'Economic Impact',
      desc: 'Quantification of tooling expenditure, downtime losses, and predictive cost avoidance savings.',
      icon: Calendar,
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-slate-900 tracking-tight">
            Compliance & Maintenance Reports
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Standardized Compliance Documentation & Maintenance Export Center
          </p>
        </div>

        {/* Global Export actions */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => handleDownloadFile(reportType, 'pdf')}
            disabled={downloading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition shadow-paper disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>[ Download PDF ]</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 bg-white border border-[#E2DFD7] hover:bg-[#F8F7F4] text-slate-700 rounded-xl transition shadow-2xs"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 REPORT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((rc) => {
          const Icon = rc.icon;
          const isSelected = reportType === rc.id;
          return (
            <div
              key={rc.id}
              className={`bg-white border rounded-3xl p-6 shadow-paper flex flex-col justify-between space-y-4 transition ${
                isSelected ? 'border-accent ring-2 ring-accent/20' : 'border-[#E2DFD7] hover:border-slate-400'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-accent-50 text-accent rounded-xl border border-accent-100">
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-normal bg-normal-light px-2.5 py-0.5 rounded-md border border-normal-border">
                      ● Active Template
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg font-display text-slate-900">{rc.title}</h3>
                  <p className="text-xs text-slate-500 font-sans mt-1 leading-relaxed">{rc.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E2DFD7] font-mono text-xs">
                <button
                  onClick={() => handleGenerateReport(rc.id)}
                  className="flex-1 py-2 px-3 bg-accent-50 hover:bg-accent-100 text-accent font-bold rounded-xl transition"
                >
                  Generate View
                </button>
                <button
                  onClick={() => handleDownloadFile(rc.id, 'pdf')}
                  className="p-2 text-slate-600 hover:text-slate-900 border border-[#E2DFD7] rounded-xl hover:bg-[#F8F7F4] transition"
                  title="PDF"
                >
                  PDF
                </button>
                <button
                  onClick={() => handleDownloadFile(rc.id, 'csv')}
                  className="p-2 text-slate-600 hover:text-slate-900 border border-[#E2DFD7] rounded-xl hover:bg-[#F8F7F4] transition"
                  title="CSV"
                >
                  CSV
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-[#E2DFD7] rounded-2xl p-4 shadow-paper flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-accent" />
          <span className="text-slate-500 font-bold">Scope Filter:</span>
          <select
            value={selectedToolId}
            onChange={(e) => setSelectedToolId(e.target.value)}
            className="px-3 py-1.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900 font-bold"
          >
            <option value="ALL">All Tools (Fleet-Wide)</option>
            {tools.map((t) => (
              <option key={t.tool_id} value={t.tool_id}>
                {t.tool_id} ({t.tool_name})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => handleGenerateReport()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition shadow-paper"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>[ Update Report Data ]</span>
        </button>
      </div>

      {/* GENERATED REPORT VIEWER */}
      {loading ? (
        <div className="bg-white border border-[#E2DFD7] rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-paper">
          <RefreshCw className="w-8 h-8 text-accent animate-spin mb-3" />
          <div className="text-sm font-semibold font-display text-slate-800">Compiling Report Data...</div>
        </div>
      ) : error ? (
        <div className="bg-critical-light border border-critical-border rounded-2xl p-6 text-critical text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : reportData ? (
        <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6 print:border-none print:shadow-none">
          <div className="pb-4 border-b border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">
                AUDIT REPORT
              </span>
              <h2 className="text-2xl font-bold font-display text-slate-900 mt-0.5">
                {reportData.report_title || 'Industrial Tool Wear & Compliance Audit'}
              </h2>
              <div className="text-xs text-slate-500 font-mono mt-1 data-readout">
                Generated: {reportData.generated_at ? new Date(reportData.generated_at).toLocaleString() : new Date().toLocaleString()}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-normal-light text-normal border border-normal-border font-mono text-xs font-bold self-start sm:self-auto">
              ● VERIFIED RECORD
            </span>
          </div>

          {/* Executive Summary */}
          {reportData.executive_summary && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                1. Executive Summary
              </h3>
              <div className="p-4 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl font-sans text-xs text-slate-800 leading-relaxed">
                {typeof reportData.executive_summary === 'string'
                  ? reportData.executive_summary
                  : JSON.stringify(reportData.executive_summary)}
              </div>
            </div>
          )}

          {/* Itemized Table */}
          {reportData.records && reportData.records.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                2. Itemized Inspection Records ({reportData.records.length})
              </h3>
              <div className="overflow-x-auto border border-[#E2DFD7] rounded-2xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#F8F7F4] text-slate-600 uppercase text-[10px] border-b border-[#E2DFD7]">
                    <tr>
                      <th className="p-3">Record ID</th>
                      <th className="p-3">Tool</th>
                      <th className="p-3">Station</th>
                      <th className="p-3">Wear</th>
                      <th className="p-3">Health</th>
                      <th className="p-3">RUL</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DFD7]">
                    {reportData.records.slice(0, 10).map((rec: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FBFBF9]">
                        <td className="p-3 font-bold text-slate-900">{rec.inspection_id || `REC-${idx + 1}`}</td>
                        <td className="p-3 text-accent font-bold">{rec.tool_id || 'T-014'}</td>
                        <td className="p-3 text-slate-600">{rec.machine_id || 'CNC-01'}</td>
                        <td className="p-3 font-bold text-slate-900 data-readout">
                          {rec.wear_vb_mm !== undefined ? `${rec.wear_vb_mm.toFixed(2)} mm` : '-'}
                        </td>
                        <td className="p-3 font-bold text-normal data-readout">
                          {rec.health_score !== undefined ? `${rec.health_score}%` : '100%'}
                        </td>
                        <td className="p-3 text-accent font-semibold data-readout">
                          {rec.rul_cycles !== undefined ? `${rec.rul_cycles} cyc` : 'N/A'}
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

          {/* Recommendations */}
          <div className="p-5 bg-accent-50 border border-accent-200 rounded-2xl space-y-1">
            <div className="text-xs font-mono font-bold text-accent uppercase">
              3. Recommended Preventive Maintenance Action
            </div>
            <p className="text-xs text-slate-800 font-sans leading-relaxed">
              {reportData.recommendations || 'All active cutting inserts operating within nominal ISO wear criteria. Continue regular optical verification audits at scheduled setup windows.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Reports;
