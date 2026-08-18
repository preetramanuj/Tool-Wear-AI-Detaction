import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '../services/api';
import { AlertItem } from '../types/api';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('all');

  const fetchAlertsList = async () => {
    setLoading(true);
    try {
      const data = await getAlerts(filter === 'unacknowledged' ? false : undefined);
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsList();
  }, [filter]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      fetchAlertsList();
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            ALERTS
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Real-time threshold breaches and operational notifications
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filter === 'all' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ALL ALERTS
            </button>
            <button
              onClick={() => setFilter('unacknowledged')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filter === 'unacknowledged' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ACTIVE ONLY
            </button>
          </div>

          <button
            onClick={fetchAlertsList}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 font-sans">
            Active & Logged Alarms ({alerts.length})
          </h2>
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="text-base font-bold text-slate-700">No active alerts</div>
            <p className="text-slate-500">All monitored cutting tools are operating within normal configured parameters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((al) => {
              const isCritical = al.severity === 'CRITICAL';
              const isWarning = al.severity === 'WARNING';
              return (
                <div
                  key={al.alert_id}
                  className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isCritical
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : isWarning
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-sky-50/70 border-sky-200 text-sky-950'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-white rounded-xl shrink-0 shadow-2xs">
                      {isCritical ? (
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Info className="w-5 h-5 text-sky-600" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base font-sans">
                          {al.title || (isCritical ? 'Critical Tool Flank Wear Limit Breach' : 'Tool Wear Warning Threshold')}
                        </h3>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isCritical
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : isWarning
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-sky-100 text-sky-700 border-sky-200'
                          }`}
                        >
                          ● {al.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans leading-relaxed">
                        {al.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 pt-1">
                        <div>Tool: <strong className="text-slate-800">{al.tool_id || 'T-014'}</strong></div>
                        <div>Time: {al.timestamp ? al.timestamp.replace('T', ' ').substring(0, 16) : 'Just now'}</div>
                        <div>Status: {al.is_acknowledged ? '✓ Acknowledged' : 'Active'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 font-mono text-xs">
                    {!al.is_acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(al.alert_id)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold transition shadow-2xs"
                      >
                        Acknowledge
                      </button>
                    )}
                    <Link
                      to="/tools"
                      className="flex items-center gap-1 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs"
                    >
                      <span>[ View Tool ]</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
