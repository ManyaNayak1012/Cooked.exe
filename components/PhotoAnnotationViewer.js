"use client";

import { useState } from "react";

export default function PhotoAnnotationViewer({ imageUrl, annotations = [] }) {
  const [activePin, setActivePin] = useState(0);
  const [showPins, setShowPins] = useState(true);

  if (!imageUrl) return null;

  return (
    <div className="w-full border border-purple/30 bg-[#0B0616] p-4 relative mb-6">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple/20 text-[10px] tracking-widest text-fade">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-magenta animate-pulse" />
          <span className="text-cyan font-semibold">FORENSIC CRIME SCENE AUDIT</span>
          <span className="hidden sm:inline text-fade/60">// PINS OF SHAME</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPins((v) => !v)}
          className="text-magenta hover:underline text-[9px] tracking-widest font-mono"
        >
          {showPins ? "[🎯 HIDE PINS]" : "[🎯 SHOW PINS]"}
        </button>
      </div>

      {/* Interactive Photo Canvas */}
      <div className="relative w-full aspect-[4/3] max-h-[420px] bg-black border border-purple/20 overflow-hidden flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Audited Evidence"
          className="w-full h-full object-contain"
        />

        {/* Scanlines overlay */}
        <div className="scanlines pointer-events-none opacity-40" />

        {/* Target Pins */}
        {showPins &&
          annotations.map((pin, index) => {
            const isActive = activePin === index;
            return (
              <div
                key={pin.id || index}
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
                onClick={() => setActivePin(index)}
              >
                {/* Ripple ring */}
                <div
                  className={`absolute -inset-2 rounded-full border ${
                    isActive ? "border-magenta animate-ping" : "border-cyan/50"
                  }`}
                />

                {/* Pin badge */}
                <div
                  className={`relative flex items-center justify-center w-6 h-6 rounded-full border text-[10px] font-mono font-bold transition-all shadow-lg ${
                    isActive
                      ? "border-magenta bg-magenta text-black shadow-neonMagenta scale-110"
                      : "border-cyan bg-[#070312]/90 text-cyan group-hover:border-magenta"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Floating Tooltip Callout */}
                {isActive && (
                  <div className="absolute left-1/2 -top-2 transform -translate-x-1/2 -translate-y-full w-52 sm:w-60 p-2.5 border border-magenta bg-[#110620]/95 shadow-neonMagenta text-left z-30 pointer-events-none animate-[fadeScale_0.2s_ease-out]">
                    <div className="flex items-center justify-between text-[8px] tracking-widest text-cyan mb-1">
                      <span>CRIME PIN #{index + 1}</span>
                      <span>[TARGET CONFIRMED]</span>
                    </div>
                    <p className="text-[11px] font-bold text-magenta uppercase tracking-wide">
                      {pin.title}
                    </p>
                    <p className="text-[11px] text-ink leading-snug mt-1 font-mono">
                      "{pin.comment}"
                    </p>
                    <div className="w-2 h-2 border-r border-b border-magenta bg-[#110620] absolute -bottom-1 left-1/2 transform -translate-x-1/2 rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Pin Selector Strip */}
      {annotations.length > 0 && showPins && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-purple/15">
          {annotations.map((pin, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActivePin(idx)}
              className={`p-2 text-left border text-[10px] transition-all ${
                activePin === idx
                  ? "border-magenta bg-magenta/15 text-magenta"
                  : "border-purple/20 text-fade hover:text-ink hover:border-purple/50"
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>PIN #{idx + 1}</span>
                <span className="text-[8px] opacity-70">SELECT</span>
              </div>
              <p className="truncate text-[9px] mt-0.5 text-ink/80">{pin.title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
