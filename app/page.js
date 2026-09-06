"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeatDial from "@/components/HeatDial";
import ReceiptCard from "@/components/ReceiptCard";
import SuspenseIntro from "@/components/SuspenseIntro";
import MugshotBooth from "@/components/MugshotBooth";

const PERSONALITIES = [
  { id: "group-chat", label: "THE GROUP CHAT", blurb: "memes, slang, zero mercy" },
  { id: "mentor", label: "DISAPPOINTED MENTOR", blurb: "dry, cutting, quietly let down" },
  { id: "hr", label: "CORPORATE HR", blurb: "deadpan memo on your choices" },
  { id: "ex", label: "THE EX", blurb: "uncomfortably specific, petty" },
  { id: "closer", label: "STAND-UP CLOSER", blurb: "punchlines building to a finish" },
];

const HISTORY_KEY = "roastai_history";
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const SOLO_SCAN = [
  "LOADING EVIDENCE...",
  "IDENTIFYING QUESTIONABLE DECISIONS...",
  "SEARCHING FOR AMMUNITION...",
  "CALCULATING DAMAGE...",
  "ROAST ENGINE ARMED.",
];

const DUO_SCAN = [
  "PLAYER 01 EVIDENCE: LOCKED",
  "PLAYER 02 EVIDENCE: LOCKED",
  "COMPARING QUESTIONABLE DECISIONS...",
  "CALCULATING WHO HAS LESS DIGNITY...",
  "BATTLE ENGINE ARMED.",
];

async function normalizeImage(file) {
  if (SUPPORTED_TYPES.includes(file.type) && file.size <= 6 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("conversion failed");
    return new File([blob], "evidence.jpg", { type: "image/jpeg" });
  } catch {
    throw new Error("SYSTEM: couldn't read that image. Try a JPG, PNG, or WEBP instead.");
  }
}

function loadHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  const current = loadHistory();
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify([...current, entry].slice(-8)));
}

function clearHistory() {
  window.localStorage.removeItem(HISTORY_KEY);
}

