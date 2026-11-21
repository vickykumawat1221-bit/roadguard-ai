import React, { useState } from 'react';
import { Bell, RefreshCw, Activity, Cpu, CheckCircle2, User } from 'lucide-react';

export default function Header({ systemStatus, onRefresh, stats }) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-[#0B132B]/95 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between shrink-0 z-10">
      {/* Title & Tagline */}
      <div>
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>RoadGuard AI</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
            v1.0.0
          </span>
        </h2>
        <p className="text-xs text-slate-400 font-normal hidden sm:block">
          Intelligent Road Damage Detection & Monitoring System
        </p>
      </div>

      {/* Right Action & Status Center */}
      <div className="flex items-center gap-4">
        {/* Real-time System Status Pill */}
        <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${systemStatus.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-medium">
              {systemStatus.isOnline ? 'Core Online' : 'Connecting...'}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>YOLOv8s CPU</span>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          title="Refresh live telemetry & statistics"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition relative"
          >
            <Bell className="w-4 h-4" />
            {stats?.high_severity > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0B132B]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 text-xs z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="font-bold text-white">System Alerts</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">Real-Time</span>
              </div>
              <div className="space-y-2">
                {stats?.high_severity > 0 ? (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <span className="font-semibold block mb-0.5">⚠️ Severe Damage Alert</span>
                    {stats.high_severity} critical road hazard(s) flagged for priority asphalt repair.
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <span className="font-semibold block mb-0.5">✅ Roadways Stable</span>
                    No active critical-tier road cavities pending review.
                  </div>
                )}
                <div className="p-2 rounded-lg bg-slate-800/50 text-slate-400 text-[11px]">
                  Database synced with persistent SQLite store.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-800">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden lg:block">
            <span className="text-xs font-semibold text-white block leading-none">Lab Engineer</span>
            <span className="text-[10px] text-slate-400">Admin Station</span>
          </div>
        </div>
      </div>
    </header>
  );
}
