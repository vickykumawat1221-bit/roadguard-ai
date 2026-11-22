import React from 'react';
import { 
  LayoutDashboard, 
  Scan, 
  MapPin, 
  History, 
  FileText, 
  Info, 
  Settings as SettingsIcon,
  ShieldAlert,
  Car,
  Sparkles,
  Zap
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenPatrol }) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'detect', label: 'AI Vision Studio', icon: Scan, badge: 'Live AI' },
    { id: 'map', label: 'GIS Spatial Map', icon: MapPin },
    { id: 'history', label: 'Inspection History', icon: History },
    { id: 'reports', label: 'Compliance Reports', icon: FileText },
    { id: 'about', label: 'About Project', icon: Info },
    { id: 'settings', label: 'System Diagnostics', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-[#080D1A] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none z-20 shadow-2xl">
      <div>
        {/* Brand Logo & Title */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                RoadGuard <span className="text-cyan-400">AI</span>
              </h1>
              <p className="text-[10px] text-cyan-400/80 font-mono uppercase tracking-wider font-bold">
                Smart City Road Vision
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
            Core Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Simulator Quick Action Button */}
        {onOpenPatrol && (
          <div className="px-4 pt-1">
            <button
              onClick={onOpenPatrol}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-950 via-blue-950 to-indigo-950 hover:from-cyan-900 hover:to-indigo-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 transition group"
            >
              <Car className="w-4 h-4 text-cyan-400 group-hover:animate-bounce" />
              <span>Patrol Simulator</span>
            </button>
          </div>
        )}
      </div>

      {/* Lab Station Footer Info */}
      <div className="p-4 m-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs shadow-inner">
        <div className="flex items-center gap-2 mb-1 text-slate-300 font-bold text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>NextGen Lab Station</span>
        </div>
        <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
          YOLOv8s • PyTorch 2.15 • Apple Silicon M2 Engine
        </p>
      </div>
    </aside>
  );
}
