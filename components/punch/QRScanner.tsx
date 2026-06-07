// components/punch/QRScanner.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { QrCode, X, CheckCircle2, AlertCircle, Camera } from "lucide-react";

interface QRScannerProps {
  expectedCode?: string;  // location-specific QR code value
  onVerified:    (code: string) => void;
  onClose:       () => void;
}

// BarcodeDetector API (supported in modern Chrome/Android)
declare global {
  interface Window { BarcodeDetector?: any; }
}

export default function QRScanner({ expectedCode, onVerified, onClose }: QRScannerProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);

  const [state,   setState]  = useState<"idle"|"scanning"|"verified"|"error">("idle");
  const [message, setMessage]= useState<string | null>(null);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  async function startScan() {
    setState("scanning"); setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Try BarcodeDetector API first (Chrome Android)
      if (typeof window !== "undefined" && window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const detect = async () => {
          if (!videoRef.current || state !== "scanning") return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              handleCode(codes[0].rawValue);
              return;
            }
          } catch {}
          rafRef.current = requestAnimationFrame(detect);
        };
        videoRef.current?.addEventListener("play", () => { rafRef.current = requestAnimationFrame(detect); });
      } else {
        // Fallback: manual QR entry
        setMessage("Auto-scan unavailable. Enter the QR code value manually.");
      }
    } catch (err: any) {
      setState("error");
      setMessage("Camera access denied. Please allow camera permissions.");
    }
  }

  function handleCode(code: string) {
    stopStream();
    if (expectedCode && code !== expectedCode) {
      setState("error");
      setMessage(`Invalid QR code for this location. Please scan the correct QR code.`);
      return;
    }
    setState("verified");
    setMessage(`QR code verified! ✓`);
    setTimeout(() => onVerified(code), 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">QR Verification</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-square mb-4">
          {state === "scanning" && (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* QR frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  {["top-0 left-0","top-0 right-0","bottom-0 left-0","bottom-0 right-0"].map((pos, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-white border-2 ${pos}`}
                      style={{
                        borderTop:    i < 2 ? "3px solid white" : "none",
                        borderBottom: i >= 2 ? "3px solid white" : "none",
                        borderLeft:   i % 2 === 0 ? "3px solid white" : "none",
                        borderRight:  i % 2 === 1 ? "3px solid white" : "none",
                        borderRadius: i === 0 ? "4px 0 0 0" : i === 1 ? "0 4px 0 0" : i === 2 ? "0 0 0 4px" : "0 0 4px 0",
                      }} />
                  ))}
                  {/* Scan line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 animate-bounce" style={{ top: "50%" }} />
                </div>
              </div>
            </>
          )}

          {state === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
              <QrCode className="w-12 h-12" />
              <p className="text-sm">Tap below to scan</p>
            </div>
          )}

          {state === "verified" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-900/80">
              <CheckCircle2 className="w-14 h-14 text-emerald-400" />
              <p className="text-white font-semibold">Verified!</p>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-900/50 px-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-red-300 text-sm text-center">{message}</p>
            </div>
          )}
        </div>

        {message && state !== "error" && (
          <p className="text-xs text-slate-400 text-center mb-3">{message}</p>
        )}

        {/* Manual entry fallback */}
        {state === "scanning" && message && (
          <ManualQREntry onSubmit={handleCode} />
        )}

        {state === "idle" && (
          <button onClick={startScan}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" />Scan QR Code
          </button>
        )}

        {state === "error" && (
          <button onClick={() => setState("idle")}
            className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

function ManualQREntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Enter code manually"
        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      <button onClick={() => val.trim() && onSubmit(val.trim())}
        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">OK</button>
    </div>
  );
}
