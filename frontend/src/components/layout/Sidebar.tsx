import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanEye,
  Wrench,
  Sliders,
  BarChart3,
  BrainCircuit,
  Search,
  TrendingUp,
  Timer,
  FileText,
  Settings as SettingsIcon,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activeAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inspections', label: 'Inspections', icon: ScanEye },
    { to: '/tools', label: 'Tools', icon: Wrench },
    { to: '/optimization', label: 'Optimization', icon: Sliders },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/insights', label: 'Insights', icon: BrainCircuit },
    { to: '/root-cause', label: 'Root Cause', icon: Search },
    { to: '/economics', label: 'Economic Impact', icon: TrendingUp },
    { to: '/downtime', label: 'Downtime', icon: Timer },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 shadow-xs z-20 font-sans">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-200 bg-white">
        <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="font-extrabold text-base tracking-tight text-slate-900 font-sans">ToolGuard-AI</div>
          <div className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase">Predictive System</div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto font-medium text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-bold border-l-4 border-sky-600 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 font-medium">System Status</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
