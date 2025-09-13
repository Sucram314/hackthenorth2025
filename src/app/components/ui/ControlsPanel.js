"use client";
import WebcamGestureMP from "../gesture/WebcamGestureMP";
import { useGesture } from "../gesture/GestureContext";

export default function ControlsPanel() {
  const { handCount } = useGesture();
  return (
    <aside className="space-y-6">
      <div className="controls-panel bg-card p-6">
        <h2>
          Ready to hack the plaque?
        </h2>
        <ul className="mt-3 text-sm text-muted-foreground">
          <li>Brush the top, front or bottom of your teeth to switch lanes.</li>
          <li>Collect toothpaste and avoid vehicles.</li>
          <li>Be wary about eating candy!</li>
        </ul>
        {/* <p className="mt-2 text-xs text-muted-foreground">
          Hands detected: {handCount}
        </p> */}
      </div>
    </aside>
  );
}
