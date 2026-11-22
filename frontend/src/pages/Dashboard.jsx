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
  Sparkles,
  DollarSign,
  TrendingDown,
  Gauge,
  Activity,
  Layers,
  Download,
  Car
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
  BarChart,
  Bar
} from 'recharts';
import SeverityBadge from '../components/SeverityBadge';
import { getCsvExportUrl } from '../services/api';

export default function Dashboard({ stats, onNavigate, onRefresh, onOpenPatrolModal }) {
  const pqiScore = stats?.pqi?.score ?? 84;
  const pqiStatus = stats?.pqi?.status ?? "Optimal Condition";
  const pqiColor = stats?.pqi?.color ?? "#10B981";

  const cards = [
    {
      title: 'Potholes Detected',
      value: stats?.total_potholes ?? 0,
      icon: ShieldAlert,
      textColor: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/10 border-cyan-500/20',
      subtext: 'Road surface damage entities'
    },
    {
      title: 'High Risk Hazards',
      value: stats?.high_severity ?? 0,
      icon: ShieldAlert,
      textColor: 'text-rose-400',
      bgGlow: 'bg-rose-500/10 border-rose-500/20',
      subtext: 'Emergency 24-48h resurfacing'
    },
    {
      title: 'Medium Defects',
      value: stats?.medium_severity ?? 0,
      icon: AlertTriangle,
      textColor: 'text-amber-400',
      bgGlow: 'bg-amber-500/10 border-amber-500/20',
      subtext: 'Scheduled weekly filling'
    },
    {
      title: 'Total Scans Logged',
      value: stats?.total_scans ?? 0,
      icon: ScanLine,
      textColor: 'text-indigo-400',
      bgGlow: 'bg-indigo-500/10 border-indigo-500/20',
      subtext: 'Image & video streams'
    },
    {
      title: 'Est. Repair Budget',
      value: `$${(stats?.economic_impact?.repair_budget_usd ?? 0).toLocaleString()}`,
      icon: DollarSign,
      textColor: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/10 border-emerald-500/20',
      subtext: `${stats?.economic_impact?.asphalt_required_kg ?? 0} kg bitumen needed`
    },
    {
      title: 'YOLOv8 Confidence',
      value: `${Math.round((stats?.avg_confidence ?? 0) * 100)}%`,
      icon: Percent,
      textColor: 'text-sky-400',
      bgGlow: 'bg-sky-500/10 border-sky-500/20',
      subtext: 'Neural precision rating'
    }
  ];

  const pieData = stats?.severity_distribution?.filter(d => d.value > 0) || [];
  const dailyData = stats?.daily_stats || [];
  const sectorData = stats?.sector_distribution || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#080D1A] border border-cyan-500/30 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> SMART CITY INFRASTRUCTURE INTELLIGENCE
              </span>
              <span className="text-xs text-slate-400">• Version 2.0 Hackathon Edition</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              RoadGuard AI: Autonomous Road Damage Command Center
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time computer vision platform delivering autonomous asphalt cavity detection,
              GIS geospatial heat-maps, pavement quality grading, and municipal repair triage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onOpenPatrolModal && (
              <button
                onClick={onOpenPatrolModal}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/30 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center gap-2"
              >
                <Car className="w-4 h-4 animate-bounce" />
                <span>🚨 Patrol Dashcam Simulator</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('detect')}
              className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition flex items-center gap-2"
            >
              <ScanLine className="w-4 h-4 text-cyan-400" />
              <span>New AI Scan</span>
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
              className={`p-4 rounded-2xl bg-[#0F172A]/80 border shadow-lg backdrop-blur-xl transition hover:border-cyan-500/40 ${c.bgGlow}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 truncate">{c.title}</span>
                <Icon className={`w-4 h-4 ${c.textColor}`} />
              </div>
              <div className="text-2xl font-black text-white tracking-tight mb-1 font-mono">
                {c.value}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {c.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Center Row: Pavement Quality Index (PQI) + Severity Donut + 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pavement Quality Index (PQI) Gauge (3 cols) */}
        <div className="lg:col-span-3 p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-white text-sm">Pavement Quality Index</h3>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Municipal road network health index
            </p>
          </div>

          <div className="my-auto text-center py-4">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-36 h-36">
                <circle
                  className="text-slate-800"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="56"
                  cx="72"
                  cy="72"
                />
                <circle
                  stroke={pqiColor}
                  strokeWidth="10"
                  strokeDasharray={351}
                  strokeDashoffset={351 - (351 * pqiScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  r="56"
                  cx="72"
                  cy="72"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-white font-mono">{pqiScore}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">OUT OF 100</span>
              </div>
            </div>

            <div className="mt-3">
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold font-mono"
                style={{ backgroundColor: `${pqiColor}20`, color: pqiColor }}
              >
                {pqiStatus}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Citywide Health:</span>
            <span className="font-bold text-white font-mono">{pqiScore >= 75 ? 'Grade A' : 'Grade B-'}</span>
          </div>
        </div>

        {/* Severity Distribution Donut (3 cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-white text-sm">Severity Classification</h3>
              <span className="text-[11px] text-slate-400 font-mono">YOLOv8 Triage</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Damage distribution by visual heuristic
            </p>
          </div>

          <div className="h-52 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
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
                      borderRadius: '12px',
                      color: '#F8FAFC',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">No active records</div>
            )}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center text-xs">
            <div>
              <span className="text-rose-400 block font-bold">High</span>
              <span className="text-sm font-black text-white font-mono">{stats?.high_severity ?? 0}</span>
            </div>
            <div>
              <span className="text-amber-400 block font-bold">Medium</span>
              <span className="text-sm font-black text-white font-mono">{stats?.medium_severity ?? 0}</span>
            </div>
            <div>
              <span className="text-emerald-400 block font-bold">Low</span>
              <span className="text-sm font-black text-white font-mono">{stats?.low_severity ?? 0}</span>
            </div>
          </div>
        </div>

        {/* 7-Day Detection Trend Area Chart (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-extrabold text-white text-sm">7-Day Detection Activity</h3>
              <p className="text-xs text-slate-400">
                Daily volume of detected road defects
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-cyan-400 font-semibold font-mono">
                <span className="w-2.5 h-2.5 rounded bg-cyan-400" /> Potholes
              </span>
            </div>
          </div>

          <div className="h-52 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="potholeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#F8FAFC',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="potholes"
                  name="Potholes Found"
                  stroke="#00B4D8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#potholeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Automated AI Triage</span>
            <span className="text-cyan-400 font-mono font-semibold">Telemetry Synced</span>
          </div>
        </div>
      </div>

      {/* Sector Damage Matrix & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sector Damage Triage Table (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="font-extrabold text-white text-base">Infrastructure Sector Matrix</h3>
              <p className="text-xs text-slate-400">Pothole concentration across municipal corridors</p>
            </div>
            <a
              href={getCsvExportUrl()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
              title="Download GIS CSV"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>

          <div className="space-y-2.5">
            {sectorData.map((sec, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{sec.sector}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{sec.potholes} active defects</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-cyan-400 block">PQI: {sec.pqi}</span>
                  <span className={`text-[10px] font-semibold ${sec.pqi < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {sec.pqi < 50 ? 'Urgent Repair' : 'Stable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Detection Activity (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="font-extrabold text-white text-base">Live Detection Activity</h3>
              <p className="text-xs text-slate-400">Latest highway scans processed by YOLOv8</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition"
            >
              <span>Full History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {stats?.recent_detections?.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('history')}
                className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/50 cursor-pointer transition flex gap-3 group"
              >
                <img
                  src={item.processed_url}
                  alt="Thumb"
                  className="w-20 h-16 rounded-xl object-cover bg-slate-950 shrink-0 border border-slate-800 group-hover:scale-105 transition-transform"
                  onError={(e) => { e.target.src = item.image_url; }}
                />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <SeverityBadge severity={item.overall_severity} size="sm" />
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">#{item.id}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">
                    {item.location_name || 'Untagged Highway'}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{item.total_potholes} Defect(s)</span>
                    <span>{Math.round(item.confidence_score * 100)}% Conf</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
