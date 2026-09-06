"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const LEGENDARY_ROASTS = [
  {
    hook: "Someone stepped into this chair with absolute confidence.",
    punchline:
      "The machine took one look and printed: 'You look like your entire personality is sponsored by an iced oat latte you can't afford and a podcast you don't actually understand.'",
    damage: "100/100",
    victim: "UNFORTUNATE TECH BRO",
  },
  {
    hook: "A user swore their digital footprint was completely unroastable.",
    punchline:
      "ROAST.EXE inspected their Spotify and replied: 'Your top artists aren't music taste — they're an emergency distress flare for an emotional intervention.'",
    damage: "99/100",
    victim: "SPOTIFY SURVIVOR",
  },
  {
    hook: "They uploaded a selfie thinking they looked untouchable.",
    punchline:
      "The engine delivered in 0.4 seconds: 'You radiate the exact chaotic frequency of someone with 73 open browser tabs and zero peace of mind.'",
    damage: "100/100",
    victim: "CHRONICALLY ONLINE",
  },
];

export default function SuspenseIntro({ onComplete }) {
  const [roastIndex, setRoastIndex] = useState(0);
  const [stage, setStage] = useState(0);
  // stage:
  // 0: CRT power on
  // 1: Hook typing
  // 2: Suspense pause (holding breath)
  // 3: Devastating punchline reveal
  // 4: Final challenge & countdown to homepage

  const [typedHook, setTypedHook] = useState("");
  const [typedPunchline, setTypedPunchline] = useState("");
  const [exiting, setExiting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef(null);

  const currentRoast = LEGENDARY_ROASTS[roastIndex];

  // Subtle web audio sound synthesis (safe, optional, zero assets)
  const playSound = useCallback((freq = 440, type = "sine", duration = 0.08) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [soundEnabled]);

  const handleFinish = useCallback(() => {
    playSound(880, "triangle", 0.15);
    setExiting(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("roast_intro_completed", "true");
        } catch {}
      }
      onComplete();
    }, 450);
  }, [onComplete, playSound]);

  // Stage sequence controller
  useEffect(() => {
    // Stage 0 -> 1 after 400ms
    const t0 = setTimeout(() => {
      setStage(1);
    }, 400);

    return () => clearTimeout(t0);
  }, [roastIndex]);

  // Stage 1: Typing out Hook
  useEffect(() => {
    if (stage !== 1) return;
    const fullText = currentRoast.hook;
    let i = 0;
    setTypedHook("");
    const interval = setInterval(() => {
      i++;
      setTypedHook(fullText.slice(0, i));
      if (i % 3 === 0) playSound(600 + (i % 6) * 40, "sine", 0.03);
      if (i >= fullText.length) {
        clearInterval(interval);
        // Transition to Stage 2 (Suspense Pause) after 600ms
        setTimeout(() => setStage(2), 650);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [stage, currentRoast, playSound]);

  // Stage 2: The Suspense Pause
  useEffect(() => {
    if (stage !== 2) return;
    // Suspense pause builds tension for 1600ms
    playSound(220, "sawtooth", 0.25);
    const timer = setTimeout(() => {
      setStage(3);
    }, 1800);

    return () => clearTimeout(timer);
  }, [stage, playSound]);

  // Stage 3: Reveal the Punchline
  useEffect(() => {
    if (stage !== 3) return;
    const fullText = currentRoast.punchline;
    let i = 0;
    setTypedPunchline("");
    playSound(440, "square", 0.12);
    const interval = setInterval(() => {
      i += 2;
      setTypedPunchline(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => setStage(4), 1000);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [stage, currentRoast, playSound]);

  // Stage 4: Auto-transition countdown
  useEffect(() => {
    if (stage !== 4) return;
    const autoTimer = setTimeout(() => {
      handleFinish();
    }, 3800);

    return () => clearTimeout(autoTimer);
  }, [stage, handleFinish]);

  const nextRoast = () => {
    setRoastIndex((prev) => (prev + 1) % LEGENDARY_ROASTS.length);
    setStage(0);
    setTypedHook("");
    setTypedPunchline("");
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-[#040207] text-[#EDE7F6] transition-all duration-500 select-none ${
        exiting ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100"
      }`}
    >
      {/* Background ambient CRT lines & glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(176,38,255,0.18),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_90%,rgba(255,46,154,0.12),transparent)] pointer-events-none" />
      <div className="scanlines" />

      {/* Main Suspense Frame */}
      <div className="relative w-full max-w-2xl crt-frame boot-flicker border border-purple/40 bg-gradient-to-b from-[#0F0A1C]/90 to-[#07040D]/95 p-6 sm:p-10 shadow-2xl">
        {/* Top telemetry bar */}
        <div className="flex items-center justify-between border-b border-purple/20 pb-4 mb-6 text-[10px] tracking-widest text-fade">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-magenta animate-pulse" />
            <span className="text-cyan">CLASSIFIED TRANSMISSION</span>
            <span className="hidden sm:inline text-fade/60">
              // ARCHIVE SCAN #0092
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="text-[9px] text-cyan/80 hover:text-cyan tracking-widest transition-colors"
              title="Toggle audio cues"
            >
              [AUDIO: {soundEnabled ? "ON" : "OFF"}]
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="text-magenta hover:text-magenta/80 font-semibold tracking-widest transition-colors"
            >
              SKIP [ESC] →
            </button>
          </div>
        </div>

        {/* Cinematic Content Area */}
        <div className="min-h-[220px] flex flex-col justify-center my-4">
          {/* Stage 1: The Hook */}
          {stage >= 1 && (
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan/80 mb-2">
                &gt; CASE BRIEFING:
              </p>
              <h2 className="font-mono text-base sm:text-lg text-ink font-semibold leading-relaxed tracking-wide">
                {typedHook}
                {stage === 1 && <span className="cursor-blink text-cyan" />}
              </h2>
            </div>
          )}

          {/* Stage 2: The Suspense Beat (Pause) */}
          {stage === 2 && (
            <div className="my-5 py-4 border-y border-purple/30 bg-purple/5 text-center animate-pulse">
              <span className="text-[11px] tracking-[0.3em] text-magenta font-semibold">
                [ HOLDING BREATH . . . AUDITING SINS ]
              </span>
              <div className="w-48 h-1 mx-auto mt-2.5 bg-purple/20 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan via-magenta to-purple w-full animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>
          )}

          {/* Stage 3 & 4: The Fatal Delivery */}
          {stage >= 3 && (
            <div className="mt-2 p-5 border-l-2 border-magenta bg-magenta/5 relative">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[9px] font-bold tracking-[0.25em] text-magenta">
                  FATAL HIT // {currentRoast.victim}
                </span>
                <span className="text-[9px] text-fade tracking-widest">
                  DAMAGE: {currentRoast.damage}
                </span>
              </div>
              <p className="font-display text-base sm:text-xl text-ink leading-snug glow-text-magenta">
                {typedPunchline}
                {stage === 3 && <span className="cursor-blink text-magenta" />}
              </p>
            </div>
          )}

          {/* Stage 4: Suspense Climax & Call to Action */}
          {stage >= 4 && (
            <div className="mt-7 pt-4 border-t border-purple/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-cyan tracking-widest animate-pulse text-center sm:text-left">
                &gt; THINK YOUR FOOTPRINT IS SAFE?
              </p>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={nextRoast}
                  className="focus-ring border border-purple/40 px-3.5 py-2.5 text-[10px] text-fade hover:text-ink hover:border-purple tracking-widest transition-all"
                >
                  ANOTHER CASUALTY
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="focus-ring flex-1 sm:flex-none border border-magenta bg-magenta/25 hover:bg-magenta/45 text-ink px-6 py-2.5 text-xs font-semibold tracking-[0.2em] shadow-neonMagenta transition-all transform hover:scale-[1.02]"
                >
                  ENTER THE CHAIR →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom subtle progress ticker */}
        <div className="mt-6 pt-3 border-t border-purple/15 flex items-center justify-between text-[8px] text-fade tracking-widest">
          <span>ROAST.EXE PROTOCOL v2.4</span>
          <span>
            {stage === 4
              ? "ENTERING MAIN ARENA AUTOMATICALLY..."
              : "COMMENCING FORENSIC ROAST SEQUENCE"}
          </span>
        </div>
      </div>
    </div>
  );
}
