import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Database, 
  Activity, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Server, 
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { checkHealth, getStatistics } from '../services/api';

export default function Settings({ systemStatus, onRefresh }) {
  const [healthData, setHealthData] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  // User configurable runtime preferences
  const [defaultConf, setDefaultConf] = useState(0.25);
  const [frameStride, setFrameStride] = useState(2);
  const [autoLocate, setAutoLocate] = useState(true);

  const fetchDiagnostics = async () => {
    setIsPinging(true);
    try {
      const [h, s] = await Promise.all([checkHealth(), getStatistics()]);
      setHealthData(h);
      setDbStats(s);
    } catch (err) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          <span>System Settings & Lab Diagnostics</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect core AI vision engine health, persistent database status, and runtime thresholds.
        </p>
      </div>

      {/* Diagnostics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backend API Health */}
        <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Backend API</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-white">
            {healthData?.status === 'healthy' ? 'Healthy & Online' : 'Connecting...'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            FastAPI 0.110 (Uvicorn ASGI)
          </p>
        </div>

        {/* AI Model State */}
        <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Computer Vision Engine</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {healthData?.ai_model || 'YOLOv8s'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Device: {healthData?.runtime_device || 'Apple Silicon CPU'}
          </p>
        </div>

        {/* Database Records */}
        <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Persistent Storage</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {dbStats?.total_scans ?? 0} Ingested Scans
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            SQLite (roadguard.db)
          </p>
        </div>
      </div>

      {/* Runtime Configuration Card */}
      <div className="p-6 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-5">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <span>Inference & Detection Preferences</span>
        </h3>

        <div className="space-y-4 text-xs">
          {/* Default Confidence */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span className="font-semibold">Default Detection Confidence Threshold:</span>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(defaultConf * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={defaultConf}
              onChange={(e) => setDefaultConf(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Lower thresholds detect fainter road depressions; higher thresholds require firmer AI certainty.
            </p>
          </div>

          {/* Video Frame Stride */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800">
            <label className="font-semibold text-slate-300 block">
              Video Frame Processing Stride (Optimized for 8GB RAM):
            </label>
            <div className="flex gap-2">
              {[
                { val: 1, label: 'Every Frame (Heavy)' },
                { val: 2, label: 'Every 2nd Frame (Balanced - Recommended)' },
                { val: 4, label: 'Every 4th Frame (Fastest)' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setFrameStride(opt.val)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                    frameStride === opt.val
                      ? 'bg-cyan-600 text-white border-cyan-500 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Geolocation Autoprompt */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-300 block">
                Automatic Geolocation Request
              </span>
              <p className="text-[11px] text-slate-500">
                Prompt browser for GPS fix when capturing camera feeds
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoLocate}
              onChange={(e) => setAutoLocate(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Lab Information & Diagnostics Refresh */}
      <div className="p-6 rounded-2xl bg-[#1C2541]/70 border border-slate-800 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-white text-sm">System Diagnostics</h4>
          <p className="text-xs text-slate-400">
            Ping backend endpoints to verify model memory residency and database connectivity.
          </p>
        </div>
        <button
          onClick={fetchDiagnostics}
          disabled={isPinging}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
          <span>{isPinging ? 'Checking...' : 'Run Diagnostics'}</span>
        </button>
      </div>
    </div>
  );
}
