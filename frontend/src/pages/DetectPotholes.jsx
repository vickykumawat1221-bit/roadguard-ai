import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Video, 
  Camera, 
  MapPin, 
  Navigation, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Download, 
  FileText, 
  Eye, 
  RefreshCw, 
  Sparkles,
  Info
} from 'lucide-react';
import { 
  uploadImageForDetection, 
  uploadVideoForDetection, 
  getReportDownloadUrl, 
  getSampleImages 
} from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export default function DetectPotholes({ onScanComplete, onNavigateToMap }) {
  const [activeMode, setActiveMode] = useState('image'); // 'image', 'video', 'webcam'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confThreshold, setConfThreshold] = useState(0.25);
  
  // Geolocation states
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [geoStatus, setGeoStatus] = useState(null); // 'locating', 'success', 'error'
  const [geoAccuracy, setGeoAccuracy] = useState(null);

  // Inference execution states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);

  // Webcam states
  const videoRef = useRef(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);

  // Sample media list
  const [sampleMedia, setSampleMedia] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getSampleImages()
      .then(data => setSampleMedia(data.samples || []))
      .catch(() => {});

    return () => {
      // Clean up webcam stream on unmount
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle Geolocation
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setErrorMessage('Browser Geolocation is not supported on this device.');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoAccuracy(Math.round(pos.coords.accuracy));
        setGeoStatus('success');
        if (!locationName) {
          setLocationName(`Current GPS Fix (±${Math.round(pos.coords.accuracy)}m)`);
        }
      },
      (err) => {
        setGeoStatus('error');
        setErrorMessage(`Geolocation error: ${err.message}. You can enter coordinates manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setResult(null);
      setErrorMessage('');
    }
  };

  // Webcam Controls
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setWebcamStream(stream);
      setIsWebcamActive(true);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(`Webcam access denied or unavailable: ${err.message}`);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamActive(false);
  };

  const captureWebcamFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `webcam_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        setPreviewUrl(URL.createObjectURL(blob));
        stopWebcam();
        setActiveMode('image');
      }
    }, 'image/jpeg', 0.95);
  };

  // Quick Load Sample Image
  const handleSelectSample = async (sample) => {
    try {
      setIsLoading(true);
      setLoadingStep('Fetching sample test media...');
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const sampleFile = new File([blob], sample.filename, { type: blob.type });
      setFile(sampleFile);
      setPreviewUrl(URL.createObjectURL(blob));
      setActiveMode(sample.media_type);
      setResult(null);
      setErrorMessage('');
      // Preset coordinates for realistic smart-city demo
      if (!latitude) {
        setLatitude('12.9716');
        setLongitude('77.5946');
        setLocationName('Metropolitan Outer Ring Road');
      }
    } catch (err) {
      setErrorMessage('Failed to load sample media.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Execute AI Detection
  const handleRunDetection = async () => {
    if (!file) {
      setErrorMessage('Please select or capture a road image or video first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setLoadingStep('Ingesting road imagery & preparing tensor...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      if (locationName) formData.append('location_name', locationName);
      formData.append('conf_threshold', confThreshold);

      let data;
      if (activeMode === 'video') {
        setLoadingStep('Running YOLOv8 video frame inference & tracking...');
        data = await uploadVideoForDetection(formData);
      } else {
        setLoadingStep('Executing YOLOv8 neural network inference...');
        data = await uploadImageForDetection(formData);
      }

      setLoadingStep('Evaluating visual severity heuristics...');
      setResult(data);
      if (onScanComplete) onScanComplete();
    } catch (err) {
      setErrorMessage(err.message || 'Detection failed. Please check backend connection.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>AI Pothole Detection Studio</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold">
              YOLOv8 Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload highway images, traffic camera clips, or live webcam feeds for automated road defect classification.
          </p>
        </div>

        {/* Quick Sample Selector */}
        {sampleMedia.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-2 rounded-xl">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
            <span className="text-xs font-semibold text-slate-300">Quick Test:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {sampleMedia.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(s)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-medium transition"
                >
                  {s.media_type === 'video' ? '🎬' : '📸'} {s.filename.replace('.png', '').replace('.jpg', '').replace('.mp4', '')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Upload & Inputs on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media Input & Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Mode Switcher */}
          <div className="p-1 rounded-xl bg-slate-900/90 border border-slate-800 flex gap-1">
            <button
              onClick={() => { setActiveMode('image'); stopWebcam(); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                activeMode === 'image' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Image Upload</span>
            </button>
            <button
              onClick={() => { setActiveMode('video'); stopWebcam(); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                activeMode === 'video' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Road Video</span>
            </button>
            <button
              onClick={() => { setActiveMode('webcam'); startWebcam(); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                activeMode === 'webcam' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam</span>
            </button>
          </div>

          {/* Upload / Capture Box */}
          <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md">
            {activeMode === 'webcam' ? (
              <div className="space-y-4 text-center">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isWebcamActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-400 text-xs">
                      Webcam inactive or disconnected
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={captureWebcamFrame}
                    disabled={!isWebcamActive}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                  <button
                    onClick={isWebcamActive ? stopWebcam : startWebcam}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
                  >
                    {isWebcamActive ? 'Stop Camera' : 'Start Camera'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/60"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={activeMode === 'image' ? 'image/png,image/jpeg,image/webp,image/bmp' : 'video/mp4,video/mov,video/avi'}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-2">
                    {activeMode === 'video' ? (
                      <video src={previewUrl} controls className="max-h-48 rounded-lg mx-auto" />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg mx-auto object-cover" />
                    )}
                    <p className="text-xs text-cyan-400 font-semibold">{file?.name}</p>
                    <p className="text-[11px] text-slate-400">Click to choose a different file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                      {activeMode === 'image' ? <Upload className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      Drop road {activeMode} or click to browse
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeMode === 'image' ? 'JPEG, PNG, WEBP (Max 25MB)' : 'MP4, AVI, MOV (Max 100MB)'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GPS Coordinates Tagging Card */}
          <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Geographical GPS Tagging</span>
              </div>
              <button
                type="button"
                onClick={requestCurrentLocation}
                disabled={geoStatus === 'locating'}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Navigation className={`w-3 h-3 ${geoStatus === 'locating' ? 'animate-spin' : ''}`} />
                <span>{geoStatus === 'locating' ? 'Locating...' : 'Use My GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Latitude (-90 to +90)
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 12.971598"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Longitude (-180 to +180)
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. 77.594566"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Road / Sector Name (Optional)
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. MG Road East Corridor, KM 14.2"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {geoStatus === 'success' && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live coordinates captured (Accuracy: ±{geoAccuracy}m)
              </p>
            )}
          </div>

          {/* Model Inference Settings */}
          <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Confidence Threshold
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {Math.round(confThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={confThreshold}
              onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Higher Recall (10%)</span>
              <span>Balanced (25%)</span>
              <span>High Precision (80%)</span>
            </div>
          </div>

          {/* Action Button */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleRunDetection}
            disabled={!file || isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{loadingStep || 'Processing AI Vision...'}</span>
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4" />
                <span>Run Real-Time AI Detection</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Output & Inspection Results (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {result ? (
            <div className="space-y-5">
              {/* Primary Output Image Card */}
              <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">YOLOv8 Detection Output</span>
                    <SeverityBadge severity={result.overall_severity} size="md" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Record ID: #{result.id}
                  </span>
                </div>

                {/* Processed Media Display */}
                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                  {result.media_type === 'video' && result.processed_video_url ? (
                    <video
                      src={result.processed_video_url}
                      controls
                      autoPlay
                      className="w-full max-h-[420px] object-contain mx-auto"
                    />
                  ) : (
                    <img
                      src={result.processed_url}
                      alt="AI Processed Road"
                      className="w-full max-h-[420px] object-contain mx-auto"
                    />
                  )}
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Detected</span>
                    <span className="text-xl font-black text-white">{result.total_potholes}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">High Severity</span>
                    <span className="text-xl font-black text-rose-400">{result.high_severity}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Medium Severity</span>
                    <span className="text-xl font-black text-amber-400">{result.medium_severity}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">AI Confidence</span>
                    <span className="text-xl font-black text-cyan-400">{Math.round(result.confidence_score * 100)}%</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
                  <a
                    href={result.processed_url}
                    download={`annotated_${result.image_filename}`}
                    className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Media</span>
                  </a>
                  <a
                    href={getReportDownloadUrl(result.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export PDF Report</span>
                  </a>
                  {result.latitude && result.longitude && onNavigateToMap && (
                    <button
                      onClick={() => onNavigateToMap(result)}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-cyan-600/20"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>View on Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Individual Bounding Box Details Table */}
              <div className="p-5 rounded-2xl bg-[#1C2541]/70 border border-slate-800/90 shadow-md">
                <h3 className="font-bold text-white text-sm mb-3">
                  Pothole Coordinate Inventory & Dimensions
                </h3>

                {result.details && result.details.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="pb-2">#</th>
                          <th className="pb-2">Severity</th>
                          <th className="pb-2">Confidence</th>
                          <th className="pb-2">Area Ratio</th>
                          <th className="pb-2">Dimensions (WxH)</th>
                          <th className="pb-2">Bounding Box (X1, Y1, X2, Y2)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {result.details.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="py-2.5 text-slate-300">#{i + 1}</td>
                            <td className="py-2.5 font-sans">
                              <SeverityBadge severity={d.severity} size="sm" />
                            </td>
                            <td className="py-2.5 text-slate-200">
                              {Math.round(d.confidence * 100)}%
                            </td>
                            <td className="py-2.5 text-slate-300">
                              {(d.area_ratio * 100).toFixed(2)}%
                            </td>
                            <td className="py-2.5 text-slate-300 font-sans">
                              {Math.round(d.estimated_width_px)} × {Math.round(d.estimated_height_px)} px
                            </td>
                            <td className="py-2.5 text-[11px] text-slate-400">
                              [{Math.round(d.bounding_box?.xmin)}, {Math.round(d.bounding_box?.ymin)}, {Math.round(d.bounding_box?.xmax)}, {Math.round(d.bounding_box?.ymax)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-3">
                    Road surface clear. No active potholes detected in this frame.
                  </div>
                )}
              </div>

              {/* Heuristic Safety Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <b>Heuristic Notice:</b> Severity classification is estimated from bounding-box frame area
                  occupancy and geometric proportions. It is intended as an automated triage tool for municipal
                  road maintenance planning and is not an engineering-grade road safety structural audit.
                </p>
              </div>
            </div>
          ) : (
            /* Standby Placeholder */
            <div className="h-full min-h-[460px] p-8 rounded-2xl bg-[#1C2541]/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 opacity-80" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Awaiting Road Imagery for Analysis
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                Choose an image, upload a video, or click one of the quick test sample presets above to run
                real-time YOLOv8 bounding box detection and severity heuristics.
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-left">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
                  <span className="font-semibold text-emerald-400 block mb-0.5">LOW Severity</span>
                  Small asphalt indentations & fissures.
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
                  <span className="font-semibold text-amber-400 block mb-0.5">MEDIUM Severity</span>
                  Moderate asphalt surface cavities.
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
                  <span className="font-semibold text-rose-400 block mb-0.5">HIGH Severity</span>
                  Large hazardous road potholes.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanLine(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" x2="17" y1="12" y2="12" />
    </svg>
  );
}
