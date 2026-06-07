// components/punch/SelfiePunch.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, X, AlertCircle } from "lucide-react";

interface SelfiePunchProps {
  onCapture: (imageDataUrl: string) => void;
  onSkip?:   () => void;
  required?: boolean;
}

export default function SelfiePunch({ onCapture, onSkip, required = false }: SelfiePunchProps) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [state,    setState]    = useState<"idle"|"streaming"|"captured"|"error">("idle");
  const [preview,  setPreview]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user"|"environment">("user");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setState("streaming");
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera permissions and try again.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Camera error. Please try again.");
      }
      setState("error");
    }
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    // Mirror for front camera
    if (facingMode === "user") {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPreview(dataUrl);
    stopStream();
    setState("captured");
  }

  function retake() {
    setPreview(null);
    setState("idle");
    startCamera();
  }

  function flipCamera() {
    stopStream();
    setFacingMode(m => m === "user" ? "environment" : "user");
    setState("idle");
    setTimeout(startCamera, 100);
  }

  function confirm() {
    if (preview) onCapture(preview);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-slate-400" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Selfie verification {required ? "(required)" : "(optional)"}
        </p>
      </div>

      {/* Camera / preview area */}
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-[4/3] max-h-64">
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <Camera className="w-7 h-7 text-white/60" />
            </div>
            <p className="text-white/60 text-sm">Camera not active</p>
          </div>
        )}

        {state === "streaming" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 rounded-full border-2 border-white/40 border-dashed" />
            </div>
          </>
        )}

        {state === "captured" && preview && (
          <img src={preview} alt="Captured selfie" className="w-full h-full object-cover" />
        )}

        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-red-400 text-xs text-center">{error}</p>
          </div>
        )}

        {/* Flip camera button */}
        {state === "streaming" && (
          <button onClick={flipCamera}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex gap-2">
        {state === "idle" || state === "error" ? (
          <>
            <button onClick={startCamera}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" />Open Camera
            </button>
            {!required && onSkip && (
              <button onClick={onSkip}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                Skip
              </button>
            )}
          </>
        ) : state === "streaming" ? (
          <button onClick={capture}
            className="flex-1 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98]">
            <div className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900" />
            </div>
            Take Photo
          </button>
        ) : state === "captured" ? (
          <>
            <button onClick={retake}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" />Retake
            </button>
            <button onClick={confirm}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />Use Photo
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
