import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  ScanEye,
  Wrench,
  BarChart3,
  Cpu,
  UserCheck,
  Bell,
  FileText,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activeAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeAlertsCount = 0 }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live-monitor', label: 'Live Monitor & Webcam', icon: Activity },
    { to: '/inspections', label: 'Inspections', icon: ScanEye },
    { to: '/tools', label: 'Tools Inventory', icon: Wrench },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/models', label: 'AI Models', icon: Cpu },
    { to: '/face-detection', label: 'Face & Operator Auth', icon: UserCheck },
    { to: '/alerts', label: 'Alerts', icon: Bell, badge: activeAlertsCount > 0 ? activeAlertsCount : undefined },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 shadow-sm z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-200 bg-slate-50/70">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-wider text-slate-900 font-mono">ToolGuard-AI</div>
          <div className="text-[10px] text-slate-500 font-mono tracking-tight font-semibold">PREDICTIVE VISION SYSTEM</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 pb-2 font-semibold">
          Control Center
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-bold border-l-4 border-sky-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-900" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Facility Status Card */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-slate-500 font-semibold">CNC LATHE #01</span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              ONLINE
            </span>
          </div>
          <div className="text-[11px] text-slate-700 font-medium truncate">Spindle Feed: 180 m/min</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">SIH-2026 PROD NODE</div>
        </div>
      </div>
    </aside>
  );
};
