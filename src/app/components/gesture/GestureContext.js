"use client";
import { createContext, useContext, useMemo, useState, useCallback } from "react";

/** Discrete lanes from your PoC */
export const LANE = { UP: "up", FRONT: "front", DOWN: "down" };

const GestureContext = createContext(null);

export function GestureProvider({ children }) {
  const [live, setLive] = useState(false);        // camera live?
  const [handCount, setHandCount] = useState(0);  // # of detected hands
  const [lane, setLane] = useState(LANE.FRONT);   // up/front/down
  const [brush, setBrush] = useState(0);          // smoothed brushing impact (continuous)

  const value = useMemo(
    () => ({
      // live camera state
      live,
      setLive,
      // signals from detector
      handCount,
      setHandCount,
      lane,
      setLane,
      brush,
      setBrush,
    }),
    [live, handCount, lane, brush]
  );

  return <GestureContext.Provider value={value}>{children}</GestureContext.Provider>;
}

export function useGesture() {
  const ctx = useContext(GestureContext);
  if (!ctx) throw new Error("useGesture must be used inside <GestureProvider>");
  return ctx;
}
