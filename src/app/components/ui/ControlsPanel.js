"use client";
import WebcamGesture from "../gesture/WebcamGesture";

export default function ControlsPanel() {
  return (
    <aside className="space-y-6">
      <div className="rounded-2xl ring-1 ring-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-xl font-semibold text-neutral-100">Game Controls</h2>
        <p className="mt-3 text-sm text-neutral-400">
          Brush your teeth to control the player
        </p>
      </div>

      <WebcamGesture />
    </aside>
  );
}
