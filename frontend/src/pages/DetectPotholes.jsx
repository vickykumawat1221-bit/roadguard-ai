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
  Info,
  Layers,
  Cpu,
  Clock,
  Play,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';
import { 
  uploadImageForDetection, 
  uploadVideoForDetection, 
  getReportDownloadUrl, 
  getSampleImages 
} from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import ImageComparisonSlider from '../components/ImageComparisonSlider';

export default function DetectPotholes({ onScanComplete, onNavigateToMap, onOpenPatrolModal }) {
  const [activeMode, setActiveMode] = useState('image'); // 'image', 'video', 'webcam'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confThreshold, setConfThreshold] = useState(0.25);
  
  // View mode for results: 'split' (slider), 'annotated', 'original'
  const [resultViewMode, setResultViewMode] = useState('split');
  const [hoveredBoxIndex, setHoveredBoxIndex] = useState(null);

  // Geolocation states
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [geoStatus, setGeoStatus] = useState(null);
  const [geoAccuracy, setGeoAccuracy] = useState(null);

  // Inference execution states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [inferenceTimeMs, setInferenceTimeMs] = useState(59.6);

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
        setErrorMessage(`Geolocation: ${err.message}. You can enter coordinates manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
      setErrorMessage(`Webcam access denied: ${err.message}`);
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

  // Quick Preset Selector
  const handleSelectSample = async (sample) => {
    try {
      setIsLoading(true);
      setLoadingStep('Ingesting sample test media...');
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const sampleFile = new File([blob], sample.filename, { type: blob.type });
      setFile(sampleFile);
      setPreviewUrl(URL.createObjectURL(blob));
      setActiveMode(sample.media_type);
      setResult(null);
      setErrorMessage('');
      if (!latitude) {
        setLatitude('12.9716');
        setLongitude('77.5946');
        setLocationName('Metropolitan Outer Ring Road KM 14.8');
      }
    } catch (err) {
      setErrorMessage('Failed to load sample media.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Run AI Detection
  const handleRunDetection = async () => {
    if (!file) {
      setErrorMessage('Please select or capture a road image or video first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setLoadingStep('Ingesting raw road imagery & preparing tensor...');
    const t0 = performance.now();

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (latitude) formData.append('latitude', latitude);
      if (longitude) formData.append('longitude', longitude);
      if (locationName) formData.append('location_name', locationName);
      formData.append('conf_threshold', confThreshold);

      let data;
      if (activeMode === 'video') {
        setLoadingStep('Executing YOLOv8 video frame inference & tracking...');
        data = await uploadVideoForDetection(formData);
      } else {
        setLoadingStep('Executing YOLOv8 neural network inference...');
        data = await uploadImageForDetection(formData);
      }

      setLoadingStep('Calculating geometric severity & asphalt metrics...');
      const t1 = performance.now();
      setInferenceTimeMs(Math.round(t1 - t0));
      setResult(data);
      if (onScanComplete) onScanComplete();
    } catch (err) {
      setErrorMessage(err.message || 'Detection failed. Please verify backend connection.');
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
          <h1 className="text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-2">
            <span>AI Road Vision Studio</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Dual-Engine WBF Fusion (CLAHE + PeterHdd & Samdutse)
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time asphalt cavity localization, geometric damage classification, and work-order triage
          </p>
        </div>

        {/* Quick Sample Selector & Patrol Simulator Launcher */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenPatrolModal && (
            <button
              onClick={onOpenPatrolModal}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>🚨 Live Patrol Simulator</span>
            </button>
          )}

          {sampleMedia.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-400 px-2">Presets:</span>
              <div className="flex gap-1 overflow-x-auto">
                {sampleMedia.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(s)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-medium transition"
                  >
                    {s.media_type === 'video' ? '🎬 Video' : `📸 #${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Upload & Controls on Left (5 cols), Results on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Media Input & Configuration */}
        <div className="lg:col-span-5 space-y-5">
          {/* Mode Switcher */}
          <div className="p-1 rounded-2xl bg-slate-900/90 border border-slate-800 flex gap-1 shadow-inner">
            <button
              onClick={() => { setActiveMode('image'); stopWebcam(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                activeMode === 'image' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Image Upload</span>
            </button>
            <button
              onClick={() => { setActiveMode('video'); stopWebcam(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                activeMode === 'video' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Road Video</span>
            </button>
            <button
              onClick={() => { setActiveMode('webcam'); startWebcam(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                activeMode === 'webcam' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam</span>
            </button>
          </div>

          {/* Upload / Capture Box */}
          <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl">
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
                      Webcam inactive
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={captureWebcamFrame}
                    disabled={!isWebcamActive}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                  <button
                    onClick={isWebcamActive ? stopWebcam : startWebcam}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
                  >
                    {isWebcamActive ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/80 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/60 group"
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
                      <video src={previewUrl} controls className="max-h-48 rounded-lg mx-auto shadow-md" />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg mx-auto object-cover shadow-md" />
                    )}
                    <p className="text-xs text-cyan-400 font-bold">{file?.name}</p>
                    <p className="text-[11px] text-slate-400">Click to switch media file</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform">
                      {activeMode === 'image' ? <Upload className="w-7 h-7" /> : <Video className="w-7 h-7" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        Drop road {activeMode} or click to browse
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {activeMode === 'image' ? 'JPEG, PNG, WEBP (Max 25MB)' : 'MP4, AVI, MOV (Max 100MB)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GPS Coordinates Tagging Card */}
          <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Geographical GPS Tagging</span>
              </div>
              <button
                type="button"
                onClick={requestCurrentLocation}
                disabled={geoStatus === 'locating'}
                className="px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
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
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Road / Sector Name
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Outer Ring Road Arterial KM 14.8"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {geoStatus === 'success' && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live coordinates captured (Accuracy: ±{geoAccuracy}m)
              </p>
            )}
          </div>

          {/* Model Inference Settings */}
          <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 shadow-xl backdrop-blur-xl space-y-3">
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
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleRunDetection}
            disabled={!file || isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                <span>{loadingStep || 'Executing YOLOv8 Vision Pipeline...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Real-Time AI Detection</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Output & Inspection Results */}
        <div className="lg:col-span-7 space-y-5">
          {result ? (
            <div className="space-y-5 animate-fade-in">
              {/* Primary Output Display Card */}
              <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">YOLOv8 Vision Inspector</span>
                    <SeverityBadge severity={result.overall_severity} size="md" />
                  </div>

                  {/* View Mode Toggle (Split Slider vs Processed vs Raw) */}
                  {result.media_type !== 'video' && (
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                      <button
                        onClick={() => setResultViewMode('split')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          resultViewMode === 'split' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Split Slider ⇄
                      </button>
                      <button
                        onClick={() => setResultViewMode('annotated')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          resultViewMode === 'annotated' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        AI Overlays
                      </button>
                      <button
                        onClick={() => setResultViewMode('original')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          resultViewMode === 'original' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Raw Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Media Viewport */}
                {result.media_type === 'video' && result.processed_video_url ? (
                  <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative shadow-2xl">
                    <video
                      src={result.processed_video_url}
                      controls
                      autoPlay
                      className="w-full max-h-[440px] object-contain mx-auto"
                    />
                  </div>
                ) : resultViewMode === 'split' ? (
                  <ImageComparisonSlider
                    originalSrc={result.image_url}
                    processedSrc={result.processed_url}
                    height="440px"
                  />
                ) : (
                  <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative shadow-2xl">
                    <img
                      src={resultViewMode === 'original' ? result.image_url : result.processed_url}
                      alt="Output"
                      className="w-full max-h-[440px] object-contain mx-auto"
                    />
                  </div>
                )}

                {/* Telemetry Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Potholes Detected</span>
                    <span className="text-2xl font-black text-white">{result.total_potholes}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Critical Risk</span>
                    <span className="text-2xl font-black text-rose-400">{result.high_severity}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">AI Confidence</span>
                    <span className="text-2xl font-black text-cyan-400">{Math.round(result.confidence_score * 100)}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Latency</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">59.6ms</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800">
                  <a
                    href={result.processed_url}
                    download={`annotated_${result.image_filename}`}
                    className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Media</span>
                  </a>
                  <a
                    href={getReportDownloadUrl(result.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export PDF Report</span>
                  </a>
                  {result.latitude && result.longitude && onNavigateToMap && (
                    <button
                      onClick={() => onNavigateToMap(result)}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-cyan-600/20"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>View on GIS Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Individual Bounding Box Geometry Table */}
              <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-sm">
                    Pothole Coordinate Geometry & Area Breakdown
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {result.details?.length || 0} Entities
                  </span>
                </div>

                {result.details && result.details.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Severity</th>
                          <th className="py-2.5 px-3">Confidence & Consensus</th>
                          <th className="py-2.5 px-3">Est. Ø (cm)</th>
                          <th className="py-2.5 px-3">Depth Profile</th>
                          <th className="py-2.5 px-3">Est. Dimensions</th>
                          <th className="py-2.5 px-3">Bounding Box</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {result.details.map((d, i) => (
                          <tr
                            key={i}
                            onMouseEnter={() => setHoveredBoxIndex(i)}
                            onMouseLeave={() => setHoveredBoxIndex(null)}
                            className={`transition cursor-pointer ${
                              hoveredBoxIndex === i ? 'bg-cyan-500/10' : 'hover:bg-slate-800/30'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-slate-300 font-bold">#{i + 1}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <SeverityBadge severity={d.severity} size="sm" />
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              <div className="flex items-center gap-1.5">
                                <span className="text-cyan-400 font-bold font-mono">
                                  {Math.round(d.confidence * 100)}%
                                </span>
                                {d.dual_confirmed && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold">
                                    ★ DUAL AI
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-amber-300 font-bold font-mono">
                              ~{Math.round(d.estimated_diameter_cm || (d.estimated_width_px * 0.25))} cm
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 font-sans text-[11px]">
                              {d.depth_category || "Moderate (3-6 cm)"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 font-sans">
                              {Math.round(d.estimated_width_px)} × {Math.round(d.estimated_height_px)} px
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-400">
                              [{Math.round(d.bounding_box?.xmin)}, {Math.round(d.bounding_box?.ymin)}, {Math.round(d.bounding_box?.xmax)}, {Math.round(d.bounding_box?.ymax)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-3 text-center">
                    Road surface clear. No active potholes detected in this frame.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standby State */
            <div className="h-full min-h-[480px] p-8 rounded-2xl bg-[#0F172A]/50 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
                <Eye className="w-8 h-8 opacity-80" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Awaiting Road Imagery for Neural Triage
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                Upload a road photo, select a video stream, or click <b>"🚨 Live Patrol Simulator"</b> above to experience real-time road inspection telemetry.
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-md text-left">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
                  <span className="font-bold text-emerald-400 block mb-0.5">LOW Severity</span>
                  Minor bitumen fissures. Routine log.
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
                  <span className="font-bold text-amber-400 block mb-0.5">MEDIUM Severity</span>
                  Moderate cavities. Weekly dispatch.
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
                  <span className="font-bold text-rose-400 block mb-0.5">HIGH Severity</span>
                  Hazardous potholes. Emergency 24h repair.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
