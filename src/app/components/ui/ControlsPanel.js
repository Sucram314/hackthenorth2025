"use client";
import WebcamGestureMP from "../gesture/WebcamGestureMP";
import { useGesture } from "../gesture/GestureContext";

export default function ControlsPanel() {
  const { handCount } = useGesture();
  return (
    <aside className="space-y-6">
      <div className="rounded-2xl ring-1 ring-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-xl font-semibold text-neutral-100">
          Game Controls
        </h2>
        <p className="mt-3 text-sm text-neutral-400">
          Brush your hand quickly to speed obstacles. Tilt up/down for lanes.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Hands detected: {handCount}
        </p>
      </div>
    </aside>
  );
}
