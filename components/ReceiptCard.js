"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { playSound } from "./Soundboard";
import StoryMode from "./StoryMode";
import PhotoAnnotationViewer from "./PhotoAnnotationViewer";

function scanId() {
  return Math.floor(100000 + Math.random() * 899999);
}

const REJECTION_MESSAGES = [
  "APPEAL REJECTED: Penalty for audacity applied (+2%).",
  "DENIAL AUDIT: We re-reviewed the evidence and found you even guiltier.",
  "ERROR 403: Self-delusion not recognized as legal defense.",
  "NICE TRY: The algorithm is scientifically incapable of mercy.",
  "APPEAL DISMISSED: The receipt stands. Dignity recovery unavailable.",
];

export default function ReceiptCard({
  result,
  personality,
  heat,
  mode,
  userMode,
  playerName,
  friendName,
  previewUrl,
  friendPreviewUrl,
  onReset,
  onRematch,
}) {
  const cardRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const idRef = useRef(scanId());
  const timestamp = useRef(new Date());
  const isDuo = userMode === "duo";
  const winner = result.winner;
  const winnerName =
    winner === "PLAYER 01"
      ? playerName || "PLAYER 01"
      : winner === "PLAYER 02"
      ? friendName || "PLAYER 02"
      : "DRAW";

  // Interactive Feature States
  const [isFlipped, setIsFlipped] = useState(false);
  const [storyMode, setStoryMode] = useState(false);
  const [dignityHp, setDignityHp] = useState(100);
  const [hitReactions, setHitReactions] = useState({});
  const [isShaking, setIsShaking] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [activePhotoPlayer, setActivePhotoPlayer] = useState(1);

  const activePhotoUrl =
    isDuo && activePhotoPlayer === 2 && friendPreviewUrl
      ? friendPreviewUrl
      : previewUrl;

  // Clap Back Drawer State
  const [clapBackOpen, setClapBackOpen] = useState(false);
  const [userExcuse, setUserExcuse] = useState("");
  const [clapBackLoading, setClapBackLoading] = useState(false);
  const [rebuttal, setRebuttal] = useState(null);

  // Sound muted state
  const [isMuted, setIsMuted] = useState(false);

  // Screen shake helper
  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 380);
  }, []);

  // React to a specific hit
  const handleReact = (index, type) => {
    playSound(type, isMuted);
    setHitReactions((prev) => ({ ...prev, [index]: type }));

    if (type === "cooked") {
      triggerShake();
      setDignityHp((hp) => Math.max(0, hp - 18));
    } else if (type === "fatal") {
      triggerShake();
      setDignityHp((hp) => Math.max(0, hp - 25));
    } else if (type === "cap") {
      setDignityHp((hp) => Math.min(100, hp + 5));
    }
  };

  // Flip card
  const handleFlip = () => {
    playSound("flip", isMuted);
    setIsFlipped((f) => !f);
  };

  // Sarcastic appeal slider attempt
  const handleAppealAttempt = () => {
    playSound("reject", isMuted);
    triggerShake();
    const randomMsg =
      REJECTION_MESSAGES[Math.floor(Math.random() * REJECTION_MESSAGES.length)];
    setToastMessage(randomMsg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Submit Clap Back defense
  const submitClapBack = async (e) => {
    e?.preventDefault();
    if (!userExcuse.trim() || clapBackLoading) return;

    setClapBackLoading(true);
    setRebuttal(null);

    try {
      const res = await fetch("/api/clapback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalRoast: result.fatality || result.summary,
          userExcuse: userExcuse.trim(),
          personality,
        }),
      });
      let data = null;
      try {
        data = await res.json();
      } catch {}
      if (data?.rebuttal) {
        setRebuttal(data.rebuttal);
      } else {
        setRebuttal("Your defense was so weak even the server rejected it.");
      }
      playSound("fatal", isMuted);
      triggerShake();
      setDignityHp((hp) => Math.max(0, hp - 30));
    } catch {
      setRebuttal("Your defense was so bad the connection timed out.");
    } finally {
      setClapBackLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#07040D",
      });
      const link = document.createElement("a");
      link.download = `roast-scan-${idRef.current}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    const text = `${result.fatality || result.summary}\nROAST SCORE: ${result.score}/100\n${result.archetype || result.verdict}`;
    try {
      if (navigator.share) await navigator.share({ title: "ROAST.EXE", text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch (e) {
      if (e?.name !== "AbortError") console.error(e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-5 w-full max-w-6xl ${isShaking ? "shake-active" : ""}`}>
      
      {/* Story Mode Fullscreen Overlay */}
      {storyMode && (
        <StoryMode
          result={result}
          mode={mode}
          userMode={userMode}
          playerName={playerName}
          friendName={friendName}
          onClose={() => setStoryMode(false)}
          onClapBack={() => {
            setStoryMode(false);
            setClapBackOpen(true);
          }}
        />
      )}

      {/* Sarcastic Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 z-50 px-5 py-3 border border-magenta bg-[#0D0518] text-magenta font-mono text-xs shadow-neonMagenta animate-bounce tracking-wide flex items-center gap-2">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Duo Winner Banner */}
      {isDuo && (
        <div className="battle-winner-banner w-full max-w-5xl">
          <div className="winner-eyebrow">FINAL VERDICT</div>
          <div className="winner-title">
            {winner === "DRAW" ? "NOBODY SURVIVES" : `${winnerName} WINS`}
          </div>
          <div className="winner-sub">
            {winner === "DRAW"
              ? "equal damage. equal shame. remarkably fair."
              : "the roast engine has spoken. appeal denied."}
          </div>
        </div>
      )}

      {/* Quick Interactive Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full px-2 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStoryMode(true)}
            className="focus-ring border border-cyan/80 bg-cyan/15 hover:bg-cyan/30 text-ink px-3.5 py-1.5 text-[11px] tracking-widest transition-all flex items-center gap-1.5 shadow-neon"
          >
            <span>🎬</span>
            <span>STORY REVEAL</span>
          </button>
          <button
            type="button"
            onClick={handleFlip}
            className="focus-ring border border-magenta/70 bg-magenta/15 hover:bg-magenta/30 text-ink px-3.5 py-1.5 text-[11px] tracking-widest transition-all flex items-center gap-1.5 shadow-neonMagenta"
          >
            <span>🔄</span>
            <span>{isFlipped ? "VIEW ROAST CARD" : "VIEW INCIDENT REPORT"}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="text-[10px] text-fade hover:text-ink tracking-widest"
          >
            [AUDIO: {isMuted ? "MUTED" : "ON"}]
          </button>
          <button
            type="button"
            onClick={() => setClapBackOpen((v) => !v)}
            className="border border-purple/60 hover:border-purple text-ink px-3 py-1.5 text-[11px] tracking-widest bg-purple/10 transition-all"
          >
            🗣️ CLAP BACK
          </button>
        </div>
      </div>

      {/* 3D Flipper Container */}
      <div className="card-flipper-container">
        <div className={`card-flipper ${isFlipped ? "is-flipped" : ""}`}>
          
          {/* ==================================================== */}
          {/* FRONT FACE: THE ROAST RECEIPT CARD */}
          {/* ==================================================== */}
          <div ref={cardRef} className="card-face w-full crt-frame relative result-card">
            <div className="scanlines" />
            
            {/* Telemetry Bar */}
            <div className="relative flex items-center gap-2 px-5 py-3 border-b border-purple/25">
              <span className="w-2.5 h-2.5 rounded-full bg-magenta/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-cyan/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-purple/60" />
              <span className="ml-3 text-[10px] tracking-widest text-fade">
                SCAN #{idRef.current} — {isDuo ? "BATTLE COMPLETE" : "ANALYSIS COMPLETE"}
              </span>
              <span className="ml-auto text-[9px] text-cyan">● VERIFIED</span>
            </div>

            <div className="relative px-7 py-7 lg:px-10 lg:py-8">
              {/* Header Grid */}
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
                <div>
                  <p className="font-display text-3xl lg:text-4xl text-purple glow-text">
                    {isDuo ? "ROAST_BATTLE" : "ROAST_MACHINE"}
                  </p>
                  <p className="text-[10px] text-fade mt-1">
                    INPUT: {mode.toUpperCase()} · SERVER: {personality?.toUpperCase()} · HEAT: {heat}/5
                  </p>
                </div>
                
                {/* Live Dignity Health Bar */}
                <div className="w-full lg:w-56 p-2 border border-purple/25 bg-purple/5">
                  <div className="flex justify-between text-[9px] tracking-widest mb-1">
                    <span className="text-fade">DIGNITY INTEGRITY</span>
                    <span className={dignityHp <= 25 ? "text-magenta font-bold animate-pulse" : "text-cyan"}>
                      {dignityHp}% {dignityHp <= 25 ? "CRITICAL" : "STABLE"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-purple/20 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        dignityHp <= 25 ? "bg-magenta shadow-neonMagenta" : "bg-cyan shadow-neon"
                      }`}
                      style={{ width: `${dignityHp}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="dashed-rule mb-6" />

              <div className="result-hero-grid">
                <section>
                  {/* Archetype Box */}
                  <div className="archetype-box mb-5">
                    <span className="text-[9px] text-cyan tracking-widest">VIBE ARCHETYPE</span>
                    <p className="font-display text-2xl lg:text-3xl text-purple glow-text mt-1">
                      {result.archetype || result.verdict}
                    </p>
                    <p className="text-[10px] text-fade mt-2">
                      {result.archetypeReason || "classified from the available evidence."}
                    </p>
                  </div>

                  {/* Fatality Box with Clapback Trigger */}
                  <div className="fatality-box mb-6 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] text-magenta tracking-widest">FATALITY LINE</div>
                      <button
                        type="button"
                        onClick={() => setClapBackOpen((o) => !o)}
                        className="text-[9px] text-magenta hover:underline tracking-widest cursor-pointer"
                      >
                        [🗣️ CLAP BACK]
                      </button>
                    </div>
                    <p className="text-base lg:text-lg text-ink mt-2 leading-snug">
                      {result.fatality || result.lines?.[result.lines.length - 1]}
                    </p>
                  </div>

                  {/* Forensic Photo Annotations (Pins of Shame) */}
                  {mode === "selfie" && activePhotoUrl && (
                    <div className="mb-6">
                      {isDuo && previewUrl && friendPreviewUrl && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] text-fade tracking-widest">VIEW EVIDENCE:</span>
                          <button
                            type="button"
                            onClick={() => setActivePhotoPlayer(1)}
                            className={`px-2.5 py-0.5 text-[9px] tracking-widest border transition-all ${
                              activePhotoPlayer === 1
                                ? "border-cyan bg-cyan/20 text-cyan font-bold shadow-neon"
                                : "border-purple/30 text-fade hover:text-ink"
                            }`}
                          >
                            P1: {playerName || "PLAYER 01"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePhotoPlayer(2)}
                            className={`px-2.5 py-0.5 text-[9px] tracking-widest border transition-all ${
                              activePhotoPlayer === 2
                                ? "border-magenta bg-magenta/20 text-magenta font-bold shadow-neonMagenta"
                                : "border-purple/30 text-fade hover:text-ink"
                            }`}
                          >
                            P2: {friendName || "PLAYER 02"}
                          </button>
                        </div>
                      )}
                      <PhotoAnnotationViewer
                        imageUrl={activePhotoUrl}
                        annotations={result.photoAnnotations || []}
                      />
                    </div>
                  )}

                  {/* Celebrity / Fictional Twin */}
                  {result.celebrityTwin && (
                    <div className="mb-6 p-4 border border-cyan/40 bg-[#0c051a] shadow-neon relative overflow-hidden">
                      <div className="flex items-center justify-between text-[9px] tracking-widest text-cyan mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                          <span>CELEBRITY / FICTIONAL TWIN</span>
                        </div>
                        <span className="text-fade">[UNSOLICITED COMPARISON]</span>
                      </div>
                      <p className="font-display text-lg sm:text-xl text-purple glow-text mt-1">
                        {result.celebrityTwin.name}
                      </p>
                      <p className="text-xs sm:text-sm text-ink/90 mt-1 font-mono leading-relaxed">
                        "{result.celebrityTwin.comparison}"
                      </p>
                    </div>
                  )}

                  {/* RPG Life Inventory Sheet */}
                  {result.characterSheet && (
                    <div className="mb-6 p-4 border border-purple/30 bg-[#0d071d]/80 relative">
                      <div className="flex items-center justify-between text-[9px] tracking-widest text-fade mb-3 border-b border-purple/20 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-magenta font-mono font-bold">RPG LIFE INVENTORY</span>
                          <span className="text-cyan">// CHARACTER AUDIT</span>
                        </div>
                        <span className="text-magenta font-mono">[CLASS SPECS]</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                        <div className="p-3 border border-purple/25 bg-purple/10">
                          <span className="text-[9px] text-cyan block tracking-widest mb-1 font-semibold">🛡️ EQUIPPED ARMOR</span>
                          <span className="text-ink text-[12px] font-semibold leading-tight block">{result.characterSheet.equippedArmor}</span>
                        </div>
                        <div className="p-3 border border-purple/25 bg-purple/10">
                          <span className="text-[9px] text-magenta block tracking-widest mb-1 font-semibold">⚔️ EQUIPPED WEAPON</span>
                          <span className="text-ink text-[12px] font-semibold leading-tight block">{result.characterSheet.equippedWeapon}</span>
                        </div>
                        <div className="p-3 border border-red-500/35 bg-red-950/25">
                          <span className="text-[9px] text-red-400 block tracking-widest mb-1 font-semibold">⚠️ ACTIVE DEBUFF</span>
                          <span className="text-red-300 text-[12px] font-semibold leading-tight block">{result.characterSheet.activeDebuff}</span>
                        </div>
                        <div className="p-3 border border-yellow-500/35 bg-yellow-950/25">
                          <span className="text-[9px] text-yellow-400 block tracking-widest mb-1 font-semibold">✨ SPECIAL ABILITY</span>
                          <span className="text-yellow-200 text-[12px] font-semibold leading-tight block">{result.characterSheet.specialAbility}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Roast Hits Combat Log with interactive reactions */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] tracking-widest text-fade">
                      {isDuo ? "COMBAT LOG" : "ROAST OUTPUT"}
                    </span>
                    <span className="text-[10px] text-cyan">
                      {result.lines?.length || 0} HITS · CLICK TO REACT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(result.lines || []).map((line, i) => {
                      const reaction = hitReactions[i];
                      return (
                        <div
                          key={i}
                          className={`roast-hit border px-4 py-4 relative transition-all ${
                            isDuo && i === result.lines.length - 1
                              ? "border-magenta/45 bg-magenta/5 sm:col-span-2"
                              : "border-purple/20 bg-purple/5"
                          }`}
                        >
                          <p className="text-[13px] lg:text-sm leading-snug text-ink mb-3">
                            <span className="text-cyan mr-2">{String(i + 1).padStart(2, "0")}</span>
                            {line}
                          </p>

                          {/* Reaction buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-purple/15 text-[10px]">
                            <span className="text-[8px] text-fade tracking-widest">RATE DAMAGE:</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReact(i, "cooked")}
                                className={`px-2 py-0.5 border text-[9px] transition-all ${
                                  reaction === "cooked"
                                    ? "border-magenta bg-magenta/30 text-magenta font-bold shadow-neonMagenta"
                                    : "border-purple/20 text-fade hover:text-ink"
                                }`}
                                title="Emotional damage"
                              >
                                💀 COOKED
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReact(i, "fatal")}
                                className={`px-2 py-0.5 border text-[9px] transition-all ${
                                  reaction === "fatal"
                                    ? "border-cyan bg-cyan/30 text-cyan font-bold shadow-neon"
                                    : "border-purple/20 text-fade hover:text-ink"
                                }`}
                                title="Fatal hit"
                              >
                                🔥 FATAL
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReact(i, "cap")}
                                className={`px-2 py-0.5 border text-[9px] transition-all ${
                                  reaction === "cap"
                                    ? "border-yellow-500 bg-yellow-500/20 text-yellow-300 font-bold"
                                    : "border-purple/20 text-fade hover:text-ink"
                                }`}
                                title="Cap / Denial"
                              >
                                🧢 CAP
                              </button>
                            </div>
                          </div>

                          {/* Stamped denial badge */}
                          {reaction === "cap" && (
                            <div className="stamp-badge absolute top-2 right-2 border-2 border-red-500/80 bg-red-950/80 text-red-400 font-mono text-[8px] px-2 py-0.5 tracking-widest rotate-6 pointer-events-none">
                              DENIAL DETECTED
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Sidebar */}
                <aside className="result-sidebar lg:border-l lg:border-purple/20 lg:pl-8">
                  {isDuo && (
                    <div className="mb-7">
                      <span className="text-[10px] text-fade tracking-widest">BATTLE RESULT</span>
                      <p className="text-xl text-magenta glow-text-magenta mt-1 break-words">
                        {winnerName}
                      </p>
                    </div>
                  )}

                  <div className="mb-7">
                    <span className="text-[10px] text-fade tracking-widest">ROAST SCORE</span>
                    <p className="text-4xl font-semibold text-magenta glow-text-magenta mt-1">
                      {result.score}
                      <span className="text-lg">/100</span>
                    </p>
                  </div>

                  <div className="mb-7">
                    <span className="text-[10px] text-fade tracking-widest">VERDICT</span>
                    <p className="text-xl text-purple glow-text mt-1">{result.verdict}</p>
                  </div>

                  <div className="dashed-rule my-6" />

                  {/* Vibe Diagnostics with Sarcastic Slider Minigame */}
                  {result.vibeStats?.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-fade tracking-widest">
                          {isDuo ? "PLAYER STATS" : "VIBE DIAGNOSTICS"}
                        </span>
                        <span className="text-[8px] text-cyan tracking-widest cursor-pointer hover:underline" onClick={handleAppealAttempt}>
                          APPEAL VERDICT ⚖️
                        </span>
                      </div>

                      <div className="space-y-3">
                        <InteractiveVibeStats
                          stats={result.vibeStats}
                          accent="cyan"
                          name={isDuo ? playerName : null}
                          onAppeal={handleAppealAttempt}
                        />
                        {isDuo && result.friendVibeStats?.length > 0 && (
                          <>
                            <div className="dashed-rule my-4" />
                            <InteractiveVibeStats
                              stats={result.friendVibeStats}
                              accent="magenta"
                              name={friendName}
                              onAppeal={handleAppealAttempt}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] leading-relaxed text-fade">{result.summary}</p>
                  <p className="text-[8px] leading-relaxed text-fade/70 mt-3 tracking-wide">
                    {mode === "spotify"
                      ? "playlist evidence processed · taste crimes remain on record"
                      : "evidence processed · dignity recovery remains unavailable"}
                  </p>
                </aside>
              </div>

              {/* Live Clap Back Drawer / Modal */}
              {clapBackOpen && (
                <div className="mt-8 p-5 border border-magenta/60 bg-[#12061E] shadow-neonMagenta relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-magenta tracking-widest font-semibold">
                      🗣️ CLAP BACK PROTOCOL // FILE AN EXCUSE
                    </span>
                    <button
                      type="button"
                      onClick={() => setClapBackOpen(false)}
                      className="text-fade hover:text-ink text-xs font-mono"
                    >
                      ✕ CLOSE
                    </button>
                  </div>

                  <form onSubmit={submitClapBack} className="space-y-3">
                    <input
                      type="text"
                      value={userExcuse}
                      maxLength={180}
                      onChange={(e) => setUserExcuse(e.target.value)}
                      placeholder="e.g. 'I was sleep deprived and only listen to that artist ironically...'"
                      className="focus-ring w-full neon-border bg-transparent p-3 text-xs text-ink placeholder:text-fade/50"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-fade">
                        Warning: Machine will analyze and roast your excuse.
                      </span>
                      <button
                        type="submit"
                        disabled={clapBackLoading || !userExcuse.trim()}
                        className="focus-ring border border-magenta bg-magenta/25 hover:bg-magenta/40 text-ink px-4 py-2 text-xs tracking-widest transition-all disabled:opacity-50"
                      >
                        {clapBackLoading ? "ANALYZING DEFENSE..." : "FIRE DEFENSE →"}
                      </button>
                    </div>
                  </form>

                  {/* Rebuttal Response */}
                  {rebuttal && (
                    <div className="mt-4 p-4 border-l-2 border-magenta bg-magenta/10 animate-[fadeScale_0.25s_ease-out]">
                      <span className="text-[9px] text-cyan tracking-[0.2em] font-bold block mb-1">
                        COUNTER-STRIKE DELIVERED:
                      </span>
                      <p className="font-display text-sm sm:text-base text-ink glow-text-magenta">
                        "{rebuttal}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="dashed-rule my-6" />
              <div className="flex items-center justify-between text-[9px] text-fade">
                <span>{timestamp.current.toLocaleString()}</span>
                <span>
                  END OF TRANSMISSION<span className="cursor-blink" />
                </span>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* BACK FACE: OFFICIAL TRAUMA INCIDENT REPORT */}
          {/* ==================================================== */}
          <div className="card-face card-face-back w-full crt-frame relative result-card bg-gradient-to-b from-[#130722] to-[#080312]">
            <div className="scanlines" />

            <div className="relative flex items-center justify-between px-5 py-3 border-b border-purple/25 text-[10px] tracking-widest text-fade">
              <span className="text-magenta font-semibold">
                FORM #DMG-{idRef.current} // OFFICIAL TRANSMISSION
              </span>
              <button
                type="button"
                onClick={handleFlip}
                className="text-cyan hover:underline font-mono"
              >
                [🔄 FLIP BACK]
              </button>
            </div>

            <div className="relative p-8 lg:p-12 text-center max-w-2xl mx-auto space-y-6">
              <div className="stamp-badge inline-block border-2 border-magenta bg-magenta/15 text-magenta font-mono text-xs px-4 py-1.5 tracking-[0.25em] font-bold">
                CERTIFICATE OF TOTAL DEFENSELESSNESS
              </div>

              <h2 className="font-display text-3xl sm:text-4xl text-purple glow-text">
                DIGITAL TRAUMA REPORT
              </h2>

              <p className="text-xs text-fade leading-relaxed">
                This document certifies that{" "}
                <span className="text-cyan font-bold">{playerName || "SUBJECT"}</span> entered
                the ROAST.EXE chamber voluntarily on {timestamp.current.toLocaleDateString()}{" "}
                and sustained critical comedic injury.
              </p>

              {/* Official Table */}
              <div className="border border-purple/30 text-left text-xs divide-y divide-purple/20 bg-purple/5 font-mono">
                <div className="p-3 flex justify-between">
                  <span className="text-fade">PRIMARY CHARGE:</span>
                  <span className="text-ink">{result.archetype || "QUESTIONABLE TASTE"}</span>
                </div>
                {result.celebrityTwin && (
                  <div className="p-3 flex justify-between">
                    <span className="text-fade">CELEBRITY TWIN:</span>
                    <span className="text-magenta font-semibold">{result.celebrityTwin.name}</span>
                  </div>
                )}
                {result.characterSheet && (
                  <div className="p-3 flex justify-between">
                    <span className="text-fade">ACTIVE DEBUFF:</span>
                    <span className="text-red-400 font-semibold">{result.characterSheet.activeDebuff}</span>
                  </div>
                )}
                <div className="p-3 flex justify-between">
                  <span className="text-fade">DAMAGE LEVEL:</span>
                  <span className="text-magenta font-bold">{result.score} / 100</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-fade">CORONER VERDICT:</span>
                  <span className="text-cyan">{result.verdict}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-fade">DIGNITY STATUS:</span>
                  <span className="text-magenta">COMPLETELY ZEROED</span>
                </div>
              </div>

              {/* Barcode & Sarcastic Coupon */}
              <div className="p-4 border border-dashed border-cyan/40 bg-cyan/5 text-left space-y-2">
                <div className="flex justify-between items-center text-[10px] text-cyan tracking-widest font-mono">
                  <span>REDEEMABLE COUPON:</span>
                  <span>100% OFF</span>
                </div>
                <p className="text-sm text-ink font-semibold">
                  Good for 1 Free Excuse to Touch Grass and Delete Questionable Posts.
                </p>
                <p className="text-[9px] text-fade">
                  *Not valid on LinkedIn. Void if you try to explain the joke to someone else.
                </p>
                <div className="font-mono text-xs tracking-widest text-cyan/70 pt-2 text-center select-all">
                  ||||| ||| ||||||| || |||||| |||| |||||||| | ||||
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleFlip}
                  className="focus-ring border border-cyan bg-cyan/20 hover:bg-cyan/35 text-ink px-6 py-2.5 text-xs tracking-widest transition-all"
                >
                  RETURN TO ROAST CARD
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={saving}
          className="focus-ring border border-purple bg-purple/20 text-ink px-5 py-2.5 text-xs tracking-wide hover:bg-purple/40 hover:shadow-neon transition-all disabled:opacity-50"
        >
          {saving ? "SAVING…" : "SAVE SCAN"}
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="focus-ring border border-cyan/70 text-ink px-5 py-2.5 text-xs tracking-wide hover:bg-cyan/15 hover:shadow-neon transition-all disabled:opacity-50"
        >
          {sharing ? "SHARING…" : "SHARE / COPY"}
        </button>
        <button
          onClick={onRematch}
          className="focus-ring border border-magenta/60 text-ink px-5 py-2.5 text-xs tracking-wide hover:bg-magenta/20 hover:shadow-neonMagenta transition-all"
        >
          {isDuo ? "REMATCH — SAME EVIDENCE" : "RUN AGAIN — SAME EVIDENCE"}
        </button>
        <button
          onClick={onReset}
          className="focus-ring border border-purple/40 text-fade px-5 py-2.5 text-xs tracking-wide hover:text-ink transition-all"
        >
          NEW EVIDENCE
        </button>
      </div>
    </div>
  );
}

// Sarcastic interactive slider component for vibe diagnostics
function InteractiveVibeStats({ stats, accent, name, onAppeal }) {
  const bar = accent === "magenta" ? "vibe-bar-magenta" : "vibe-bar-cyan";
  const value = accent === "magenta" ? "text-magenta" : "text-cyan";

  return (
    <div>
      {name && <p className={`text-[9px] ${value} tracking-widest mb-2`}>{name.toUpperCase()}</p>}
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={`${stat.category}-${index}`}>
            <div className="flex items-end justify-between gap-2 mb-1">
              <span className="text-[9px] text-fade tracking-wide truncate">{stat.category}</span>
              <span className={`text-[9px] ${value} shrink-0`}>
                {stat.label} · {stat.score}%
              </span>
            </div>
            {/* Interactive track that rejects changes on click or drag */}
            <div
              className="vibe-track cursor-pointer group relative"
              onClick={onAppeal}
              title="Click to dispute / appeal this score"
            >
              <div className={bar} style={{ width: `${stat.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
