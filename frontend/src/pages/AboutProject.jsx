import React from 'react';
import { 
  BookOpen, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Code2, 
  Terminal, 
  CheckCircle2, 
  Sparkles,
  Database,
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function AboutProject() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#1C2541] via-[#233156] to-[#0B132B] border border-slate-700/60 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> BTech Computer Science Next-Gen Lab Project
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            RoadGuard AI: Intelligent Road Damage Detection & Monitoring
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            A production-ready deep learning system designed for civil road authorities, municipal engineers,
            and smart cities to autonomously localize potholes from dashboard cameras, estimate road hazard
            severity, and plot actionable GIS spatial maps.
          </p>
        </div>
      </div>

      {/* System Architecture Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>End-to-End System Architecture</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="font-bold text-white text-sm">Media Ingestion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accepts high-res road photos, frame-by-frame MP4 video streams, and live webcam frames with client-side geolocation metadata.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="font-bold text-white text-sm">YOLOv8 Inference</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anchor-free neural network trained specifically on pothole distress datasets executing CPU/MPS inference under 70ms per frame.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="font-bold text-white text-sm">Severity Heuristics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mathematical bounding-box area ratio formula classifying road distress into Low, Medium, or High repair urgency.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
              04
            </div>
            <h3 className="font-bold text-white text-sm">GIS & PDF Triage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leaflet OpenStreetMap spatial clustering and automated ReportLab PDF audit document generation for municipal contractors.
            </p>
          </div>
        </div>
      </div>

      {/* Mathematical Severity Model */}
      <div className="p-6 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>Severity Classification Heuristic Model</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Severity is determined using bounding-box geometric proportions relative to the camera viewport resolution:
        </p>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300 space-y-2">
          <div>Area Ratio: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A_ratio = (W_box × H_box) / (W_frame × H_frame)</div>
          <div>Max Dimension Ratio: D_max &nbsp;&nbsp;= max(W_box / W_frame, H_box / H_frame)</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <span className="font-bold text-emerald-400 block mb-1">LOW SEVERITY</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              A_ratio &lt; 1.5% and D_max &lt; 14%. Minor surface raveling and early bitumen fissures. Routine quarterly check.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="font-bold text-amber-400 block mb-1">MEDIUM SEVERITY</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              A_ratio ≥ 1.5% or D_max ≥ 14%. Asphalt cavity requiring routine patching within 7 days.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
            <span className="font-bold text-rose-400 block mb-1">HIGH SEVERITY</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              A_ratio ≥ 6.0% or D_max ≥ 30%. Deep hazardous cavity risking vehicular suspension or cyclist safety. Priority repair within 24-48h.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <span>Full-Stack Technology Stack</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Frontend:</b> React 18, Vite 5, Tailwind CSS, Lucide Icons, Recharts</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Backend:</b> Python 3.13, FastAPI, Uvicorn (ASGI REST Architecture)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Deep Learning:</b> Ultralytics YOLOv8s, PyTorch, OpenCV</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Database:</b> SQLite with SQLAlchemy ORM (Persistent relational store)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Spatial GIS:</b> Leaflet.js, OpenStreetMap, HTML5 Geolocation API</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><b>Document Export:</b> ReportLab PDF Generation Library</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-[#1C2541]/70 border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span>Apple Silicon M2 Optimization</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Lightweight YOLOv8s model checkpoint (~21MB) suited for 8GB RAM.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Streaming video processing with frame stride to prevent RAM memory spikes.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Zero external cloud API dependencies; runs 100% locally and offline.</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Singleton pattern keeps deep learning weights resident in CPU memory.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
