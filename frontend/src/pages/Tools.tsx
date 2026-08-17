import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Trash2,
  ScanEye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  RefreshCw,
  User,
} from 'lucide-react';
import { getTools, createTool, deleteTool } from '../services/api';
import { Tool } from '../types/api';

export const Tools: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    tool_id: '',
    tool_name: 'Turning Insert (CNMG-120408)',
    tool_type: 'Carbide Turning Insert',
    insert_shape: 'Rhombic 80°',
    material: 'Tungsten Carbide (WC-Co)',
    coating: 'TiCN + Al2O3 + TiN (CVD)',
    machine_id: 'CNC-LATHE-01',
    assigned_operator: 'Rahul',
    status: 'HEALTHY' as 'HEALTHY' | 'WARNING' | 'CRITICAL',
  });
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchToolsList = async () => {
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

  const handleCreateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tool_id.trim()) {
      setModalError('Tool ID is required');
      return;
    }

    try {
      await createTool(formData);
      setShowAddModal(false);
      setFormData({
        tool_id: '',
        tool_name: 'Turning Insert (CNMG-120408)',
        tool_type: 'Carbide Turning Insert',
        insert_shape: 'Rhombic 80°',
        material: 'Tungsten Carbide (WC-Co)',
        coating: 'TiCN + Al2O3 + TiN (CVD)',
        machine_id: 'CNC-LATHE-01',
        assigned_operator: 'Rahul',
        status: 'HEALTHY',
      });
      fetchToolsList();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to create tool');
    }
  };

  const handleDelete = async (toolId: string) => {
    if (confirm(`Are you sure you want to remove Tool ${toolId}?`)) {
      try {
        await deleteTool(toolId);
        fetchToolsList();
      } catch (err) {
        alert('Failed to delete tool');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-600" />
            Cutting Tool Inventory & Spindle Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active Insert Library, Verified Material Grades, Spindle Station & Wear Lifecycle Tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wide transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          REGISTER NEW TOOL
        </button>
      </div>

      {/* Tools Table Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <h2 className="text-xs font-bold font-mono uppercase text-slate-800">
            Registered Tool Inserts ({tools.length})
          </h2>
          <button onClick={fetchToolsList} className="text-slate-500 hover:text-sky-600 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {tools.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Tool ID</th>
                  <th className="px-3 py-2.5 font-semibold">Name & Type</th>
                  <th className="px-3 py-2.5 font-semibold">Material & Coating</th>
                  <th className="px-3 py-2.5 font-semibold">Machine & Operator</th>
                  <th className="px-3 py-2.5 font-semibold">Wear Status</th>
                  <th className="px-3 py-2.5 font-semibold">Current VB (mm)</th>
                  <th className="px-3 py-2.5 font-semibold">Wear (µm)</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tools.map((t) => (
                  <tr key={t.tool_id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3 font-bold text-sky-700">{t.tool_id}</td>
                    <td className="px-3 py-3 text-slate-800">
                      <div className="font-semibold">{t.tool_name}</div>
                      <div className="text-[10px] text-slate-500">{t.tool_type} ({t.insert_shape})</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div>{t.material}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{t.coating}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div>{t.machine_id}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{t.assigned_operator}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded font-bold ${
                          t.status === 'HEALTHY'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : t.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-800">{t.current_wear_vb_mm.toFixed(3)}</td>
                    <td className="px-3 py-3 text-slate-700">{t.current_wear_um.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <Link
                        to="/inspections"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-md text-[11px] font-semibold transition"
                      >
                        <ScanEye className="w-3.5 h-3.5" />
                        Inspect
                      </Link>
                      <button
                        onClick={() => handleDelete(t.tool_id)}
                        className="inline-flex items-center p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 font-mono text-xs">
            No tools registered in database. Click "Register New Tool" above to add one.
          </div>
        )}
      </div>

      {/* Add Tool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 font-mono text-xs shadow-xl">
            <h3 className="text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-600" />
              Register Cutting Tool
            </h3>

            {modalError && (
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateTool} className="space-y-3">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Tool ID (e.g. TL-CNMG-9900)</label>
                <input
                  type="text"
                  required
                  value={formData.tool_id}
                  onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Tool Name</label>
                <input
                  type="text"
                  value={formData.tool_name}
                  onChange={(e) => setFormData({ ...formData, tool_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Insert Type & Geometry</label>
                <input
                  type="text"
                  value={formData.tool_type}
                  onChange={(e) => setFormData({ ...formData, tool_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Material Substrate</label>
                <input
                  type="text"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Surface Coating</label>
                <input
                  type="text"
                  value={formData.coating}
                  onChange={(e) => setFormData({ ...formData, coating: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Assigned Machine & Operator</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.machine_id}
                    onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                  <input
                    type="text"
                    value={formData.assigned_operator}
                    onChange={(e) => setFormData({ ...formData, assigned_operator: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg font-bold hover:bg-sky-700 shadow-xs"
                >
                  SAVE TOOL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