export default function Page() {
  const [inputMode, setInputMode] = useState("selfie");
  const [userMode, setUserMode] = useState("solo");
  const [file, setFile] = useState(null);
  const [friendFile, setFriendFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [friendPreviewUrl, setFriendPreviewUrl] = useState(null);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [friendSpotifyUrl, setFriendSpotifyUrl] = useState("");
  const [playerName, setPlayerName] = useState("PLAYER 01");
  const [friendName, setFriendName] = useState("PLAYER 02");
  const [personality, setPersonality] = useState(PERSONALITIES[0].id);
  const [heat, setHeat] = useState(3);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [history, setHistory] = useState([]);
  const [boothTarget, setBoothTarget] = useState(null);
  const inputRef = useRef(null);
  const friendInputRef = useRef(null);
  const scanMessages = userMode === "duo" ? DUO_SCAN : SOLO_SCAN;

  useEffect(() => setHistory(loadHistory()), []);

  useEffect(() => {
    if (!loading) return setScanStep(0);
    const timer = setInterval(() => setScanStep((step) => (step + 1) % scanMessages.length), 750);
    return () => clearInterval(timer);
  }, [loading, scanMessages.length]);

  const roastability = useMemo(() => {
    let score = 0;
    if (inputMode === "selfie") score += file ? 70 : 0;
    else score += spotifyUrl.trim() ? 45 : 0;
    if (previewUrl) score += 20;
    if (inputMode === "spotify" && file) score += 35;
    if (userMode === "duo") {
      if (inputMode === "selfie" && friendFile) score += 20;
      if (inputMode === "spotify" && (friendSpotifyUrl.trim() || friendFile)) score += 20;
    }
    return Math.min(100, score);
  }, [file, friendFile, inputMode, previewUrl, spotifyUrl, friendSpotifyUrl, userMode]);

  const roastabilityLabel = roastability >= 85 ? "EXTREMELY ROASTABLE" : roastability >= 60 ? "PROMISING" : roastability >= 30 ? "NEEDS MORE EVIDENCE" : "BARELY A CASE";

  const handleFile = useCallback(async (f, isFriend = false) => {
    if (!f) return;
    setError(null);
    try {
      const normalized = await normalizeImage(f);
      const url = URL.createObjectURL(normalized);
      if (isFriend) {
        setFriendFile(normalized);
        setFriendPreviewUrl(url);
      } else {
        setFile(normalized);
        setPreviewUrl(url);
      }
    } catch (e) {
      if (isFriend) { setFriendFile(null); setFriendPreviewUrl(null); }
      else { setFile(null); setPreviewUrl(null); }
      setError(e.message || "SYSTEM: couldn't read that image.");
    }
  }, []);

  const switchInputMode = (mode) => {
    setInputMode(mode);
    setFile(null); setFriendFile(null); setPreviewUrl(null); setFriendPreviewUrl(null);
    setSpotifyUrl(""); setFriendSpotifyUrl(""); setError(null);
  };

  const switchUserMode = (mode) => {
    setUserMode(mode);
    setFriendFile(null); setFriendPreviewUrl(null); setFriendSpotifyUrl(""); setError(null);
  };

  const submit = async () => {
    if (!contractAccepted) return setError("SYSTEM: accept the roast contract. You clicked the dangerous button.");
    if (inputMode === "selfie" && !file) return setError("SYSTEM: no evidence detected. Insert your side to proceed.");
    if (inputMode === "spotify" && !file && !spotifyUrl.trim()) return setError("SYSTEM: give us your Spotify link or screenshot.");
    if (userMode === "duo" && inputMode === "selfie" && !friendFile) return setError("SYSTEM: your opponent hasn't entered the arena yet.");
    if (userMode === "duo" && inputMode === "spotify" && !friendFile && !friendSpotifyUrl.trim()) return setError("SYSTEM: Player 02 forgot the evidence. Suspicious.");

    setError(null); setLoading(true);
    try {
      const form = new FormData();
      if (file) form.append("image", file);
      if (friendFile) form.append("image2", friendFile);
      form.append("mode", inputMode);
      form.append("userMode", userMode);
      form.append("text", inputMode === "spotify" ? spotifyUrl : "");
      form.append("text2", inputMode === "spotify" ? friendSpotifyUrl : "");
      form.append("playerName", playerName.trim() || "PLAYER 01");
      form.append("friendName", friendName.trim() || "PLAYER 02");
      form.append("personality", personality);
      form.append("heat", String(heat));
      form.append("history", JSON.stringify(loadHistory().slice(-6)));

      const res = await fetch("/api/roast", { method: "POST", body: form });
      let data = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(`SYSTEM ERROR (${res.status}): Server returned invalid response.`);
      }
      if (!res.ok) throw new Error(data?.error || `SYSTEM ERROR (${res.status}): roast machine jammed.`);

      setResult(data);
      const entry = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        mode: inputMode,
        userMode,
        names: userMode === "duo" ? `${playerName} vs ${friendName}` : playerName,
        score: data.score,
        verdict: data.verdict,
        archetype: data.archetype,
        fatality: data.fatality,
        summary: data.summary,
      };
      saveHistory(entry);
      setHistory(loadHistory());
    } catch (e) {
      setError(e.message || "SYSTEM ERROR: something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = (keepEvidence = false) => {
    setResult(null);
    if (!keepEvidence) {
      setFile(null); setFriendFile(null); setPreviewUrl(null); setFriendPreviewUrl(null);
      setSpotifyUrl(""); setFriendSpotifyUrl("");
    }
    setContractAccepted(false);
    setError(null);
  };

  if (loading) return <ScanScreen userMode={userMode} playerName={playerName} friendName={friendName} scanStep={scanStep} scanMessages={scanMessages} />;

  if (result) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 py-8 lg:px-10">
        <ReceiptCard
          result={result}
          personality={PERSONALITIES.find((p) => p.id === personality)?.label}
          heat={heat}
          mode={inputMode}
          userMode={userMode}
          playerName={playerName}
          friendName={friendName}
          previewUrl={previewUrl}
          friendPreviewUrl={friendPreviewUrl}
          onReset={() => reset(false)}
          onRematch={() => reset(true)}
        />
      </main>
    );
  }

  if (showIntro) {
    return <SuspenseIntro onComplete={() => setShowIntro(false)} />;
  }

  return (
    <>
      <main className="min-h-screen flex items-center justify-center px-5 py-7 lg:px-10 lg:py-10">
        <div className="w-full max-w-6xl crt-frame relative boot-flicker">
          <div className="scanlines" />
          <div className="relative flex items-center gap-2 px-5 py-3 border-b border-purple/25">
            <span className="w-2.5 h-2.5 rounded-full bg-magenta/70" /><span className="w-2.5 h-2.5 rounded-full bg-cyan/60" /><span className="w-2.5 h-2.5 rounded-full bg-purple/60" />
            <span className="ml-3 text-[11px] tracking-widest text-fade">ROAST.EXE — LOCAL TERMINAL</span>
            <div className="ml-auto flex items-center gap-4">
              <button type="button" onClick={() => setShowIntro(true)} className="text-[9px] tracking-widest text-magenta hover:text-ink">⚡ REPLAY INTRO</button>
              <button type="button" onClick={() => setShowHistory(true)} className="text-[9px] tracking-widest text-cyan hover:text-ink">CRIMINAL RECORD [{history.length}]</button>
            </div>
          </div>

        <div className="relative px-7 py-7 lg:px-10 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
            <div>
              <p className="font-display text-3xl lg:text-4xl text-purple glow-text tracking-wide">ROAST.EXE</p>
              <p className="text-[12px] text-fade mt-2">hand over the evidence. we'll find the ammunition.</p>
            </div>
            <div className="text-[10px] text-cyan tracking-widest">AI COMEDY ENGINE // ONLINE</div>
          </div>

          <div className="mb-7">
            <label className="block text-[11px] text-fade mb-2 tracking-widest">CHOOSE YOUR FATE</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ModeCard active={userMode === "solo"} onClick={() => switchUserMode("solo")} icon="01" title="GET YOURSELF COOKED" copy="one victim. five punchlines. zero dignity." />
              <ModeCard active={userMode === "duo"} magenta onClick={() => switchUserMode("duo")} icon="02" title="TAKE DOWN A FRIEND" copy="two victims enter. the roast picks a winner." />
            </div>
          </div>

          {userMode === "duo" && (
            <div className="battle-names mb-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NameInput label="PLAYER 01 CALLSIGN" value={playerName} setValue={setPlayerName} color="cyan" />
                <NameInput label="PLAYER 02 CALLSIGN" value={friendName} setValue={setFriendName} color="magenta" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.85fr] gap-8 lg:gap-10">
            <div>
              <div className="flex mb-5 border border-purple/40">
                <button type="button" onClick={() => switchInputMode("selfie")} className={`focus-ring flex-1 py-2.5 text-xs tracking-widest transition-all ${inputMode === "selfie" ? "bg-purple/25 text-ink shadow-neon" : "text-fade hover:text-ink"}`}>SELFIE</button>
                <button type="button" onClick={() => switchInputMode("spotify")} className={`focus-ring flex-1 py-2.5 text-xs tracking-widest transition-all border-l border-purple/40 ${inputMode === "spotify" ? "bg-purple/25 text-ink shadow-neon" : "text-fade hover:text-ink"}`}>SPOTIFY</button>
              </div>

              {userMode === "solo" ? (
                <EvidenceBox
                  title={inputMode === "selfie" ? "YOUR EVIDENCE" : "YOUR SPOTIFY EVIDENCE"}
                  mode={inputMode}
                  file={file}
                  previewUrl={previewUrl}
                  inputRef={inputRef}
                  onFile={(f) => handleFile(f, false)}
                  spotifyUrl={spotifyUrl}
                  setSpotifyUrl={setSpotifyUrl}
                  onOpenBooth={() => setBoothTarget("primary")}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <EvidenceBox
                    player
                    title={`${playerName || "PLAYER 01"} — YOU`}
                    mode={inputMode}
                    file={file}
                    previewUrl={previewUrl}
                    inputRef={inputRef}
                    onFile={(f) => handleFile(f, false)}
                    spotifyUrl={spotifyUrl}
                    setSpotifyUrl={setSpotifyUrl}
                    accent="cyan"
                    onOpenBooth={() => setBoothTarget("primary")}
                  />
                  <EvidenceBox
                    player
                    title={`${friendName || "PLAYER 02"} — FRIEND`}
                    mode={inputMode}
                    file={friendFile}
                    previewUrl={friendPreviewUrl}
                    inputRef={friendInputRef}
                    onFile={(f) => handleFile(f, true)}
                    spotifyUrl={friendSpotifyUrl}
                    setSpotifyUrl={setFriendSpotifyUrl}
                    accent="magenta"
                    onOpenBooth={() => setBoothTarget("friend")}
                  />
                </div>
              )}

              <div className="roastability-panel mt-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[9px] tracking-widest text-fade">ROASTABILITY</span>
                  <span className="text-[9px] text-cyan">{roastability}% · {roastabilityLabel}</span>
                </div>
                <div className="vibe-track"><div className="vibe-bar-cyan" style={{ width: `${roastability}%` }} /></div>
                <p className="text-[8px] text-fade mt-2">better evidence = better punchlines. the machine cannot roast what it cannot see.</p>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="block text-[11px] text-fade mb-2 tracking-widest">CHOOSE YOUR SERVER</label>
              <div className="grid grid-cols-1 gap-1.5 mb-6">
                {PERSONALITIES.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPersonality(p.id)} aria-pressed={personality === p.id} className={`focus-ring text-left border px-3 py-2.5 transition-all ${personality === p.id ? "border-purple bg-purple/20 shadow-neon" : "border-purple/25 hover:border-purple/60"}`}>
                    <span className="text-sm block text-ink">{p.label}</span><span className="text-[11px] block text-fade">{p.blurb}</span>
                  </button>
                ))}
              </div>
              <div className="mb-6"><HeatDial value={heat} onChange={setHeat} /></div>

              <div className="roast-contract mb-5">
                <div className="text-[9px] tracking-widest text-magenta mb-2">ROAST CONTRACT // READ BEFORE FIRING</div>
                <label className="flex gap-3 items-start cursor-pointer">
                  <input type="checkbox" checked={contractAccepted} onChange={(e) => setContractAccepted(e.target.checked)} className="mt-1 accent-purple" />
                  <span className="text-[10px] leading-relaxed text-fade">I voluntarily submit evidence for comedic analysis. I understand this machine will make assumptions about my questionable choices, not my identity.</span>
                </label>
              </div>

              <div className="mt-auto">
                <div className="dashed-rule mb-4" />
                {error && <p className="text-xs text-magenta glow-text-magenta mb-3">{error}</p>}
                <button onClick={submit} disabled={loading} className="focus-ring w-full border border-magenta bg-magenta/20 text-ink py-3.5 text-sm tracking-widest hover:bg-magenta/40 hover:shadow-neonMagenta transition-all disabled:opacity-50">
                  {userMode === "duo" ? "> START THE ROAST BATTLE" : "> INITIATE ROAST"}
                </button>
                <p className="text-center text-[10px] text-fade mt-4">roasts choices, not identity. bring evidence, not feelings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

      {boothTarget && (
        <MugshotBooth
          onCapture={(capturedFile) => {
            handleFile(capturedFile, boothTarget === "friend");
            setBoothTarget(null);
          }}
          onClose={() => setBoothTarget(null)}
        />
      )}

      {showHistory && <HistoryPanel history={history} onClose={() => setShowHistory(false)} onClear={() => { clearHistory(); setHistory([]); }} />}
    </>
  );
}

