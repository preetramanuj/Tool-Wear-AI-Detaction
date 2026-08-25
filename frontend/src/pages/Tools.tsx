import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  Calendar,
  Upload,
  Image as ImageIcon,
  Camera,
  Info,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  getTools,
  createTool,
  deleteTool,
  registerToolWithReferences,
  getToolReferences,
  deleteToolReference,
  getImageUrl,
} from '../services/api';
import { Tool, ToolReferenceImage } from '../types/api';
import { SeverityBadge } from '../components/common/Severity';

interface SelectedRefPhoto {
  file: File;
  previewUrl: string;
  angleTag: string;
}

export const Tools: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolReferences, setToolReferences] = useState<ToolReferenceImage[]>([]);
  const [loadingReferences, setLoadingReferences] = useState<boolean>(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-Step Registration Wizard State
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [registrationResult, setRegistrationResult] = useState<any>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Form Metadata State
  const [formData, setFormData] = useState({
    tool_id: '',
    tool_name: 'Carbide Turning Insert (CNMG-120408)',
    tool_type: 'Carbide Turning Insert',
    insert_shape: 'Rhombic 80°',
    material: 'Tungsten Carbide (WC-Co)',
    coating: 'TiCN + Al2O3 + TiN (CVD)',
    manufacturer: 'Sandvik Coromant',
    part_number: 'CNMG 12 04 08-PM 4325',
    workpiece_material: 'CK45 / AISI 1045 Alloy Steel',
    initial_condition: 'NEW',
    machine_id: 'CNC-LATHE-01',
    assigned_operator: 'Operator 01',
    status: 'HEALTHY' as 'HEALTHY' | 'WARNING' | 'CRITICAL',
  });

  // Reference Photos State for Registration
  const [refPhotos, setRefPhotos] = useState<SelectedRefPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchToolsList = async () => {
    setLoading(true);
    try {
      const data = await getTools();
      setTools(data || []);
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolsList();
  }, []);

  // Fetch references when a tool is selected in drawer
  useEffect(() => {
    if (selectedTool) {
      fetchReferences(selectedTool.tool_id);
    } else {
      setToolReferences([]);
    }
  }, [selectedTool]);

  const fetchReferences = async (toolId: string) => {
    setLoadingReferences(true);
    try {
      const res = await getToolReferences(toolId);
      if (res && res.references) {
        setToolReferences(res.references);
      }
    } catch (err) {
      console.error('Failed to fetch tool references:', err);
      setToolReferences([]);
    } finally {
      setLoadingReferences(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const defaultAngles = ['Front Flank', 'Rake Face (Top)', 'Side Profile', 'Cutting Edge Macro', 'Isometric Angle', 'Rotated 90°'];

    const newPhotos: SelectedRefPhoto[] = files.map((file, idx) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      angleTag: defaultAngles[(refPhotos.length + idx) % defaultAngles.length],
    }));

    setRefPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setRefPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleAngleChange = (index: number, angle: string) => {
    setRefPhotos((prev) => {
      const updated = [...prev];
      updated[index].angleTag = angle;
      return updated;
    });
  };

  const resetWizard = () => {
    refPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setRefPhotos([]);
    setWizardStep(1);
    setRegistrationResult(null);
    setWizardError(null);
    setIsSubmitting(false);
    setShowRegisterModal(false);
  };

  const handleRegisterSubmit = async () => {
    if (refPhotos.length === 0) {
      setWizardError('Please upload at least 1 reference photo (recommended 3–10 photos).');
      return;
    }

    setIsSubmitting(true);
    setWizardError(null);

    const data = new FormData();
    data.append('tool_id', formData.tool_id.trim());
    data.append('tool_name', formData.tool_name);
    data.append('tool_type', formData.tool_type);
    data.append('insert_shape', formData.insert_shape);
    data.append('material', formData.material);
    data.append('coating', formData.coating);
    data.append('manufacturer', formData.manufacturer);
    data.append('part_number', formData.part_number);
    data.append('workpiece_material', formData.workpiece_material);
    data.append('machine_id', formData.machine_id);
    data.append('assigned_operator', formData.assigned_operator);
    data.append('status', formData.status);

    const angleTagsList = refPhotos.map((p) => p.angleTag);
    data.append('angle_tags', JSON.stringify(angleTagsList));

    refPhotos.forEach((p) => {
      data.append('reference_photos', p.file);
    });

    try {
      const res = await registerToolWithReferences(data);
      setRegistrationResult(res);
      setWizardStep(3); // Completion step
      fetchToolsList();
    } catch (err: any) {
      setWizardError(err.response?.data?.detail || 'Failed to register tool. Please verify photo formats.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteToolRef = async (toolId: string, imageId: number) => {
    if (confirm('Delete this reference photo? Visual matching embeddings will update automatically.')) {
      try {
        await deleteToolReference(toolId, imageId);
        fetchReferences(toolId);
      } catch (err) {
        alert('Failed to delete reference image');
      }
    }
  };

  const handleDelete = async (toolId: string) => {
    if (confirm(`Are you sure you want to retire and remove Tool ${toolId}?`)) {
      try {
        await deleteTool(toolId);
        if (selectedTool?.tool_id === toolId) setSelectedTool(null);
        fetchToolsList();
      } catch (err) {
        alert('Failed to delete tool');
      }
    }
  };

  const filteredTools = tools.filter((t) => {
    const matchSearch =
      t.tool_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tool_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.machine_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-6xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-slate-900 tracking-tight">
            Tool Inventory & Reference Registry
          </h1>
          <p className="text-sm text-slate-500 font-mono">
            Register physical CNC inserts with multi-angle reference photos for automated visual identification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setWizardStep(1);
              setShowRegisterModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold font-mono text-xs transition shadow-paper"
          >
            <Plus className="w-4 h-4" />
            <span>[ + Register New Tool ]</span>
          </button>

          <button
            onClick={fetchToolsList}
            disabled={loading}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-[#F0EFEA] rounded-xl transition border border-[#E2DFD7] bg-white shadow-paper"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-5 bg-accent/5 border border-accent/20 rounded-3xl flex items-center justify-between gap-4 shadow-paper">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-accent text-white rounded-2xl shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
              Zero-Retraining Visual Reference Engine
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Upload 3–10 reference photos per tool. ToolGuard-AI creates 576-dim L2-normalized feature embeddings
              to identify your tools across inspections without altering base YOLO model weights.
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#E2DFD7] rounded-2xl p-4 shadow-paper">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="[ Search tool ID, name, manufacturer or station... ]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Main Tools Table */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl shadow-paper overflow-hidden">
        <div className="p-6 md:p-8 border-b border-[#E2DFD7] flex items-center justify-between">
          <h2 className="text-xl font-bold font-display text-slate-900">
            Registered Physical Tools ({filteredTools.length})
          </h2>
          <span className="text-xs font-mono text-slate-400">Click any row to open tool details & reference gallery</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#F8F7F4] border-b border-[#E2DFD7] text-slate-500 uppercase text-[11px]">
                <th className="p-4">Tool ID</th>
                <th className="p-4">Tool Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Manufacturer</th>
                <th className="p-4">Machine</th>
                <th className="p-4">Health</th>
                <th className="p-4">Wear (VB)</th>
                <th className="p-4">RUL</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {filteredTools.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-mono">
                    No tools found matching your search. Click [ + Register New Tool ] to register a physical insert.
                  </td>
                </tr>
              ) : (
                filteredTools.map((t) => {
                  const healthScore = Math.max(10, Math.round(100 - (t.current_wear_um / 300) * 100));
                  return (
                    <tr
                      key={t.tool_id}
                      onClick={() => setSelectedTool(t)}
                      className="hover:bg-[#FBFBF9] transition cursor-pointer"
                    >
                      <td className="p-4 font-bold text-accent">{t.tool_id}</td>
                      <td className="p-4 font-bold text-slate-900">{t.tool_name}</td>
                      <td className="p-4 text-slate-600">{t.tool_type}</td>
                      <td className="p-4 text-slate-600">{t.manufacturer || 'Sandvik'}</td>
                      <td className="p-4 text-slate-600">{t.machine_id}</td>
                      <td className="p-4 font-bold text-normal data-readout">{healthScore}%</td>
                      <td className="p-4 font-bold text-slate-900 data-readout">
                        {t.current_wear_vb_mm?.toFixed(2)} mm
                      </td>
                      <td className="p-4 text-accent font-bold data-readout">
                        {t.current_rul_cycles !== null ? `${t.current_rul_cycles} cyc` : '42 cyc'}
                      </td>
                      <td className="p-4">
                        <SeverityBadge level={t.status} size="sm" />
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
      {/* TOOL DETAIL & REFERENCE GALLERY DRAWER */}
      {/* ============================================================ */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-3xl h-full overflow-y-auto p-8 md:p-10 space-y-8 shadow-2xl animate-in slide-in-from-right duration-200 font-sans border-l border-[#E2DFD7]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-6 border-b border-[#E2DFD7]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  TOOL DOSSIER & REFERENCE GALLERY
                </span>
                <h2 className="text-3xl font-bold font-display text-slate-900 mt-0.5">
                  {selectedTool.tool_id} — {selectedTool.tool_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTool(null)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#F8F7F4] transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* SECTION 1: Reference Photos Gallery */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-display text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-accent" />
                  Visual Reference Gallery ({toolReferences.length} Photos)
                </h3>
                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
                  ● 576-dim Embeddings Active
                </span>
              </div>

              {loadingReferences ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  Loading registered reference photos...
                </div>
              ) : toolReferences.length === 0 ? (
                <div className="p-8 bg-[#F8F7F4] border border-[#E2DFD7] rounded-3xl text-center space-y-2">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-xs font-mono text-slate-500">
                    No visual reference photos stored for this tool yet.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {toolReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-slate-900 border border-[#E2DFD7] rounded-2xl overflow-hidden relative group aspect-square flex items-center justify-center"
                    >
                      <img
                        src={getImageUrl(ref.image_path)}
                        alt={ref.angle_tag || ref.file_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-between text-white text-xs">
                        <span className="font-mono font-bold text-[11px] bg-accent px-2 py-0.5 rounded-md self-start">
                          {ref.angle_tag || 'Angle Reference'}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-300 truncate max-w-[100px]">
                            {ref.file_name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteToolRef(selectedTool.tool_id, ref.id);
                            }}
                            className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white transition"
                            title="Delete Reference"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: Tool Identity & Specs */}
            <div className="bg-[#F8F7F4] border border-[#E2DFD7] rounded-3xl p-6 md:p-8 space-y-4 font-mono text-xs">
              <h3 className="text-base font-bold text-slate-900 uppercase font-display">
                Physical Tool Specification
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-slate-400">Tool Type:</span> <span className="font-bold text-slate-800">{selectedTool.tool_type}</span></div>
                <div><span className="text-slate-400">Manufacturer:</span> <span className="font-bold text-slate-800">{selectedTool.manufacturer || 'Sandvik Coromant'}</span></div>
                <div><span className="text-slate-400">Part Number:</span> <span className="font-bold text-slate-800">{selectedTool.part_number || 'CNMG 12 04 08'}</span></div>
                <div><span className="text-slate-400">Insert Shape:</span> <span className="font-bold text-slate-800">{selectedTool.insert_shape}</span></div>
                <div><span className="text-slate-400">Material:</span> <span className="font-bold text-slate-800">{selectedTool.material}</span></div>
                <div><span className="text-slate-400">Coating:</span> <span className="font-bold text-slate-800">{selectedTool.coating}</span></div>
                <div><span className="text-slate-400">Machine Station:</span> <span className="font-bold text-slate-800">{selectedTool.machine_id}</span></div>
                <div><span className="text-slate-400">Assigned Operator:</span> <span className="font-bold text-slate-800">{selectedTool.assigned_operator}</span></div>
              </div>
            </div>

            {/* SECTION 3: Current Condition */}
            <div className="space-y-4">
              <h3 className="text-base font-bold font-display text-slate-900 uppercase tracking-wide">
                Current Condition & Telemetry
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Current Wear</div>
                  <div className="text-2xl font-bold font-display text-slate-900 mt-1">
                    {selectedTool.current_wear_vb_mm?.toFixed(2)} <span className="text-xs font-normal text-slate-500 font-mono">mm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedTool.current_wear_um?.toFixed(0)} µm</div>
                </div>

                <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Health Score</div>
                  <div className="text-2xl font-bold font-display text-normal mt-1">
                    {Math.max(10, Math.round(100 - (selectedTool.current_wear_um / 300) * 100))}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5"><SeverityBadge level={selectedTool.status} size="sm" /></div>
                </div>

                <div className="p-5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Remaining Life</div>
                  <div className="text-2xl font-bold font-display text-accent mt-1">
                    {selectedTool.current_rul_cycles !== null ? `${selectedTool.current_rul_cycles}` : '42'} <span className="text-xs font-normal text-slate-500 font-mono">cyc</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">To 0.30mm Limit</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-[#E2DFD7]">
              <button
                onClick={() => handleDelete(selectedTool.tool_id)}
                className="flex items-center gap-2 px-5 py-3 bg-critical-light hover:bg-critical-light/80 text-critical border border-critical-border rounded-xl font-bold font-mono text-xs transition shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Retire Tool</span>
              </button>

              <button
                onClick={() => setSelectedTool(null)}
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold font-mono text-xs transition shadow-paper"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MULTI-STEP REGISTER TOOL WIZARD MODAL */}
      {/* ============================================================ */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DFD7] rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 font-sans animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2DFD7]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
                    Step {wizardStep} of 3
                  </span>
                  <span className="text-xs text-slate-400 font-mono">• Tool Registration Wizard</span>
                </div>
                <h3 className="text-xl font-bold font-display text-slate-900">
                  {wizardStep === 1 && '1. Physical Tool Metadata'}
                  {wizardStep === 2 && '2. Upload Reference Photos (3–10 Photos)'}
                  {wizardStep === 3 && '3. Registration & Feature Embedding Complete'}
                </h3>
              </div>
              <button
                onClick={resetWizard}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#F8F7F4] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {wizardError && (
              <div className="p-4 rounded-2xl bg-critical-light border border-critical-border text-critical text-xs font-mono flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{wizardError}</span>
              </div>
            )}

            {/* STEP 1: Metadata Form */}
            {wizardStep === 1 && (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Tool ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. T-014 or TL-CNMG-05"
                      value={formData.tool_id}
                      onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Tool Name</label>
                    <input
                      type="text"
                      value={formData.tool_name}
                      onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Manufacturer</label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Part Number</label>
                    <input
                      type="text"
                      value={formData.part_number}
                      onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Insert Geometry</label>
                    <input
                      type="text"
                      value={formData.insert_shape}
                      onChange={(e) => setFormData({ ...formData, insert_shape: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Substrate Material</label>
                    <input
                      type="text"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Surface Coating</label>
                    <input
                      type="text"
                      value={formData.coating}
                      onChange={(e) => setFormData({ ...formData, coating: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Machine Station</label>
                    <select
                      value={formData.machine_id}
                      onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    >
                      <option value="CNC-LATHE-01">CNC-LATHE-01</option>
                      <option value="CNC-MILL-02">CNC-MILL-02</option>
                      <option value="CNC-LATHE-03">CNC-LATHE-03</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Operator</label>
                    <input
                      type="text"
                      value={formData.assigned_operator}
                      onChange={(e) => setFormData({ ...formData, assigned_operator: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F8F7F4] border border-[#E2DFD7] rounded-xl text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#E2DFD7]">
                  <button
                    type="button"
                    onClick={resetWizard}
                    className="px-5 py-2.5 bg-[#F0EFEA] text-slate-700 hover:bg-[#E2DFD7] rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.tool_id.trim()) {
                        setWizardError('Tool ID is required (e.g. T-014)');
                        return;
                      }
                      setWizardError(null);
                      setWizardStep(2);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition shadow-paper"
                  >
                    <span>Next: Add Reference Photos</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Reference Photos Upload */}
            {wizardStep === 2 && (
              <div className="space-y-5 font-sans text-xs">
                {/* Multi-angle guidance note */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl font-mono text-emerald-900 space-y-1">
                  <div className="font-bold uppercase flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600" />
                    Recommended Reference Photo Set (3–10 Photos):
                  </div>
                  <p className="font-sans text-xs text-emerald-800 leading-relaxed">
                    Provide varied perspectives: <strong>Front flank face</strong>, <strong>Rake face (top)</strong>,{' '}
                    <strong>Side profile</strong>, <strong>Close-up of cutting nose</strong>, and <strong>Rotated / varied lighting</strong>.
                  </p>
                </div>

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-accent/40 hover:border-accent bg-[#F8F7F4] hover:bg-accent/5 p-8 rounded-3xl text-center cursor-pointer transition space-y-2"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 text-accent mx-auto" />
                  <div className="font-bold text-slate-800 text-sm font-display">
                    Click to select reference photos
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    Supported formats: JPG, PNG, WEBP (Select 3–10 photos)
                  </div>
                </div>

                {/* Photo Previews Grid */}
                {refPhotos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-mono text-slate-500">
                      <span>Selected Photos ({refPhotos.length})</span>
                      <span>Assign Angle Perspective</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                      {refPhotos.map((photo, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl font-mono"
                        >
                          <img
                            src={photo.previewUrl}
                            alt="Preview"
                            className="w-14 h-14 object-cover rounded-xl shrink-0 bg-slate-900 border border-[#E2DFD7]"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="text-[11px] font-bold text-slate-800 truncate">
                              {photo.file.name}
                            </div>
                            <select
                              value={photo.angleTag}
                              onChange={(e) => handleAngleChange(index, e.target.value)}
                              className="w-full text-[10px] px-2 py-1 bg-white border border-[#E2DFD7] rounded-lg text-slate-700"
                            >
                              <option value="Front Flank">Front Flank</option>
                              <option value="Rake Face (Top)">Rake Face (Top)</option>
                              <option value="Side Profile">Side Profile</option>
                              <option value="Cutting Edge Macro">Cutting Edge Macro</option>
                              <option value="Isometric Angle">Isometric Angle</option>
                              <option value="Rotated 90°">Rotated 90°</option>
                              <option value="Under Light">Under Workshop Light</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-[#E2DFD7]">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-5 py-2.5 bg-[#F0EFEA] text-slate-700 hover:bg-[#E2DFD7] rounded-xl font-bold font-mono transition"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || refPhotos.length === 0}
                    onClick={handleRegisterSubmit}
                    className={`flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold font-mono transition shadow-paper ${
                      isSubmitting || refPhotos.length === 0 ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Visual Embeddings...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Register & Generate Embeddings ({refPhotos.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Completion & Validation Review */}
            {wizardStep === 3 && registrationResult && (
              <div className="space-y-6 text-center font-mono">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-bold font-display text-slate-900">
                    Tool {formData.tool_id} Successfully Registered!
                  </h4>
                  <p className="text-xs text-slate-600 font-sans">
                    {registrationResult.registration_summary?.valid_accepted || refPhotos.length} reference photos validated.
                    576-dim feature embeddings are stored in memory and on disk.
                  </p>
                </div>

                {/* Validation item breakdown */}
                {registrationResult.registration_summary?.references && (
                  <div className="bg-[#F8F7F4] border border-[#E2DFD7] rounded-2xl p-4 text-left space-y-2 max-h-48 overflow-y-auto text-xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">
                      Reference Photo Validation Log:
                    </div>
                    {registrationResult.registration_summary.references.map((ref: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-[#E2DFD7] last:border-0">
                        <span className="text-slate-700 truncate max-w-[200px]">{ref.file_name}</span>
                        {ref.is_valid ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Valid Tool Insert
                          </span>
                        ) : (
                          <span className="text-red-500 font-bold flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> {ref.reason || 'Rejected'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-center gap-3 pt-4 border-t border-[#E2DFD7]">
                  <button
                    type="button"
                    onClick={resetWizard}
                    className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold font-mono text-xs transition shadow-paper"
                  >
                    Done & View Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tools;
