"use client";
import WebcamGestureMP from "../gesture/WebcamGestureMP";
import { useGesture } from "../gesture/GestureContext";

export default function ControlsPanel() {
  const { handCount } = useGesture();
  return (
    <aside className="space-y-6">
      <div className="controls-panel bg-card p-6">
        <h2 className="text-xl font-semibold text-card-foreground">
          Game Controls
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Brush your hand quickly to speed obstacles. Tilt up/down for lanes.
        </p>
        {/* <p className="mt-2 text-xs text-muted-foreground">
          Hands detected: {handCount}
        </p> */}
      </div>
    </aside>
  );
}
