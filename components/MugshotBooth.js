"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playSound } from "./Soundboard";

export default function MugshotBooth({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [flash, setFlash] = useState(false);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access or upload an image instead."
          : `Camera error: ${err.message || "Failed to initialize video."}`
      );
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Handle capture sequence with 3-2-1 countdown
  const initiateCountdown = () => {
    if (!cameraReady || countdown !== null) return;
    setCountdown(3);
    playSound("beep");

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playSound("beep");
      } else {
        clearInterval(interval);
        setCountdown(null);
        takeSnapshot();
      }
    }, 750);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Trigger white flash and shutter sound
    playSound("shutter");
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    // Flip horizontally for natural mirror selfie effect
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `mugshot-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        setCapturedBlobUrl(url);
        setCapturedFile(file);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const confirmEvidence = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  const retake = () => {
    if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-[#040207]/90 backdrop-blur-md select-none">
      <div className="scanlines pointer-events-none" />

      {/* Screen flash effect */}
      {flash && <div className="fixed inset-0 z-50 bg-white opacity-90 transition-opacity duration-200 pointer-events-none" />}

      <div className="relative w-full max-w-2xl crt-frame border border-cyan/50 bg-[#0B0616] p-6 sm:p-8 shadow-2xl flex flex-col items-center">
        
        {/* Top Telemetry Header */}
        <div className="w-full flex items-center justify-between border-b border-purple/20 pb-3 mb-4 text-[10px] tracking-widest text-fade">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse" />
            <span className="text-cyan font-semibold">CYBER MUGSHOT BOOTH // CAM-01</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fade hover:text-ink font-mono text-sm"
          >
            ✕ CANCEL
          </button>
        </div>

        {/* Viewfinder Frame */}
        <div className="relative w-full aspect-[4/3] max-h-[460px] bg-black border border-purple/40 overflow-hidden flex items-center justify-center">
          
          {/* Live Video (Mirrored) */}
          {!capturedBlobUrl && (
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                cameraReady ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Captured Preview */}
          {capturedBlobUrl && (
            <img
              src={capturedBlobUrl}
              alt="Mugshot Preview"
              className="w-full h-full object-cover"
            />
          )}

          {/* Loading / Error States */}
          {!cameraReady && !capturedBlobUrl && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-cyan text-xs tracking-widest gap-2">
              <span className="cursor-blink">INITIALIZING OPTICAL SENSORS...</span>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-black/90 text-magenta text-xs tracking-wider gap-3">
              <span>⚠️ {cameraError}</span>
              <button
                type="button"
                onClick={startCamera}
                className="border border-magenta/60 px-4 py-1.5 text-[10px] text-ink hover:bg-magenta/20"
              >
                RETRY CAMERA
              </button>
            </div>
          )}

          {/* HUD Target Reticle Overlay (During Live Video) */}
          {cameraReady && !capturedBlobUrl && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan/80" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan/80" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan/80" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan/80" />

              {/* Center Face Alignment Box */}
              <div className="w-56 h-64 border border-dashed border-cyan/40 rounded-3xl flex flex-col justify-between p-2 text-center text-[9px] text-cyan/70 tracking-widest">
                <span>[ ALIGN FACE HERE ]</span>
                <span>TARGET ACQUISITION</span>
              </div>

              {/* Crosshair ticker */}
              <div className="absolute bottom-2 left-4 text-[8px] text-fade font-mono">
                OPTICAL FEED: 30 FPS · ACTIVE
              </div>
            </div>
          )}

          {/* Countdown Indicator */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
              <span className="font-display text-8xl text-magenta glow-text-magenta animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-between gap-4 mt-5 pt-3 border-t border-purple/20">
          {!capturedBlobUrl ? (
            <>
              <span className="text-[10px] text-fade tracking-wider hidden sm:inline">
                Look directly into camera · No filters allowed
              </span>
              <button
                type="button"
                onClick={initiateCountdown}
                disabled={!cameraReady || countdown !== null}
                className="focus-ring border border-magenta bg-magenta/25 hover:bg-magenta/40 text-ink px-8 py-3 text-xs font-semibold tracking-[0.2em] shadow-neonMagenta transition-all ml-auto disabled:opacity-40"
              >
                {countdown !== null ? `SNAP IN ${countdown}...` : "📸 SNAP MUGSHOT"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={retake}
                className="focus-ring border border-purple/50 hover:border-purple text-fade hover:text-ink px-5 py-2.5 text-xs tracking-widest transition-all"
              >
                🔄 RETAKE
              </button>
              <button
                type="button"
                onClick={confirmEvidence}
                className="focus-ring border border-cyan bg-cyan/25 hover:bg-cyan/40 text-ink px-7 py-2.5 text-xs font-semibold tracking-[0.2em] shadow-neon transition-all"
              >
                LOCK EVIDENCE →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
