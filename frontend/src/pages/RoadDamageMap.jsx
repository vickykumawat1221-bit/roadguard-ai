import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Filter, 
  Layers, 
  Navigation, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { getMapLocations, getReportDownloadUrl } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

// Create custom colored SVG marker icons for Leaflet
function createCustomPin(severity) {
  let color = '#10B981'; // LOW
  if (severity === 'HIGH') color = '#EF4444';
  if (severity === 'MEDIUM') color = '#F59E0B';

  const svgHtml = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${color};
        opacity: 0.25;
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
      ">
        !
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-map-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export default function RoadDamageMap({ initialFocusLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const loadLocations = async (sev = selectedSeverity) => {
    try {
      setIsLoading(true);
      const data = await getMapLocations(sev);
      setLocations(data.locations || []);
    } catch (err) {
      console.error('Failed to load map locations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLocations(selectedSeverity);
  }, [selectedSeverity]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: India/Bengaluru corridor or fallback
      const defaultCenter = [12.9716, 77.5946];
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap standard tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const bounds = L.latLngBounds();

    locations.forEach((loc) => {
      if (loc.latitude == null || loc.longitude == null) return;

      const latLng = [loc.latitude, loc.longitude];
      bounds.extend(latLng);

      const marker = L.marker(latLng, {
        icon: createCustomPin(loc.overall_severity),
      });

      // Interactive popup
      const popupContent = `
        <div style="min-width: 220px; font-family: inherit;">
          <div style="margin-bottom: 8px; border-radius: 8px; overflow: hidden; background: #0B132B; max-height: 120px;">
            <img src="${loc.processed_url}" alt="Road Defect" style="width: 100%; height: 100px; object-fit: cover;" onerror="this.src='${loc.image_url}'" />
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 2px;">
            ${loc.location_name || `Sector ID #${loc.id}`}
          </div>
          <div style="font-size: 11px; color: #94A3B8; margin-bottom: 6px;">
            GPS: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-bottom: 8px; padding-top: 6px; border-top: 1px solid #334155;">
            <span style="color: #38BDF8; font-weight: 600;">${loc.total_potholes} Pothole(s)</span>
            <span style="color: #CBD5E1;">${Math.round(loc.confidence_score * 100)}% Conf</span>
          </div>
          <a href="${getReportDownloadUrl(loc.id)}" target="_blank" style="
            display: block;
            text-align: center;
            background: #2563EB;
            color: #ffffff;
            font-size: 11px;
            font-weight: 600;
            padding: 6px 10px;
            border-radius: 6px;
            text-decoration: none;
          ">
            Export PDF Report
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => setSelectedLocation(loc));
      markersLayerRef.current.addLayer(marker);
    });

    // Auto-fit map to markers if points exist
    if (locations.length > 0 && bounds.isValid()) {
      if (initialFocusLocation && initialFocusLocation.latitude && initialFocusLocation.longitude) {
        mapInstanceRef.current.setView([initialFocusLocation.latitude, initialFocusLocation.longitude], 15);
      } else {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [locations, initialFocusLocation]);

  const highCount = locations.filter(l => l.overall_severity === 'HIGH').length;
  const medCount = locations.filter(l => l.overall_severity === 'MEDIUM').length;
  const lowCount = locations.filter(l => l.overall_severity === 'LOW').length;

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-2xl bg-[#1C2541]/80 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Road Damage Spatial GIS Map</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {locations.length} Points
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Interactive OpenStreetMap tracking real-world pothole coordinates and hazard severity
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              selectedSeverity === 'ALL' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({locations.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('HIGH')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
              selectedSeverity === 'HIGH' ? 'bg-rose-600 text-white font-bold' : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" /> High ({highCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('MEDIUM')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
              selectedSeverity === 'MEDIUM' ? 'bg-amber-600 text-white font-bold' : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Med ({medCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('LOW')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
              selectedSeverity === 'LOW' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Low ({lowCount})
          </button>
        </div>

        {/* Recenter & Reload */}
        <button
          onClick={() => loadLocations(selectedSeverity)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Map</span>
        </button>
      </div>

      {/* Map & Detail Panel */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-xl shadow-2xl text-xs space-y-2 pointer-events-auto">
          <span className="text-[11px] font-bold text-slate-300 block border-b border-slate-800 pb-1">
            Severity Pin Legend
          </span>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
            <span>High Risk (Emergency Repair)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
            <span>Medium (Scheduled Resurfacing)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
            <span>Low (Routine Monitoring)</span>
          </div>
        </div>

        {/* Selected Location Card Flyout */}
        {selectedLocation && (
          <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-96 z-10 bg-slate-900/95 backdrop-blur border border-cyan-500/40 p-4 rounded-2xl shadow-2xl space-y-3 pointer-events-auto animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={selectedLocation.overall_severity} size="sm" />
                <span className="text-xs font-mono text-slate-400">ID #{selectedLocation.id}</span>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3">
              <img
                src={selectedLocation.processed_url}
                alt="Pothole"
                className="w-24 h-20 rounded-lg object-cover bg-slate-950 shrink-0 border border-slate-800"
                onError={(e) => { e.target.src = selectedLocation.image_url; }}
              />
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs leading-snug line-clamp-2">
                  {selectedLocation.location_name || `Road Sector #${selectedLocation.id}`}
                </h4>
                <p className="text-[11px] font-mono text-cyan-400">
                  {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                </p>
                <p className="text-[11px] text-slate-300">
                  Detected: <b className="text-white">{selectedLocation.total_potholes}</b> pothole(s) • {Math.round(selectedLocation.confidence_score * 100)}% Conf
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href={getReportDownloadUrl(selectedLocation.id)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Report</span>
              </a>
              <a
                href={`https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Maps</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
