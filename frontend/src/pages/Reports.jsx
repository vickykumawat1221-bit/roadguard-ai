import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';
import { getDetections, getReportDownloadUrl } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    getDetections({ severity: selectedSeverity, limit: 100 })
      .then(data => {
        setReports(data.items || []);
        if (data.items?.length > 0 && !selectedReport) {
          setSelectedReport(data.items[0]);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedSeverity]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Road Infrastructure Damage Reports</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              PDF Export Center
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated compliance reports formatted for municipal public works & highway repair contractors.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSeverity(s)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedSeverity === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout: List on Left, Live Preview Document on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Report List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3.5 rounded-xl bg-[#1C2541]/70 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Available Inspection Records: <b>{reports.length}</b></span>
            <span className="text-[11px] text-cyan-400 font-mono">ReportLab PDF Engine</span>
          </div>

          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {reports.map((r) => {
              const isSelected = selectedReport?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                      : 'bg-[#1C2541]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        #RG-{r.id}
                      </span>
                      <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
                        {r.location_name || `Road Sector #${r.id}`}
                      </h4>
                    </div>
                    <SeverityBadge severity={r.overall_severity} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-slate-300">
                      {r.total_potholes} Pothole{r.total_potholes === 1 ? '' : 's'} ({Math.round(r.confidence_score * 100)}% Conf)
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {r.latitude && r.longitude ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}` : 'Untagged GPS'}
                    </span>
                    <a
                      href={getReportDownloadUrl(r.id)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </a>
                  </div>
                </div>
              );
            })}

            {reports.length === 0 && !isLoading && (
              <div className="p-8 text-center text-slate-400 text-xs rounded-xl bg-slate-900/40 border border-dashed border-slate-800">
                No reports found matching the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Interactive Report Preview Document (7 cols) */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-2xl space-y-5 border border-slate-300 font-sans">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-2 border-[#1E6091] pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#0B132B] tracking-tight">
                    RoadGuard AI
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    Intelligent Road Damage Detection & Infrastructure Triage System
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-slate-100 font-bold text-xs text-[#0B132B]">
                    OFFICIAL REPORT #RG-{selectedReport.id}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Potholes</span>
                  <span className="text-lg font-black text-[#0B132B]">{selectedReport.total_potholes}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Severity</span>
                  <span className={`text-base font-black ${
                    selectedReport.overall_severity === 'HIGH' ? 'text-rose-600' : (selectedReport.overall_severity === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600')
                  }`}>
                    {selectedReport.overall_severity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">AI Confidence</span>
                  <span className="text-lg font-black text-blue-700">{Math.round(selectedReport.confidence_score * 100)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">H / M / L</span>
                  <span className="text-sm font-bold text-slate-700">
                    {selectedReport.high_severity} / {selectedReport.medium_severity} / {selectedReport.low_severity}
                  </span>
                </div>
              </div>

              {/* Geographical Coordinates */}
              <div className="text-xs space-y-1 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Location Tag:</span>
                  <span className="font-bold text-slate-900">{selectedReport.location_name || 'Highway Sector'}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="font-semibold text-slate-500 font-sans">Geo-Coordinates:</span>
                  <span className="text-blue-700 font-bold">
                    {selectedReport.latitude && selectedReport.longitude ? `${selectedReport.latitude.toFixed(6)}, ${selectedReport.longitude.toFixed(6)}` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Visual Evidence Comparison */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1E6091] uppercase tracking-wider">
                  Visual Evidence & Damage Localization
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Raw Image</span>
                    <img
                      src={selectedReport.image_url}
                      alt="Raw"
                      className="w-full h-36 object-cover rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-blue-700 block mb-1">AI Processed (YOLOv8)</span>
                    <img
                      src={selectedReport.processed_url}
                      alt="Processed"
                      className="w-full h-36 object-cover rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Action Recommendation */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold block mb-0.5">Municipal Action Triage:</span>
                {selectedReport.overall_severity === 'HIGH' && (
                  <span>CRITICAL PRIORITY: Cold-patch resurfacing and warning cones required within 24-48 hours.</span>
                )}
                {selectedReport.overall_severity === 'MEDIUM' && (
                  <span>SCHEDULED REPAIR: Asphalt fissure sealing recommended during weekly maintenance route.</span>
                )}
                {selectedReport.overall_severity === 'LOW' && (
                  <span>ROUTINE AUDIT: Logged for continuous observation during quarterly road inspection cycle.</span>
                )}
              </div>

              {/* Download Buttons Bar */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <span className="text-[11px] text-slate-500">
                  Generated by YOLOv8 Computer Vision Pipeline
                </span>
                <a
                  href={getReportDownloadUrl(selectedReport.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-[#0B132B] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Complete PDF</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] rounded-2xl bg-[#1C2541]/40 border border-dashed border-slate-800 flex items-center justify-center text-slate-400 text-xs">
              Select a report from the list to preview the document.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