function ModeCard({ active, magenta, onClick, icon, title, copy }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`focus-ring mode-card ${active ? (magenta ? "mode-card-active-magenta" : "mode-card-active") : ""}`}><span className={`mode-icon ${magenta ? "magenta-icon" : "cyan-icon"}`}>{icon}</span><span className="mode-card-title">{title}</span><span className="mode-card-copy">{copy}</span></button>;
}

function NameInput({ label, value, setValue, color }) {
  return <div><label className={`block text-[10px] text-${color} mb-2 tracking-widest`}>{label}</label><input value={value} maxLength={24} onChange={(e) => setValue(e.target.value)} className="focus-ring w-full neon-border bg-transparent p-3 text-sm" placeholder="your name" /></div>;
}

function ScanScreen({ userMode, playerName, friendName, scanStep, scanMessages }) {
  return <main className="min-h-screen flex items-center justify-center px-5 py-8"><div className="w-full max-w-3xl crt-frame relative scan-screen boot-flicker"><div className="scanlines" /><div className="relative px-7 py-10 lg:px-12 lg:py-14 text-center"><p className="text-[10px] tracking-[0.3em] text-cyan mb-5">{userMode === "duo" ? "ROAST BATTLE PROTOCOL" : "ROAST PROTOCOL"}</p><p className="font-display text-4xl lg:text-5xl text-purple glow-text mb-8">{userMode === "duo" ? "WHO WILL CRUMBLE?" : "PREPARE YOURSELF."}</p><div className="scan-meter mx-auto mb-7"><div className="scan-meter-fill" style={{ width: `${Math.min(100, (scanStep + 1) * 20)}%` }} /></div><div className="scan-status text-cyan text-sm min-h-6"><span className="cursor-blink">{scanMessages[scanStep]}</span></div>{userMode === "duo" && <div className="grid grid-cols-2 gap-3 mt-9 max-w-xl mx-auto"><div className="battle-chip border-cyan"><span className="text-[9px] text-fade tracking-widest">PLAYER 01</span><span className="block text-sm text-cyan mt-1 truncate">{playerName}</span></div><div className="battle-chip border-magenta"><span className="text-[9px] text-fade tracking-widest">PLAYER 02</span><span className="block text-sm text-magenta mt-1 truncate">{friendName}</span></div></div>}<p className="text-[9px] text-fade mt-10 tracking-widest">DO NOT CLOSE TERMINAL // DIGNITY RECOVERY NOT GUARANTEED</p></div></div></main>;
}

