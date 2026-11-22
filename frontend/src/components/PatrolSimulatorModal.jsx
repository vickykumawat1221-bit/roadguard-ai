import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, 
  Radio, 
  Gauge, 
  MapPin, 
  Compass, 
  AlertTriangle, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react';
import { uploadImageForDetection } from '../services/api';
import SeverityBadge from './SeverityBadge';

// Sound effect synthesizer using Web Audio API (zero external assets needed)
function playRadarPing(isHigh = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isHigh ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isHigh ? 880 : 587.33, ctx.currentTime); // A5 or D5
    osc.frequency.exponentialRampToValueAtTime(isHigh ? 440 : 293.66, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    // AudioContext blocked or unsupported
  }
}

export default function PatrolSimulatorModal({ isOpen, onClose, onNewDetectionLogged }) {
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speed, setSpeed] = useState(48);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [patrolLog, setPatrolLog] = useState([]);
  const [activeHazardAlert, setActiveHazardAlert] = useState(null);
  const [lastLoggedDetection, setLastLoggedDetection] = useState(null);

  const patrolRoute = [
    {
      imgUrl: '/sample_media/sample_pothole_1.png',
      location: 'Outer Ring Road Arterial, KM 12.4',
      lat: 12.9721,
      lng: 77.5952,
      expected: 'HIGH'
    },
    {
      imgUrl: '/sample_media/sample_pothole_2.png',
      location: 'Koramangala 80ft Inner Corridor, Sec 5',
      lat: 12.9360,
      lng: 77.6255,
      expected: 'MEDIUM'
    },
    {
      imgUrl: '/sample_media/sample_pothole_1.png',
      location: 'Sarjapur Highway Junction, Sector 9',
      lat: 12.9150,
      lng: 77.6320,
      expected: 'HIGH'
    }
  ];

  // Simulated dashcam loop
  useEffect(() => {
    let timer;
    if (isRunning) {
      timer = setInterval(async () => {
        // Vary speed gently
        setSpeed((prev) => Math.floor(45 + Math.random() * 8));

        const nextIdx = (currentFrameIndex + 1) % patrolRoute.length;
        setCurrentFrameIndex(nextIdx);
        const currentTarget = patrolRoute[nextIdx];

        // Trigger real AI scan on the frame
        try {
          const resp = await fetch(currentTarget.imgUrl);
          const blob = await resp.blob();
          const file = new File([blob], `patrol_frame_${Date.now()}.png`, { type: blob.type });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('latitude', currentTarget.lat);
          formData.append('longitude', currentTarget.lng);
          formData.append('location_name', currentTarget.location);
          formData.append('conf_threshold', 0.20);

          const result = await uploadImageForDetection(formData);
          setLastLoggedDetection(result);

          if (result.total_potholes > 0) {
            if (soundEnabled) playRadarPing(result.overall_severity === 'HIGH');
            setActiveHazardAlert({
              severity: result.overall_severity,
              potholes: result.total_potholes,
              location: currentTarget.location,
              conf: result.confidence_score
            });

            setPatrolLog((prev) => [
              {
                time: new Date().toLocaleTimeString(),
                location: currentTarget.location,
                potholes: result.total_potholes,
                severity: result.overall_severity,
                conf: result.confidence_score,
                id: result.id
              },
              ...prev.slice(0, 9)
            ]);

            if (onNewDetectionLogged) onNewDetectionLogged();
          } else {
            setActiveHazardAlert(null);
          }
        } catch (err) {
          console.error('Patrol scan failed:', err);
        }
      }, 3500); // Trigger scan every 3.5 seconds
    } else {
      setActiveHazardAlert(null);
    }

    return () => clearInterval(timer);
  }, [isRunning, currentFrameIndex, soundEnabled]);

  if (!isOpen) return null;

  const currentWaypoint = patrolRoute[currentFrameIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#0B132B] border border-cyan-500/40 rounded-3xl w-full max-w-5xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Mission Control Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Car className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  Autonomous Municipal Patrol Simulator
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-[10px] font-mono font-bold">
                  LIVE DASHCAM HUD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulating AI road inspection patrol vehicle streaming real-time highway telemetrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={soundEnabled ? 'Mute radar ping' : 'Enable audio alerts'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* HUD Content Area */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left: Live Dashcam Feed Viewport (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[16/10] shadow-2xl flex items-center justify-center">
              {/* Dashcam Video/Image Feed */}
              <img
                src={lastLoggedDetection?.processed_url || currentWaypoint.imgUrl}
                alt="Patrol Dashcam"
                className="w-full h-full object-cover transition-all duration-300"
              />

              {/* Cybernetic HUD Radar Overlay Lines */}
              <div className="absolute inset-0 pointer-events-none border-2 border-cyan-500/20 m-2 rounded-xl">
                {/* Crosshairs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-cyan-400/40 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                </div>
                {/* Horizontal scanner beam */}
                {isRunning && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan" />
                )}
              </div>

              {/* Top HUD Telemetry Banner */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none text-xs font-mono">
                <div className="px-3 py-1 rounded-lg bg-black/70 backdrop-blur border border-slate-700/80 text-cyan-400 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  <span>{isRunning ? 'PATROL STREAM ACTIVE' : 'PATROL STANDBY'}</span>
                </div>
                <div className="px-3 py-1 rounded-lg bg-black/70 backdrop-blur border border-slate-700/80 text-white font-bold">
                  {speed} KM/H • 042° NNE
                </div>
              </div>

              {/* Bottom HUD Location Banner */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur border border-slate-700 text-slate-200 font-semibold truncate max-w-xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{currentWaypoint.location}</span>
                </div>

                {activeHazardAlert && (
                  <div className="px-3 py-1.5 rounded-lg bg-rose-600/90 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-rose-600/50 animate-bounce">
                    <ShieldAlert className="w-4 h-4" />
                    <span>CAUTION: {activeHazardAlert.severity} HAZARD!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Patrol Controls Strip */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition ${
                  isRunning
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                    : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25'
                }`}
              >
                {isRunning ? (
                  <>
                    <Square className="w-4 h-4" />
                    <span>Stop Patrol Simulation</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Municipal Patrol Simulation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Telemetry Feeds & Live Log (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Vehicle Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Speedometer
                </span>
                <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                  {speed} <span className="text-xs text-cyan-400 font-sans">km/h</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(speed / 80) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Inference Rate
                </span>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  59.4 <span className="text-xs text-slate-400 font-sans">ms</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block mt-1">
                  Apple Silicon M2 Core
                </span>
              </div>
            </div>

            {/* Live Pothole Ingestion Log */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  Live Patrol Ingest Log
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{patrolLog.length} Events</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {patrolLog.map((log, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-white truncate max-w-[180px]">
                        {log.location}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.time} • Record #{log.id}
                      </span>
                    </div>
                    <SeverityBadge severity={log.severity} size="sm" />
                  </div>
                ))}

                {patrolLog.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Start simulation to stream and detect road defects.
                  </div>
                )}
              </div>
            </div>

            {/* Dispatch Action */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-cyan-500/30 text-xs space-y-2">
              <span className="font-bold text-cyan-300 block">
                ⚡ Automated Triage Automation
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Every hazard logged in simulation is stored in SQLite and plotted directly on the live GIS map.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
