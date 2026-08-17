import React from 'react';
import {
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  Filter,
  Layers,
  Wrench,
  TrendingUp,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const exportPDF = () => {
    alert('Generating Industrial Audit PDF Report from active SQLite Inspection database...');
  };

  const exportCSV = () => {
    alert('Exporting CSV Inspection log...');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            Compliance & Tool Wear Audit Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized Maintenance Documentation, ISO Degradation Records & Export Center
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            EXPORT CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wide transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            DOWNLOAD AUDIT PDF
          </button>
        </div>
      </div>

      {/* Report Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" /> Daily Tool Audit
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">DAILY</span>
          </div>
          <p className="text-slate-600 text-[11px]">
            Comprehensive summary of all visual inspection runs, flank wear measurements, and operator identities in the past 24 hours.
          </p>
          <button
            onClick={exportPDF}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-sky-700 rounded-lg font-bold transition"
          >
            Generate Report
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Degradation Trend Summary
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">WEEKLY</span>
          </div>
          <p className="text-slate-600 text-[11px]">
            Longitudinal degradation analysis calculating wear rate per machining hour for predictive insert replacement scheduling.
          </p>
          <button
            onClick={exportPDF}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-sky-700 rounded-lg font-bold transition"
          >
            Generate Report
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" /> Tool Lifecycle Audit
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">MONTHLY</span>
          </div>
          <p className="text-slate-600 text-[11px]">
            Complete inventory lifecycle review tracking tool utilization, insert scrap rate, and machine station efficiency metrics.
          </p>
          <button
            onClick={exportPDF}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-sky-700 rounded-lg font-bold transition"
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};
