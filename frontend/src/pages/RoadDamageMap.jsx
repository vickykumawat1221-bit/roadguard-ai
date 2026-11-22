import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Filter, 
  Navigation, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  ExternalLink,
  RefreshCw,
  Download,
  Route,
  Compass,
  Layers
} from 'lucide-react';
import { getMapLocations, getReportDownloadUrl, getCsvExportUrl } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

// High-tech glowing neon pins
function createCustomPin(severity, isSelected = false) {
  let color = '#10B981'; // LOW
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  if (severity === 'HIGH') {
    color = '#EF4444';
    glowColor = 'rgba(239, 68, 68, 0.5)';
  } else if (severity === 'MEDIUM') {
    color = '#F59E0B';
    glowColor = 'rgba(245, 158, 11, 0.45)';
  }

  const size = isSelected ? 38 : 30;

  const svgHtml = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: ${color};
        opacity: 0.35;
        box-shadow: 0 0 16px ${glowColor};
        animation: pulse 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: ${size * 0.75}px;
        height: ${size * 0.75}px;
        border-radius: 50%;
        background: radial-gradient(circle, #ffffff 15%, ${color} 85%);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px ${glowColor};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0B132B;
        font-weight: 900;
        font-size: 11px;
      ">
        !
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function RoadDamageMap({ initialFocusLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showInspectionRoute, setShowInspectionRoute] = useState(true);
  const [mapTheme, setMapTheme] = useState('dark'); // 'dark' or 'satellite'

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

  // Initialize High-Tech CartoDB Dark Matter Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter = [12.9716, 77.5946];
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Dark Matter Tiles (High-end Cyberpunk / Smart City Look)
      const tileUrl = mapTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tiles = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapTheme]);

  // Update Markers & Connect Inspection Route
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !routeLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routeLayerRef.current.clearLayers();
    const bounds = L.latLngBounds();
    const routeCoordinates = [];

    locations.forEach((loc) => {
      if (loc.latitude == null || loc.longitude == null) return;

      const latLng = [loc.latitude, loc.longitude];
      bounds.extend(latLng);
      routeCoordinates.push(latLng);

      const isSelected = selectedLocation?.id === loc.id;
      const marker = L.marker(latLng, {
        icon: createCustomPin(loc.overall_severity, isSelected),
      });

      // Interactive popup
      const popupContent = `
        <div style="min-width: 240px; font-family: inherit; padding: 4px;">
          <div style="margin-bottom: 8px; border-radius: 8px; overflow: hidden; background: #080D1A; max-height: 120px; border: 1px solid #334155;">
            <img src="${loc.processed_url}" alt="Damage Frame" style="width: 100%; height: 110px; object-fit: cover;" onerror="this.src='${loc.image_url}'" />
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #FFFFFF; margin-bottom: 2px;">
            ${loc.location_name || `Sector ID #${loc.id}`}
          </div>
          <div style="font-size: 10px; color: #38BDF8; font-family: monospace; margin-bottom: 8px;">
            LAT: ${loc.latitude.toFixed(5)} • LNG: ${loc.longitude.toFixed(5)}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-bottom: 10px; padding: 6px; background: #0F172A; border-radius: 6px; border: 1px solid #1E293B;">
            <span style="color: #38BDF8; font-weight: bold;">${loc.total_potholes} Pothole(s)</span>
            <span style="color: #94A3B8;">${Math.round(loc.confidence_score * 100)}% Confidence</span>
          </div>
          <a href="${getReportDownloadUrl(loc.id)}" target="_blank" style="
            display: block;
            text-align: center;
            background: linear-gradient(to right, #2563EB, #0284C7);
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 8px 12px;
            border-radius: 8px;
            text-decoration: none;
            box-shadow: 0 4px 10px rgba(37,99,235,0.3);
          ">
            Download PDF Report
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => setSelectedLocation(loc));
      markersLayerRef.current.addLayer(marker);
    });

    // Draw connecting inspection patrol route polyline
    if (showInspectionRoute && routeCoordinates.length > 1) {
      const polyline = L.polyline(routeCoordinates, {
        color: '#38BDF8',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8',
      });
      routeLayerRef.current.addLayer(polyline);
    }

    // Auto-fit bounds
    if (locations.length > 0 && bounds.isValid()) {
      if (initialFocusLocation && initialFocusLocation.latitude && initialFocusLocation.longitude) {
        mapInstanceRef.current.setView([initialFocusLocation.latitude, initialFocusLocation.longitude], 15);
      } else {
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    }
  }, [locations, initialFocusLocation, selectedLocation, showInspectionRoute]);

  const highCount = locations.filter(l => l.overall_severity === 'HIGH').length;
  const medCount = locations.filter(l => l.overall_severity === 'MEDIUM').length;
  const lowCount = locations.filter(l => l.overall_severity === 'LOW').length;

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      {/* Top Operations Center Header */}
      <div className="p-4 rounded-2xl bg-[#0F172A]/90 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                Municipal GIS Spatial Command Map
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold">
                CartoDB Dark Matter
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live spatial coordinates tracking active asphalt hazard clusters across municipal sectors
            </p>
          </div>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter:
          </span>
          <button
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              selectedSeverity === 'ALL' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({locations.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('HIGH')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              selectedSeverity === 'HIGH' ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30' : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" /> High ({highCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('MEDIUM')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              selectedSeverity === 'MEDIUM' ? 'bg-amber-600 text-white font-bold shadow-lg shadow-amber-600/30' : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Med ({medCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('LOW')}
            className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              selectedSeverity === 'LOW' ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30' : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Low ({lowCount})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Route toggle */}
          <button
            onClick={() => setShowInspectionRoute(!showInspectionRoute)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              showInspectionRoute
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle municipal inspection route path"
          >
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Patrol Route</span>
          </button>

          {/* CSV Export */}
          <a
            href={getCsvExportUrl()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            title="Export GIS Telemetry CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">GIS CSV</span>
          </a>

          {/* Sync */}
          <button
            onClick={() => loadLocations(selectedSeverity)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Smart City Telemetry Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-slate-950/85 backdrop-blur-xl border border-slate-700/60 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 pointer-events-auto max-w-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Live Heat Pins
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{locations.length} Points</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#ef4444]" />
                Critical Priority (Emergency)
              </span>
              <b className="text-white font-mono">{highCount}</b>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                Medium Damage (Scheduled)
              </span>
              <b className="text-white font-mono">{medCount}</b>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                Minor Surface Fissure
              </span>
              <b className="text-white font-mono">{lowCount}</b>
            </div>
          </div>
        </div>

        {/* Selected Location Flyout Card */}
        {selectedLocation && (
          <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-96 z-10 bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/50 p-4 rounded-2xl shadow-2xl space-y-3 pointer-events-auto animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={selectedLocation.overall_severity} size="sm" />
                <span className="text-xs font-mono text-cyan-400 font-bold">Record #{selectedLocation.id}</span>
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3">
              <img
                src={selectedLocation.processed_url}
                alt="Pothole"
                className="w-28 h-22 rounded-xl object-cover bg-slate-950 shrink-0 border border-slate-700/80 shadow"
                onError={(e) => { e.target.src = selectedLocation.image_url; }}
              />
              <div className="space-y-1">
                <h4 className="font-extrabold text-white text-xs leading-snug line-clamp-2">
                  {selectedLocation.location_name || `Road Sector #${selectedLocation.id}`}
                </h4>
                <p className="text-[10px] font-mono text-cyan-400">
                  {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                </p>
                <div className="text-[11px] text-slate-300 font-medium">
                  Detected: <b className="text-white">{selectedLocation.total_potholes}</b> pothole(s) • <span className="text-cyan-300 font-mono">{Math.round(selectedLocation.confidence_score * 100)}% Conf</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1 border-t border-slate-800/80">
              <a
                href={getReportDownloadUrl(selectedLocation.id)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </a>
              <a
                href={`https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Maps</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
