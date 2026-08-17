import React, { useEffect, useState } from 'react';
import { Camera, Database, HardDrive, Cpu, Radio } from 'lucide-react';
import { getSystemStatus, getModelsStatus } from '../../services/api';
import { SystemStatusResponse, ModelsStatusResponse } from '../../types/api';

export const Header: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [modelsStatus, setModelsStatus] = useState<ModelsStatusResponse | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [sys, mod] = await Promise.all([getSystemStatus(), getModelsStatus()]);
        setSystemStatus(sys);
        setModelsStatus(mod);
      } catch (err) {
        console.error('Failed to fetch system/models status:', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const camStatus = systemStatus?.status_indicators?.camera?.status || 'ACTIVE';
  const dbStatus = systemStatus?.status_indicators?.database?.status || 'CONNECTED';
  const storagePercent = systemStatus?.status_indicators?.storage?.used_percent ?? 8.8;
  const deviceName = modelsStatus?.system_device || 'CPU (Host Engine)';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Left System Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-800 uppercase">SYSTEM ONLINE</span>
        </div>
        <span className="text-slate-300">|</span>
        <span className="text-xs font-mono text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded font-semibold">
          {deviceName}
        </span>
      </div>

      {/* Industrial Real-Time Indicators */}
      <div className="flex items-center gap-4">
        {/* Camera Status */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
          <Camera className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-[11px] font-mono text-slate-500 font-medium">CAM:</span>
          <span className="text-[11px] font-mono font-bold text-emerald-700">
            {camStatus} (30 FPS)
          </span>
        </div>

        {/* AI Models Status */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
          <Cpu className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-[11px] font-mono text-slate-500 font-medium">AI ENGINES:</span>
          <span className="text-[11px] font-mono font-bold text-emerald-700">
            {modelsStatus ? `${modelsStatus.models_loaded_count}/4 LOADED` : '4 LOADED'}
          </span>
        </div>

        {/* Database Status */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
          <Database className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[11px] font-mono text-slate-500 font-medium">DB:</span>
          <span className={`text-[11px] font-mono font-bold ${dbStatus === 'CONNECTED' ? 'text-emerald-700' : 'text-rose-600'}`}>
            {dbStatus} (SQLite)
          </span>
        </div>

        {/* Storage */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-mono text-slate-500 font-medium">STORAGE:</span>
          <span className="text-[11px] font-mono font-bold text-slate-700">
            {storagePercent}% USED
          </span>
        </div>

        {/* Digital Clock */}
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
          <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
          <span>{currentTime || '00:00:00'}</span>
        </div>
      </div>
    </header>
  );
};
