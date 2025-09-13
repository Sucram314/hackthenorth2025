"use client";
import WebcamGestureMP from "../gesture/WebcamGestureMP";
import { useGesture } from "../gesture/GestureContext";

export default function ControlsPanel() {
  const { handCount } = useGesture();
  return (
    <aside className="space-y-6">
      <div className="rounded-2xl ring-1 ring-border bg-card p-6">
        <h2 className="pixel-text">
          Ready to hack the plaque?
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Brush different sides of your teeth to switch lanes.<br />
          Collect coins and avoid vehicles.<br />
          Don't stop brushing or you'll get caught by the Candy!
        </p>
        {/* <p className="mt-2 text-xs text-muted-foreground">
          Hands detected: {handCount}
        </p> */}
      </div>
    </aside>
  );
}
