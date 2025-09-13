"use client";
import { useEffect, useRef, useState } from "react";
import { useGestureBus, GESTURES } from "./GestureContext";

/**
 * This component:
 *  - Shows a webcam preview
 *  - (Placeholder) Runs a detection loop
 *  - Publishes recognized gestures via the GestureContext
 *
 * Replace the "demoDetector" with MediaPipe or TF.js and call emitGesture(...)
 */
export default function WebcamGesture() {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const { emitGesture, lastGesture } = useGestureBus();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // Boot the webcam
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 360 } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      } catch (e) {
        setError(e?.message || "Camera access denied");
      }
    })();
    return () => {
      // cleanup camera
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ====== PLACEHOLDER DETECTOR: maps arrow keys to gestures for dev/testing ======
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") emitGesture(GESTURES.MOVE_LEFT);
      if (e.key === "ArrowRight") emitGesture(GESTURES.MOVE_RIGHT);
      if (e.key === " ") emitGesture(GESTURES.JUMP);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emitGesture]);

  // ====== Hook your real model here (runs every animation frame) ======
  useEffect(() => {
    if (!ready) return;
    const loop = () => {
      // Example integration outline:
      // 1) Run your model on the current video frame
      // 2) Interpret landmarks → map to stable gesture id
      // 3) emitGesture('MOVE_LEFT') etc. when a gesture is confidently recognized

      // Pseudocode:
      // const landmarks = await handsModel.estimateHands(videoRef.current);
      // const gesture = myClassifier(landmarks);
      // if (gesture) emitGesture(gesture);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, emitGesture]);

  return (
    <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-4">
      <div className="text-neutral-300 text-sm mb-3">Web cam</div>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-800">
        {error ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-red-300 px-4">{error}</div>
        ) : (
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        )}
      </div>
      <div className="mt-3 text-xs text-neutral-400">
        Last gesture: <span className="text-neutral-200 font-medium">{lastGesture}</span>
      </div>
      <div className="mt-1 text-[11px] text-neutral-500">
        Tip: during development press ⬅️ ➡️ or Space to simulate gestures.
      </div>
    </div>
  );
}
