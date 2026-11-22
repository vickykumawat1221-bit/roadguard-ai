import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  FileText, 
  MapPin, 
  Calendar, 
  Percent, 
  Download, 
  RefreshCw,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { getDetections, deleteDetection, updateLocation, getReportDownloadUrl } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export default function DetectionHistory({ onNavigateToMap }) {
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal State
  const [activeRecord, setActiveRecord] = useState(null);

  // GPS Assignment Modal State
  const [locationModalRecord, setLocationModalRecord] = useState(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editLocName, setEditLocName] = useState('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const data = await getDetections({
        severity: selectedSeverity,
        search: search.trim() || undefined,
        limit: 100
      });
      setRecords(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedSeverity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete Detection Record #${id}? This will remove stored image files.`)) {
      return;
    }
    try {
      await deleteDetection(id);
      setRecords(records.filter(r => r.id !== id));
      setTotalCount(prev => prev - 1);
      if (activeRecord?.id === id) setActiveRecord(null);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const openLocationModal = (record) => {
    setLocationModalRecord(record);
    setEditLat(record.latitude != null ? String(record.latitude) : '');
    setEditLng(record.longitude != null ? String(record.longitude) : '');
    setEditLocName(record.location_name || '');
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!editLat || !editLng) {
      alert('Please enter valid Latitude and Longitude values.');
      return;
    }
    try {
      setIsUpdatingLocation(true);
      const res = await updateLocation({
        detection_id: locationModalRecord.id,
        latitude: parseFloat(editLat),
        longitude: parseFloat(editLng),
        location_name: editLocName.trim() || undefined
      });
      // Update local record
      setRecords(records.map(r => r.id === locationModalRecord.id ? res.detection : r));
      if (activeRecord?.id === locationModalRecord.id) {
        setActiveRecord(res.detection);
      }
      setLocationModalRecord(null);
    } catch (err) {
      alert(`Location update failed: ${err.message}`);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Detection History & Inspection Logs</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {totalCount} Total Scans
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete database of scanned roadways with side-by-side verification and PDF report exports.
          </p>
        </div>

        {/* Search & Severity Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by location or file..."
              className="pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSeverity(s)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                  selectedSeverity === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHistory}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md overflow-hidden">
        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Scan</th>
                  <th className="py-3 px-3">Location / Road Sector</th>
                  <th className="py-3 px-3">Potholes</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">GPS Coordinates</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    {/* Media Thumbnail & ID */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.processed_url}
                          alt="Thumbnail"
                          className="w-14 h-11 rounded-lg object-cover bg-slate-950 border border-slate-800 shrink-0"
                          onError={(e) => { e.target.src = r.image_url; }}
                        />
                        <div>
                          <span className="font-mono font-bold text-white text-xs block">
                            #{r.id}
                          </span>
                          <span className="text-[10px] text-cyan-400 uppercase font-semibold">
                            {r.media_type}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Location Name */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200 line-clamp-1 max-w-[200px]">
                        {r.location_name || 'Untagged Highway Sector'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {r.image_filename}
                      </div>
                    </td>

                    {/* Potholes Count */}
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      {r.total_potholes}
                    </td>

                    {/* Severity Badge */}
                    <td className="py-3 px-3">
                      <SeverityBadge severity={r.overall_severity} size="sm" />
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">
                      {Math.round(r.confidence_score * 100)}%
                    </td>

                    {/* GPS Coordinates */}
                    <td className="py-3 px-3">
                      {r.latitude != null && r.longitude != null ? (
                        <div className="font-mono text-[11px] text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openLocationModal(r)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                        >
                          <PlusCircle className="w-3 h-3" /> Assign GPS
                        </button>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveRecord(r)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="View Details & Side-by-Side"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={getReportDownloadUrl(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition"
                          title="Download PDF Inspection Report"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => openLocationModal(r)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                          title="Edit Location Coordinates"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-sm">
            {isLoading ? 'Loading records...' : 'No detection history found matching current filters.'}
          </div>
        )}
      </div>

      {/* DETAIL MODAL: Original vs Processed side-by-side & BBox Details */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">
                  Detection Inspection Report #{activeRecord.id}
                </h3>
                <SeverityBadge severity={activeRecord.overall_severity} size="md" />
              </div>
              <button
                onClick={() => setActiveRecord(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Side-by-Side Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Original Road Ingest
                </span>
                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                  <img
                    src={activeRecord.image_url}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
                  AI Processed (YOLOv8 Bounding Boxes)
                </span>
                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                  <img
                    src={activeRecord.processed_url}
                    alt="AI Processed"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Total Potholes:</span>
                <span className="text-base font-bold text-white">{activeRecord.total_potholes}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">AI Confidence:</span>
                <span className="text-base font-bold text-cyan-400">{Math.round(activeRecord.confidence_score * 100)}%</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Severity Split:</span>
                <span className="text-base font-bold text-slate-200">
                  {activeRecord.high_severity}H • {activeRecord.medium_severity}M • {activeRecord.low_severity}L
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Location:</span>
                <span className="text-xs font-bold text-slate-200 truncate block">
                  {activeRecord.location_name || 'Untagged'}
                </span>
              </div>
            </div>

            {/* Pothole Coordinates Table */}
            {activeRecord.details && activeRecord.details.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Detailed Pothole Bounding Box Geometry
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[10px]">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Severity</th>
                        <th className="py-2 px-3">Confidence</th>
                        <th className="py-2 px-3">Est. Ø (cm)</th>
                        <th className="py-2 px-3">Depth Profile</th>
                        <th className="py-2 px-3">Box [X1, Y1, X2, Y2]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {activeRecord.details.map((d, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 text-slate-400">#{i + 1}</td>
                          <td className="py-2 px-3 font-sans">
                            <SeverityBadge severity={d.severity} size="sm" />
                          </td>
                          <td className="py-2 px-3 text-cyan-400 font-bold">
                            {Math.round(d.confidence * 100)}%
                          </td>
                          <td className="py-2 px-3 text-amber-300 font-bold">
                            ~{Math.round(d.estimated_diameter_cm || (d.estimated_width_px * 0.25))} cm
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-sans text-[11px]">
                            {d.depth_category || "Moderate (3-6 cm)"}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">
                            [{Math.round(d.bounding_box?.xmin)}, {Math.round(d.bounding_box?.ymin)}, {Math.round(d.bounding_box?.xmax)}, {Math.round(d.bounding_box?.ymax)}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <a
                href={getReportDownloadUrl(activeRecord.id)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF Inspection Report</span>
              </a>

              <div className="flex gap-2">
                {activeRecord.latitude && activeRecord.longitude && onNavigateToMap && (
                  <button
                    onClick={() => {
                      onNavigateToMap(activeRecord);
                      setActiveRecord(null);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View On Map</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveRecord(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GPS ASSIGNMENT MODAL */}
      {locationModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C2541] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Assign Coordinates for #{locationModalRecord.id}</span>
              </h3>
              <button
                onClick={() => setLocationModalRecord(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Assign real-world geographical coordinates to pin this road defect scan to the interactive map.
            </p>

            <form onSubmit={handleSaveLocation} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Latitude (-90 to +90)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  placeholder="e.g. 12.971598"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Longitude (-180 to +180)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  placeholder="e.g. 77.594566"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Roadway Sector / Landmark
                </label>
                <input
                  type="text"
                  value={editLocName}
                  onChange={(e) => setEditLocName(e.target.value)}
                  placeholder="e.g. Ring Road Junction 4"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLocationModalRecord(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLocation}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20"
                >
                  {isUpdatingLocation ? 'Saving...' : 'Save Coordinates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
