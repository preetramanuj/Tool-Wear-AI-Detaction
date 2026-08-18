import React, { useState, useEffect, useRef } from 'react';
import {
  ScanEye,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Layers,
  Wrench,
  Cpu,
  Clock,
  Download,
  Filter,
  Eye,
} from 'lucide-react';
import { analyzeInspectionImage, getInspectionRecords, getTools } from '../services/api';
import { InspectionResult, Tool } from '../types/api';

export const Inspections: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('TL-CNMG-120408');
  const [machineId, setMachineId] = useState<string>('CNC-LATHE-01');
  const [operatorId, setOperatorId] = useState<string>('OP-001');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<InspectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Historical Records State
  const [inspectionHistory, setInspectionHistory] = useState<InspectionResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInitialData = async () => {
    try {
      const [toolList, inspRes] = await Promise.all([
        getTools(),
        getInspectionRecords(0, 50),
      ]);
      setTools(toolList || []);
      if (toolList && toolList.length > 0) {
        setSelectedToolId(toolList[0].tool_id);
      }
      setInspectionHistory(inspRes.inspections || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select an image of the cutting tool before starting inspection.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await analyzeInspectionImage(
        selectedFile,
        selectedToolId,
        machineId,
        operatorId
      );
      setCurrentResult(res);
      const updatedHistory = await getInspectionRecords(0, 50);
      setInspectionHistory(updatedHistory.inspections || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Inspection failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedToolObj = tools.find((t) => t.tool_id === selectedToolId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <ScanEye className="w-5 h-5 text-sky-600" />
            Cutting Tool Inspection Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated Vision-Based Multi-Stage Tool Wear Degradation Audit
          </p>
        </div>
      </div>

      {/* Main Inspection Workflow Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm">
        <h2 className="text-xs font-bold font-mono uppercase text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200">
          <Wrench className="w-4 h-4 text-sky-600" />
          1. Setup & Capture Parameters
        </h2>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Target Cutting Tool</label>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-500 font-semibold"
            >
              {tools.map((t) => (
                <option key={t.tool_id} value={t.tool_id}>
                  {t.tool_id} — {t.tool_name}
                </option>
              ))}
            </select>
            {selectedToolObj && (
              <div className="text-[10px] text-slate-500 mt-1">
                Type: {selectedToolObj.tool_type} | Material: {selectedToolObj.material}
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Machine Workstation</label>
            <input
              type="text"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Operator ID</label>
            <input
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Upload & Trigger Area */}
        <div className="pt-2">
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-4 py-2.5 rounded-lg text-xs font-mono font-semibold transition"
            >
              <Upload className="w-4 h-4 text-sky-600" />
              {selectedFile ? selectedFile.name : 'UPLOAD TOOL IMAGE'}
            </button>

            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wide transition shadow-xs"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  ANALYZING PIPELINE...
                </>
              ) : (
                <>
                  <ScanEye className="w-4 h-4" />
                  START AI INSPECTION
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-mono text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Inspection Results Viewer */}
        {currentResult && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase text-sky-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Audit Report: {currentResult.inspection_id}
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Completed in {currentResult.performance.latency_ms} ms on {currentResult.performance.device}
              </span>
            </div>

            {/* Side-by-Side Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-500 font-semibold mb-2">ORIGINAL INPUT IMAGE</div>
                <div className="aspect-[4/3] bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                  <img
                    src={currentResult.images.original}
                    alt="Original Tool"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] font-mono text-slate-500 font-semibold mb-2 flex items-center justify-between">
                  <span>AI ANNOTATED HUD VIEW (YOLO + WEAR)</span>
                  <span className="text-emerald-700 font-bold text-[10px]">
                    {(currentResult.tool_detection.confidence * 100).toFixed(1)}% CONF
                  </span>
                </div>
                <div className="aspect-[4/3] bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                  <img
                    src={currentResult.images.annotated}
                    alt="Annotated Result"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Metric Assessment Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-mono text-slate-500 font-semibold">FLANK WEAR (VB)</div>
                <div className="text-xl font-bold font-mono text-sky-600 mt-1">
                  {currentResult.wear_analysis.wear_value !== undefined ? `${currentResult.wear_analysis.wear_value.toFixed(3)} mm` : '-'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-mono text-slate-500 font-semibold">MEASURED WEAR (µm)</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                  {currentResult.health_prediction.wear_um !== undefined ? `${currentResult.health_prediction.wear_um.toFixed(1)} µm` : '-'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-mono text-slate-500 font-semibold">RUL (CYCLES)</div>
                <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  {currentResult.rul_prediction?.rul_value !== undefined && currentResult.rul_prediction?.rul_value !== null
                    ? `${currentResult.rul_prediction.rul_value} cycles`
                    : (currentResult.rul_prediction?.rul_status || 'Pending')}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-mono text-slate-500 font-semibold">HEALTH SCORE</div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                  {((currentResult.health_prediction.health_score || 0) * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-mono text-slate-500 font-semibold">TOOL CONDITION</div>
                <div className="mt-1">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded ${
                      currentResult.health_prediction.health_status === 'HEALTHY'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : currentResult.health_prediction.health_status === 'WARNING'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {currentResult.health_prediction.health_status || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-500 font-semibold">Recommended Action: </span>
                <span className="text-sky-700 font-bold">{currentResult.health_prediction.recommended_action || 'None'}</span>
              </div>
              <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>RUL Rate: {currentResult.rul_prediction?.wear_rate_um_per_cycle ? `${currentResult.rul_prediction.wear_rate_um_per_cycle} µm/cycle` : 'Calibrated'} | Saved to SQLite</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historical Records Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <h2 className="text-sm font-bold font-mono uppercase text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            Historical Inspection Records Archive
          </h2>
          <span className="text-xs font-mono text-slate-500">{inspectionHistory.length} Total Audits</span>
        </div>

        {inspectionHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Inspection ID</th>
                  <th className="px-3 py-2.5 font-semibold">Tool ID</th>
                  <th className="px-3 py-2.5 font-semibold">Timestamp</th>
                  <th className="px-3 py-2.5 font-semibold">Wear (VB)</th>
                  <th className="px-3 py-2.5 font-semibold">Wear (µm)</th>
                  <th className="px-3 py-2.5 font-semibold">RUL (Cycles)</th>
                  <th className="px-3 py-2.5 font-semibold">Health Status</th>
                  <th className="px-3 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspectionHistory.map((item) => (
                  <tr key={item.inspection_id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2.5 font-bold text-slate-900">{item.inspection_id}</td>
                    <td className="px-3 py-2.5 text-sky-700 font-semibold">{item.tool_id || 'AUTO'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">
                      {item.wear_analysis?.wear_value ? `${item.wear_analysis.wear_value.toFixed(3)} mm` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {item.health_prediction?.wear_um ? `${item.health_prediction.wear_um.toFixed(1)} µm` : '-'}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">
                      {item.rul_prediction?.rul_value !== undefined && item.rul_prediction?.rul_value !== null
                        ? `${item.rul_prediction.rul_value} cycles`
                        : (item.rul_prediction?.rul_status || '-')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                          item.health_prediction?.health_status === 'HEALTHY'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : item.health_prediction?.health_status === 'WARNING'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.health_prediction?.health_status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 truncate max-w-xs">
                      {item.health_prediction?.recommended_action || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 font-mono text-xs">
            No historical inspection records. Run an inspection above to begin logging.
          </div>
        )}
      </div>
    </div>
  );
};
