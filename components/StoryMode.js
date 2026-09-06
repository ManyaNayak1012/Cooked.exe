"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { playSound } from "./Soundboard";

export default function StoryMode({ result, mode, userMode, playerName, friendName, onClose, onClapBack }) {
  const lines = result.lines || [];
  // Slides:
  // Slide 0: Archetype intro
  // Slides 1..lines.length: Each hit
  // Slide lines.length + 1: Fatality & Score
  const totalSlides = lines.length + 2;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const SLIDE_DURATION = 4200; // ms per slide

  const nextSlide = useCallback(() => {
    playSound("story_next");
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, totalSlides, onClose]);

  const prevSlide = useCallback(() => {
    playSound("story_next");
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Slide auto-advance timer
  useEffect(() => {
    if (isPaused) return;
    const intervalTime = 50;
    const increment = (intervalTime / SLIDE_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, nextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, onClose]);

  const handlePointerDown = () => setIsPaused(true);
  const handlePointerUp = () => setIsPaused(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050209]/95 backdrop-blur-md select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="scanlines pointer-events-none" />

      {/* Story card frame */}
      <div className="relative w-full max-w-lg h-[92vh] max-h-[780px] crt-frame border border-purple/40 bg-gradient-to-b from-[#110A22] to-[#080410] flex flex-col justify-between p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Top Story Progress Bars */}
        <div className="flex gap-1.5 w-full mb-6 z-20">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-purple/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan transition-all duration-75"
                style={{
                  width:
                    idx < currentIndex
                      ? "100%"
                      : idx === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Control Header */}
        <div className="flex items-center justify-between z-20 text-[10px] tracking-widest text-fade pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-magenta animate-pulse" />
            <span className="text-cyan font-semibold">ROAST.EXE // STORY REVEAL</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fade hover:text-ink text-sm px-2 py-1 font-mono transition-colors"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Story Content Area */}
        <div className="flex-1 flex flex-col justify-center text-center my-auto px-3 z-10">
          
          {/* SLIDE 0: ARCHETYPE */}
          {currentIndex === 0 && (
            <div className="animate-[fadeScale_0.35s_ease-out] space-y-4">
              <span className="text-[10px] tracking-[0.3em] text-cyan border border-cyan/30 px-3 py-1 bg-cyan/5">
                VIBE ARCHETYPE UNLOCKED
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-purple glow-text leading-tight mt-4">
                {result.archetype || result.verdict}
              </h2>
              <p className="text-sm text-fade leading-relaxed max-w-sm mx-auto mt-3">
                {result.archetypeReason || "Classified from questionable digital evidence."}
              </p>
              <div className="pt-6">
                <span className="text-[10px] text-magenta tracking-widest animate-pulse">
                  TAP RIGHT TO REVEAL HITS →
                </span>
              </div>
            </div>
          )}

          {/* SLIDES 1..N: INDIVIDUAL ROAST HITS */}
          {currentIndex >= 1 && currentIndex <= lines.length && (
            <div className="animate-[fadeScale_0.35s_ease-out] space-y-6">
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs font-mono text-cyan px-2.5 py-0.5 border border-cyan/30 bg-cyan/10">
                  HIT {String(currentIndex).padStart(2, "0")} / {String(lines.length).padStart(2, "0")}
                </span>
              </div>

              <blockquote className="font-display text-2xl sm:text-3xl text-ink leading-snug glow-text-magenta px-2">
                "{lines[currentIndex - 1]}"
              </blockquote>

              <p className="text-[11px] text-fade tracking-widest pt-4">
                DAMAGE INFLICTED · AUDITED IN REAL TIME
              </p>
            </div>
          )}

          {/* FINAL SLIDE: FATALITY & SCORE */}
          {currentIndex === totalSlides - 1 && (
            <div className="animate-[fadeScale_0.35s_ease-out] space-y-5">
              <span className="text-[10px] tracking-[0.3em] text-magenta border border-magenta/40 px-3.5 py-1 bg-magenta/10 font-semibold">
                FATALITY CONCLUDED
              </span>

              <p className="font-display text-xl sm:text-2xl text-ink leading-snug glow-text px-2">
                "{result.fatality || lines[lines.length - 1]}"
              </p>

              <div className="py-2">
                <span className="text-5xl font-display text-magenta glow-text-magenta font-bold">
                  {result.score}
                </span>
                <span className="text-xl text-fade">/100</span>
                <p className="text-xs text-cyan tracking-widest mt-1">
                  VERDICT: {result.verdict}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-3 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="focus-ring border border-cyan bg-cyan/20 hover:bg-cyan/40 text-ink py-2.5 text-xs tracking-widest transition-all"
                >
                  VIEW FULL RECEIPT
                </button>
                {onClapBack && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onClapBack();
                    }}
                    className="focus-ring border border-magenta bg-magenta/20 hover:bg-magenta/40 text-ink py-2 text-[11px] tracking-widest transition-all"
                  >
                    🗣️ CLAP BACK TO ROAST
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Transparent tap zones (left: back, right: next) */}
        <div
          className="absolute inset-y-16 left-0 w-1/3 cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          title="Previous slide"
        />
        <div
          className="absolute inset-y-16 right-0 w-2/3 cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          title="Next slide"
        />

        {/* Bottom indicator */}
        <div className="flex items-center justify-between text-[9px] text-fade tracking-widest border-t border-purple/20 pt-3 z-20">
          <span>TAP LEFT / RIGHT TO NAVIGATE</span>
          <span>HOLD TO PAUSE</span>
        </div>
      </div>
    </div>
  );
}
