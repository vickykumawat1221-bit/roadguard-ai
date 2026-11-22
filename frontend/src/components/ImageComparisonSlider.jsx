import React, { useState, useRef, useCallback } from 'react';
import { Eye, Sparkles } from 'lucide-react';

export default function ImageComparisonSlider({
  originalSrc,
  processedSrc,
  height = '440px',
  onHoverPothole
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
      style={{ height }}
      className="relative w-full rounded-2xl overflow-hidden select-none cursor-ew-resize bg-slate-950 border border-slate-700/80 shadow-2xl group"
    >
      {/* Background Layer: Processed AI Image */}
      <img
        src={processedSrc}
        alt="AI Annotated"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {/* Foreground Layer: Raw Original Image (Clipped) */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
        }}
      >
        <img
          src={originalSrc}
          alt="Raw Camera"
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* Vertical Divider Line with Glow */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_#38bdf8] pointer-events-none z-10"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Central Draggable Handle */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center justify-center text-cyan-300 pointer-events-auto">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18-6-6 6-6" />
            <path d="m15 6 6 6-6 6" />
          </svg>
        </div>
      </div>

      {/* Floating Mode Labels */}
      <div className="absolute top-3 left-3 pointer-events-none z-20">
        <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
          <Eye className="w-3 h-3 text-slate-400" /> Raw Highway Camera
        </span>
      </div>

      <div className="absolute top-3 right-3 pointer-events-none z-20">
        <span className="px-3 py-1 rounded-full bg-cyan-950/80 backdrop-blur-md border border-cyan-500/40 text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
          <Sparkles className="w-3 h-3 text-cyan-400" /> YOLOv8 Neural Overlays
        </span>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur border border-slate-700 text-[10px] text-slate-400 font-medium">
          Drag horizontally to compare raw vs detected defects
        </span>
      </div>
    </div>
  );
}