function EvidenceBox({
  title,
  mode,
  file,
  previewUrl,
  inputRef,
  onFile,
  spotifyUrl,
  setSpotifyUrl,
  onOpenBooth,
  accent = "purple",
}) {
  const accentText = accent === "magenta" ? "text-magenta" : "text-cyan";
  const border = accent === "magenta" ? "border-magenta/30" : "border-cyan/30";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`block text-[10px] ${accentText} tracking-widest`}>
          {title}
        </label>
        {mode === "selfie" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBooth?.();
            }}
            className={`text-[9px] tracking-widest px-2.5 py-0.5 border ${
              accent === "magenta"
                ? "border-magenta/60 text-magenta hover:bg-magenta/20"
                : "border-cyan/60 text-cyan hover:bg-cyan/20"
            } transition-colors flex items-center gap-1 cursor-pointer font-mono`}
          >
            <span>📷</span>
            <span>LIVE MUGSHOT</span>
          </button>
        )}
      </div>

      {mode === "spotify" && (
        <input
          type="text"
          value={spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value)}
          placeholder="https://open.spotify.com/..."
          className="focus-ring w-full neon-border bg-transparent p-3 text-xs mb-3 placeholder:text-fade/60"
        />
      )}

      <div
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`focus-ring neon-border cursor-pointer flex items-center justify-center text-center h-56 overflow-hidden relative group ${border}`}
      >
        {previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Evidence preview"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-ink tracking-widest gap-2">
              <span>CLICK TO REPLACE FILE</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-3">
            <span className="text-xs text-fade leading-relaxed">
              {mode === "selfie" ? "drop the selfie here" : "drop the Wrapped screenshot"}
              <br />
              <span className="text-[10px]">or click to browse files</span>
            </span>
            {mode === "selfie" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBooth?.();
                }}
                className="mt-3 border border-cyan/60 bg-cyan/15 hover:bg-cyan/30 text-cyan text-[10px] px-3 py-1 tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-neon"
              >
                <span>📷</span>
                <span>OPEN MUGSHOT BOOTH</span>
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-fade mt-2">
        {mode === "selfie"
          ? "JPG, PNG, WEBP · or capture live via camera"
          : "JPG, PNG, WEBP · HEIC gets auto-converted"}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="user"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}

