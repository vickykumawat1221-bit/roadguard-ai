import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  ScanLine, 
  Percent, 
  ArrowUpRight, 
  Calendar, 
  MapPin, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import SeverityBadge from '../components/SeverityBadge';

export default function Dashboard({ stats, onNavigate, onRefresh }) {
  const cards = [
    {
      title: 'Total Potholes Detected',
      value: stats?.total_potholes ?? 0,
      icon: ShieldAlert,
      color: 'from-blue-600 to-cyan-600',
      textColor: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/10',
      subtext: 'Identified road surface hazards'
    },
    {
      title: 'High Severity Hazards',
      value: stats?.high_severity ?? 0,
      icon: ShieldAlert,
      color: 'from-rose-600 to-red-600',
      textColor: 'text-rose-400',
      bgGlow: 'bg-rose-500/10',
      subtext: 'Critical depth & area priority'
    },
    {
      title: 'Medium Severity',
      value: stats?.medium_severity ?? 0,
      icon: AlertTriangle,
      color: 'from-amber-600 to-yellow-600',
      textColor: 'text-amber-400',
      bgGlow: 'bg-amber-500/10',
      subtext: 'Scheduled routine repairs'
    },
    {
      title: 'Low Severity',
      value: stats?.low_severity ?? 0,
      icon: CheckCircle,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/10',
      subtext: 'Early-stage pavement fissures'
    },
    {
      title: 'Total Scans Performed',
      value: stats?.total_scans ?? 0,
      icon: ScanLine,
      color: 'from-indigo-600 to-purple-600',
      textColor: 'text-indigo-400',
      bgGlow: 'bg-indigo-500/10',
      subtext: 'Images & video streams processed'
    },
    {
      title: 'Average AI Confidence',
      value: `${Math.round((stats?.avg_confidence ?? 0) * 100)}%`,
      icon: Percent,
      color: 'from-sky-600 to-blue-600',
      textColor: 'text-sky-400',
      bgGlow: 'bg-sky-500/10',
      subtext: 'YOLOv8 inference confidence'
    }
  ];

  const pieData = stats?.severity_distribution?.filter(d => d.value > 0) || [];
  const dailyData = stats?.daily_stats || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1C2541] via-[#233156] to-[#0B132B] border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Vision Station
              </span>
              <span className="text-xs text-slate-400">• Persistent SQLite Telemetry</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Road Surface Health & Hazard Monitoring
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Real-time deep learning detection pipeline automatically identifying asphalt cavities,
              measuring damage surface severity, and plotting geographical coordinate clusters.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('detect')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition flex items-center gap-2"
            >
              <ScanLine className="w-4 h-4" />
              <span>Launch New Scan</span>
            </button>
            <button
              onClick={() => onNavigate('map')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Damage Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 truncate">{c.title}</span>
                <div className={`p-2 rounded-lg ${c.bgGlow}`}>
                  <Icon className={`w-4 h-4 ${c.textColor}`} />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight mb-1">
                {c.value}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {c.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution Donut */}
        <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-white text-sm">Severity Distribution</h3>
              <span className="text-[11px] text-slate-400">Relative Breakdown</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Breakdown by estimated visual damage heuristic
            </p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                No pothole records detected yet.
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> High
              </div>
              <span className="text-sm font-bold text-white">{stats?.high_severity ?? 0}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium
              </div>
              <span className="text-sm font-bold text-white">{stats?.medium_severity ?? 0}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low
              </div>
              <span className="text-sm font-bold text-white">{stats?.low_severity ?? 0}</span>
            </div>
          </div>
        </div>

        {/* 7-Day Detection Trend Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-bold text-white text-sm">7-Day Detection Timeline</h3>
              <p className="text-xs text-slate-400">
                Daily volume of detected potholes and road scans
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded bg-cyan-400" /> Potholes
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Scans
              </span>
            </div>
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="potholeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#233156" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="potholes"
                  name="Potholes Found"
                  stroke="#00B4D8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#potholeGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Total Scans"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#scanGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Automated AI Triage</span>
            <span className="text-cyan-400 font-medium">Daily Telemetry Synced</span>
          </div>
        </div>
      </div>

      {/* Recent Scans Section */}
      <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Recent Detection Activity</h3>
            <p className="text-xs text-slate-400">
              Latest road damage inspections analyzed by YOLOv8
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
          >
            <span>View Full History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats?.recent_detections?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recent_detections.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('history')}
                className="group cursor-pointer rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden hover:border-cyan-500/50 transition-all duration-200"
              >
                {/* Image Preview with Badges */}
                <div className="h-40 relative bg-slate-950 overflow-hidden">
                  <img
                    src={item.processed_url}
                    alt="Processed Road"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = item.image_url;
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <SeverityBadge severity={item.overall_severity} size="sm" />
                  </div>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur border border-slate-700 text-[10px] text-white font-mono">
                    ID #{item.id}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur text-[11px] text-slate-200">
                    <span className="font-semibold text-cyan-400">
                      {item.total_potholes} Pothole{item.total_potholes === 1 ? '' : 's'}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {Math.round(item.confidence_score * 100)}% Conf
                    </span>
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium truncate">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{item.location_name || 'Unassigned Road Sector'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span className="flex items-center gap-1 font-mono">
                      {item.latitude && item.longitude ? (
                        `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}`
                      ) : (
                        'No GPS tag'
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400 text-sm">
            No detection records available. Launch an image or video scan to begin tracking.
          </div>
        )}
      </div>
    </div>
  );
}
