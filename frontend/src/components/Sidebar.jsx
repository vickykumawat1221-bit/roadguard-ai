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
  Radio
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'detect', label: 'Detect Potholes', icon: Scan, badge: 'Live AI' },
    { id: 'map', label: 'Road Damage Map', icon: MapPin },
    { id: 'history', label: 'Detection History', icon: History },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'about', label: 'About Project', icon: Info },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-[#0B132B] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-20">
      <div>
        {/* Brand Logo & Title */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                RoadGuard <span className="text-cyan-400">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Smart City Road Vision
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Core Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Lab Station Footer Info */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 mb-1.5 text-slate-300 font-semibold">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>BTech NextGen Lab</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          YOLOv8 Object Detection Engine running on Apple Silicon M2 Core.
        </p>
      </div>
    </aside>
  );
}
