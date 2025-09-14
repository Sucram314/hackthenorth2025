"use client";
import { useState, useRef } from "react";
import {
  GestureProvider,
  useGesture,
} from "@/app/components/gesture/GestureContext";
import HeaderNav from "@/app/components/ui/HeaderNav";
import ControlsPanel from "@/app/components/ui/ControlsPanel";
import GameCanvas from "@/app/components/game/GameCanvas";
import WebcamGestureMP from "@/app/components/gesture/WebcamGestureMP";
import Leaderboard from "@/app/components/ui/Leaderboard";

function HomeInner() {
  const gestureContext = useGesture();
  const live = gestureContext?.live ?? false;
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);

  // Auto-start game when camera goes live (optional quality-of-life)
  if (live && !playing) setTimeout(() => setPlaying(true), 0);

  const handleStartCamera = async () => {
    if (webcamRef.current) {
      setLoading(true);
      try {
        await webcamRef.current.start();
      } catch (error) {
        console.error("Failed to start camera:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <HeaderNav />
      <main className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-8">
        <div>
          <h1>Game</h1>
          <div className="grid grid-cols-12 gap-6">
            <section className="col-span-12 lg:col-span-8">
              <div className="game-panel relative h-full ring-1 ring-border bg-card p-3">
                <GameCanvas playing={playing} />
                {live === false && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <button
                      onClick={handleStartCamera}
                      disabled={loading}
                      className="pixel-button"
                    >
                      {loading ? "Loading…" : "Start Game"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="col-span-12 lg:col-span-4">
              <ControlsPanel />
              <div className="mt-6">
                <WebcamGestureMP ref={webcamRef} />
              </div>
            </section>
          </div>
        </div>

        <div>
          <div className="w-full">
            <Leaderboard/>
          </div>
        </div>

      </main>
    </>
  );
}

export default function Page() {
  return (
    <GestureProvider>
      <HomeInner />
    </GestureProvider>
  );
}
