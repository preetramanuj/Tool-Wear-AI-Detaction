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
  AlertOctagon,
} from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '../services/api';
import { AlertItem } from '../types/api';
import { SeverityBadge, SeverityCard } from '../components/common/Severity';

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

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DFD7]">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-slate-900 tracking-tight">
            ALERTS & NOTIFICATIONS
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">
            Real-time threshold breaches and operational notifications
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex bg-[#F0EFEA] p-1 rounded-xl border border-[#E2DFD7]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filter === 'all' ? 'bg-accent text-white shadow-paper' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ALL ALERTS
            </button>
            <button
              onClick={() => setFilter('unacknowledged')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filter === 'unacknowledged' ? 'bg-accent text-white shadow-paper' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ACTIVE ONLY
            </button>
          </div>

          <button
            onClick={fetchAlertsList}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-[#F0EFEA] rounded-xl transition border border-[#E2DFD7] bg-white shadow-paper"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Severity Matrix Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SeverityCard
          level="NORMAL"
          title="Normal Status"
          subtitle="Operating parameters nominal"
        />
        <SeverityCard
          level="WARNING"
          title="Warning Level"
          subtitle={`${warningCount} items approaching limit`}
          count={warningCount}
        />
        <SeverityCard
          level="CRITICAL"
          title="Critical Level"
          subtitle={`${criticalCount} items require immediate action`}
          count={criticalCount}
        />
      </div>

      {/* Alerts Feed */}
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 md:p-8 shadow-paper space-y-6">
        <div className="pb-4 border-b border-[#E2DFD7] flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-slate-900">
            Active & Logged Alarms ({alerts.length})
          </h2>
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <CheckCircle2 className="w-12 h-12 text-normal mx-auto" />
            <div className="text-base font-bold text-slate-700 font-display">No active alerts</div>
            <p className="text-slate-500 font-sans">All monitored cutting tools are operating within normal configured parameters.</p>
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
                      ? 'bg-critical-light/40 border-critical/40 text-slate-900 hazard-stripe-left pl-8'
                      : isWarning
                      ? 'bg-warning-light/40 border-warning/40 text-slate-900'
                      : 'bg-accent-50/40 border-accent/30 text-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-white rounded-xl shrink-0 shadow-paper">
                      {isCritical ? (
                        <AlertOctagon className="w-5 h-5 text-critical" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      ) : (
                        <Info className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-base font-display">
                          {al.title || (isCritical ? 'Critical Tool Flank Wear Limit Breach' : 'Tool Wear Warning Threshold')}
                        </h3>
                        <SeverityBadge level={al.severity} size="sm" />
                      </div>
                      <p className="text-xs text-slate-700 font-sans leading-relaxed">
                        {al.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 pt-1">
                        <div>Tool: <strong className="text-accent">{al.tool_id || 'T-014'}</strong></div>
                        <div className="data-readout">Time: {al.timestamp ? al.timestamp.replace('T', ' ').substring(0, 19) : '02:25:06 PM'}</div>
                        <div>Status: {al.is_acknowledged ? '✓ Acknowledged' : 'Active'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 font-mono text-xs">
                    {!al.is_acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(al.alert_id)}
                        className="px-3 py-1.5 bg-white hover:bg-[#F8F7F4] text-slate-700 border border-[#E2DFD7] rounded-xl font-bold transition shadow-paper"
                      >
                        Acknowledge
                      </button>
                    )}
                    <Link
                      to="/tools"
                      className="flex items-center gap-1 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition shadow-paper"
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