function HistoryPanel({ history, onClose, onClear }) {
  return <div className="history-overlay" role="dialog" aria-modal="true"><div className="history-panel crt-frame"><div className="scanlines" /><div className="relative p-6 lg:p-8"><div className="flex items-start justify-between gap-4 mb-6"><div><p className="text-[10px] text-cyan tracking-widest">LOCAL MEMORY // PRIVATE TO THIS BROWSER</p><h2 className="font-display text-3xl text-purple glow-text mt-1">YOUR CRIMINAL RECORD</h2><p className="text-[10px] text-fade mt-2">past scans. questionable decisions. absolutely no character development.</p></div><button onClick={onClose} className="text-cyan text-xl">×</button></div>{history.length === 0 ? <div className="border border-purple/25 p-8 text-center text-fade text-sm">NO PRIOR OFFENSES FOUND.<br /><span className="text-[10px]">give it a minute.</span></div> : <div className="space-y-2 max-h-[55vh] overflow-auto">{[...history].reverse().map((item, i) => <div key={item.id || i} className="history-row"><div><span className="text-[9px] text-cyan tracking-widest">{item.userMode === "duo" ? "BATTLE" : "SOLO"} · {String(item.mode || "selfie").toUpperCase()}</span><p className="text-sm text-ink mt-1">{item.names || "UNKNOWN OFFENDER"}</p><p className="text-[10px] text-fade mt-1">{item.verdict || item.summary || "case file incomplete"}</p></div><div className="text-right shrink-0"><p className="text-lg text-magenta">{item.score ?? "—"}</p><p className="text-[8px] text-fade">{item.archetype || "SCAN"}</p></div></div>)}</div>}<div className="flex justify-between mt-5"><button onClick={onClear} className="text-[9px] tracking-widest text-magenta hover:text-ink">PURGE RECORD</button><button onClick={onClose} className="text-[9px] tracking-widest text-cyan">CLOSE TERMINAL</button></div></div></div></div>;
}
