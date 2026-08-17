import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '../services/api';
import { AlertItem } from '../types/api';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('all');

  const fetchAlertsList = async () => {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-600" />
            Industrial Safety & Tool Wear Alarms
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-Time Threshold Breach Events, Flank Degradation Warnings & Operator Notifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-bold transition ${
                filter === 'all' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ALL ALARMS
            </button>
            <button
              onClick={() => setFilter('unacknowledged')}
              className={`px-3 py-1 rounded-md font-bold transition ${
                filter === 'unacknowledged' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ACTIVE ONLY
            </button>
          </div>

          <button onClick={fetchAlertsList} className="text-slate-500 hover:text-sky-600 transition p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4 font-mono text-xs">
        <h2 className="text-xs font-bold uppercase text-slate-800 pb-2 border-b border-slate-200">
          Alarm Event Log ({alerts.length})
        </h2>

        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((al) => (
              <div
                key={al.alert_id}
                className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  al.severity === 'CRITICAL'
                    ? 'bg-rose-50/70 border-rose-200'
                    : al.severity === 'WARNING'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-sky-50/70 border-sky-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {al.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                    ) : al.severity === 'WARNING' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Info className="w-5 h-5 text-sky-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{al.title}</span>
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-semibold">
                        {al.tool_id || 'SYSTEM'}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 text-[11px]">{al.message}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Triggered: {new Date(al.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {al.is_acknowledged ? (
                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ACKNOWLEDGED
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(al.alert_id)}
                      className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs hover:border-slate-400"
                    >
                      ACKNOWLEDGE
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            No active safety alerts or degradation alarms.
          </div>
        )}
      </div>
    </div>
  );
};
