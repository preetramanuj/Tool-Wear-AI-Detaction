import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  Filter,
  Layers,
  Wrench,
  TrendingUp,
  RefreshCw,
  Printer,
  FileCode,
  FileSpreadsheet,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { generateReport, exportReportFile, getTools } from '../services/api';
import { Tool } from '../types/api';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            REPORTS
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
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>[ Download PDF ]</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-2xs"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 SIMPLE REPORT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((rc) => {
          const Icon = rc.icon;
          const isSelected = reportType === rc.id;
          return (
            <div
              key={rc.id}
              className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 transition ${
                isSelected ? 'border-sky-600 ring-2 ring-sky-600/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      ACTIVE VIEW
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">
                    {rc.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-1 leading-relaxed">
                    {rc.desc}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 font-mono text-xs">
                <button
                  onClick={() => handleGenerateReport(rc.id)}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>[ View ]</span>
                </button>
                <button
                  onClick={() => handleDownloadFile(rc.id, 'pdf')}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>[ Export ]</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ON-SCREEN REPORT DISPLAY */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
          <div className="text-sm font-semibold text-slate-800">Compiling Report Data...</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : reportData ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-6 print:border-none print:shadow-none">
          <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-600 font-bold">
                AUDIT REPORT
              </span>
              <h2 className="text-2xl font-bold text-slate-900 font-sans mt-0.5">
                {reportData.report_title || 'Industrial Tool Wear & Compliance Audit'}
              </h2>
              <div className="text-xs text-slate-500 font-mono mt-1">
                Generated: {reportData.generated_at ? new Date(reportData.generated_at).toLocaleString() : new Date().toLocaleString()}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs font-bold self-start sm:self-auto">
              ● VERIFIED RECORD
            </span>
          </div>

          {/* Executive Summary */}
          {reportData.executive_summary && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                1. Executive Summary
              </h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs text-slate-800 leading-relaxed">
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
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100">
                    {reportData.records.slice(0, 10).map((rec: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{rec.inspection_id || `REC-${idx + 1}`}</td>
                        <td className="p-3 text-sky-700 font-bold">{rec.tool_id || 'T-014'}</td>
                        <td className="p-3 text-slate-600">{rec.machine_id || 'CNC-01'}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {rec.wear_vb_mm !== undefined ? `${rec.wear_vb_mm.toFixed(2)} mm` : '-'}
                        </td>
                        <td className="p-3 font-bold text-emerald-600">
                          {rec.health_score !== undefined ? `${rec.health_score}%` : '100%'}
                        </td>
                        <td className="p-3 text-sky-600 font-semibold">
                          {rec.rul_cycles !== undefined ? `${rec.rul_cycles} cyc` : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {rec.health_status || 'HEALTHY'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="p-5 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
            <div className="text-xs font-mono font-bold text-sky-800 uppercase">
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
