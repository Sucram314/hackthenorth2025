"use client";
import { useEffect, useRef, useState } from "react";
import { useGesture, LANE } from "./GestureContext";

/**
 * Webcam + MediaPipe Hands (Tasks API) with the SAME logic from your PoC:
 * - Hysteresis lane mapping via pitch   (getLaneFromPitch)
 * - Brushing value with decay + smoothing (+ depth scaling)
 * - Hand count + simple landmark overlay
 *
 * UI: Start/Stop buttons + small video/overlay tile.
 */
export default function WebcamGestureMP() {
  const { setLive, setLane, setBrush, setHandCount } = useGesture();

  const videoRef = useRef(null);
  const canRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ===== Model/Drawer holders (lazy-loaded from CDN) =====
  const detectorRef = useRef(null);
  const drawerRef = useRef(null);

  // ===== State/const copied from PoC =====
  const HISTORY_SIZE = 10;
  const handX = useRef([]);
  const brushingValue = useRef(0);
  const BRUSHING_DECAY = 0.9;
  const BRUSHING_IMPACT_FACTOR = 3;
  const SMOOTHING_ALPHA = 0.1;
  const smoothedImpact = useRef(0);

  const REFERENCE_DEPTH_Z = -0.1;
  const DEPTH_SCALING_FACTOR = 1;

  // Hysteresis
  const currentLaneState = useRef(LANE.FRONT);

  // ===== helpers copied/adapted from PoC =====
  function estimateHandRotation(lm) {
    const wrist = lm[0];
    const middleMcp = lm[9];
    const pinkyMcp = lm[17];

    const vecUpX = middleMcp.x - wrist.x;
    const vecUpY = middleMcp.y - wrist.y;
    const vecUpZ = middleMcp.z - wrist.z;
    const magUp = Math.hypot(vecUpX, vecUpY, vecUpZ);
    const normUpY = vecUpY / magUp;

    const pitch = Math.asin(normUpY) * (180 / Math.PI); // up/down tilt
    const vecSideX = pinkyMcp.x - wrist.x;
    const vecSideY = pinkyMcp.y - wrist.y;
    const roll = Math.atan2(vecSideY, vecSideX) * (180 / Math.PI);
    const yaw = Math.atan2(vecUpX, -vecUpZ) * (180 / Math.PI);

    return {
      yaw: +yaw.toFixed(2),
      pitch: +pitch.toFixed(2),
      roll: +roll.toFixed(2),
    };
  }

  function getLaneFromPitch(pitch) {
    const BASE_UP = -60;
    const BASE_DOWN = 30;
    const BIAS = 10;

    let upTh = BASE_UP;
    let downTh = BASE_DOWN;
    const state = currentLaneState.current;

    if (state === LANE.UP) {
      upTh = BASE_UP + BIAS;
    } else if (state === LANE.DOWN) {
      downTh = BASE_DOWN - BIAS;
    } else {
      upTh = BASE_UP - BIAS;
      downTh = BASE_DOWN + BIAS;
    }

    let newState;
    if (pitch < upTh) newState = LANE.DOWN;   // selfie view reversal
    else if (pitch > downTh) newState = LANE.UP;
    else newState = LANE.FRONT;

    currentLaneState.current = newState;
    return newState;
  }

  // ====== start / stop camera ======
  async function ensureDetector() {
    if (detectorRef.current) return detectorRef.current;

    setLoading(true);
    try {
      const mod = await import("@mediapipe/tasks-vision");
      const { FilesetResolver, HandLandmarker, DrawingUtils } = mod;

      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      detectorRef.current = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      drawerRef.current = { DrawingUtils, HandLandmarker }; // store class + static connections
    } finally {
      setLoading(false);
    }
    return detectorRef.current;
  }

  async function start() {
    try {
      await ensureDetector();
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      });
      const v = videoRef.current;
      v.srcObject = streamRef.current;
      await v.play();

      setLive(true);
      setErr("");

      loop();
    } catch (e) {
      setErr(e?.message || String(e));
      stop();
    }
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    setLive(false);
    setHandCount(0);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const ctx = canRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canRef.current.width, canRef.current.height);
  }

  useEffect(() => {
    return () => stop();
  }, []);

  // ====== main loop (detect + publish) ======
  async function loop() {
    const v = videoRef.current;
    const c = canRef.current;
    if (!v?.videoWidth) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");

    const det = await ensureDetector();
    const { DrawingUtils, HandLandmarker } = drawerRef.current;
    const drawer = new DrawingUtils(ctx);

    const now = performance.now();

    // draw the video (mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(v, -c.width, 0, c.width, c.height);
    ctx.restore();

    const res = det.detectForVideo(v, now);
    brushingValue.current *= BRUSHING_DECAY; // decay each frame

    let depthScale = 1.0;

    if (res?.landmarks?.length) {
      const lm = res.landmarks[0]; // single hand
      setHandCount(res.landmarks.length);

      // draw landmarks (on mirrored video we still overlay in screen space)
      drawer.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, { lineWidth: 2 });
      drawer.drawLandmarks(lm, { radius: 2 });

      const rot = estimateHandRotation(lm);
      const newLane = getLaneFromPitch(rot.pitch);
      setLane(newLane);

      // depth-scaled “brushing”
      const wristX = lm[0].x * c.width;
      const wristZ = lm[0].z;
      depthScale = Math.max(0.5, Math.min(Math.pow(REFERENCE_DEPTH_Z / wristZ, DEPTH_SCALING_FACTOR), 3.0));

      handX.current.push(wristX);
      if (handX.current.length > HISTORY_SIZE) handX.current.shift();

      if (handX.current.length === HISTORY_SIZE) {
        let minX = handX.current[0], maxX = handX.current[0], total = 0;
        for (let i = 1; i < HISTORY_SIZE; i++) {
          const x = handX.current[i];
          const px = handX.current[i - 1];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          total += Math.abs(x - px);
        }
        const range = maxX - minX;
        const currentBrushing = ((range * 0.01) + (total * 0.005)) * depthScale;
        if (currentBrushing > brushingValue.current) {
          brushingValue.current = currentBrushing;
        }
      }
    } else {
      setHandCount(0);
      // when no hand, keep last lane & let brush decay
    }

    // smoothing to publish
    smoothedImpact.current =
      smoothedImpact.current * (1 - SMOOTHING_ALPHA) + brushingValue.current * SMOOTHING_ALPHA;
    setBrush(smoothedImpact.current * BRUSHING_IMPACT_FACTOR); // publish scaled value (same factor as game expects)

    // HUD text
    ctx.fillStyle = "#fff";
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
    ctx.fillText(`Brushing: ${brushingValue.current.toFixed(2)}  (smoothed*impact: ${smoothedImpact.current.toFixed(2)})`, 10, 18);

    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-300">Web cam</p>
        <div className="flex gap-2">
          <button onClick={start} disabled={loading} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm">
            {loading ? "Loading…" : "Start"}
          </button>
          <button onClick={stop} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm">Stop</button>
        </div>
      </div>

      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}

      <div className="relative mt-3 aspect-video rounded-xl overflow-hidden bg-neutral-800">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        <canvas ref={canRef} className="absolute inset-0 h-full w-full" />
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        Uses MediaPipe Tasks Vision (Hands). Allow camera access.
      </p>
    </div>
  );
}
