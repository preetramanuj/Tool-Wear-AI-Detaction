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
  BrainCircuit,
  TrendingUp,
  Timer,
  Search,
} from 'lucide-react';

interface SidebarProps {
  activeAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeAlertsCount = 0 }) => {
  const operationsNav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live-monitor', label: 'Live Monitor & Camera', icon: Activity },
    { to: '/inspections', label: 'Inspections', icon: ScanEye },
    { to: '/tools', label: 'Tools Inventory', icon: Wrench },
  ];

  const intelligenceNav = [
    { to: '/insights', label: 'Manufacturing Insights', icon: BrainCircuit, badge: 'M5' },
    { to: '/economics', label: 'Economic Impact', icon: TrendingUp, badge: 'M7' },
    { to: '/downtime', label: 'Downtime Avoided', icon: Timer, badge: 'M8' },
    { to: '/root-cause', label: 'Root Cause Analysis', icon: Search, badge: 'M9' },
  ];

  const systemNav = [
    { to: '/models', label: 'AI Models & Benchmark', icon: Cpu },
    { to: '/face-detection', label: 'Face & Operator Auth', icon: UserCheck },
    { to: '/analytics', label: 'Analytics & Trends', icon: BarChart3 },
    { to: '/alerts', label: 'Alerts', icon: Bell, badge: activeAlertsCount > 0 ? activeAlertsCount : undefined },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const renderNavSection = (items: any[]) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-sky-50 text-sky-700 font-bold border-l-4 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent'
            }`
          }
        >
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">{item.label}</span>
          </div>
          {item.badge !== undefined && (
            <span
              className={`px-1.5 py-0.2 text-[9px] font-bold font-mono rounded ${
                typeof item.badge === 'number'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-sky-100 text-sky-700 border border-sky-200'
              }`}
            >
              {item.badge}
            </span>
          )}
        </NavLink>
      );
    });

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
      <div className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 pb-1.5 font-semibold">
            Operations
          </div>
          <div className="space-y-0.5">{renderNavSection(operationsNav)}</div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 pb-1.5 font-semibold">
            Intelligence Engines
          </div>
          <div className="space-y-0.5">{renderNavSection(intelligenceNav)}</div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 pb-1.5 font-semibold">
            System & Diagnostics
          </div>
          <div className="space-y-0.5">{renderNavSection(systemNav)}</div>
        </div>
      </div>

      {/* Facility Status Card */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-500 font-semibold">CNC-LATHE-01</span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              ONLINE
            </span>
          </div>
          <div className="text-[11px] text-slate-700 font-medium truncate">Insert: CNMG 120408</div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">SIH-2026 PROD NODE</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
