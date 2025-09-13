"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Available gestures; add more as you wire up your model.
 * Using strings keeps it flexible across components / networking.
 */
export const GESTURES = {
  NONE: "NONE",
  MOVE_LEFT: "MOVE_LEFT",
  MOVE_RIGHT: "MOVE_RIGHT",
  JUMP: "JUMP",
};

const GestureContext = createContext(null);

export function GestureProvider({ children }) {
  const listenersRef = useRef(new Set());
  const [lastGesture, setLastGesture] = useState(GESTURES.NONE);

  const emitGesture = useCallback((gesture, extras = {}) => {
    setLastGesture(gesture);
    for (const cb of listenersRef.current) cb(gesture, extras);
  }, []);

  const subscribe = useCallback((cb) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);

  const value = useMemo(() => ({ lastGesture, emitGesture, subscribe }), [lastGesture, emitGesture, subscribe]);

  return <GestureContext.Provider value={value}>{children}</GestureContext.Provider>;
}

export function useGestureBus() {
  const ctx = useContext(GestureContext);
  if (!ctx) throw new Error("useGestureBus must be used within <GestureProvider>");
  return ctx;
}
