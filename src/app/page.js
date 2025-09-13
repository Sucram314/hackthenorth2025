"use client";
import { useState } from "react";
import { GestureProvider, useGesture } from "@/app/components/gesture/GestureContext";
import HeaderNav from "@/app/components/ui/HeaderNav";
import ControlsPanel from "@/app/components/ui/ControlsPanel";
import GameCanvas from "@/app/components/game/GameCanvas";

function HomeInner() {
  const { live } = useGesture();
  const [playing, setPlaying] = useState(false);

  // Auto-start game when camera goes live (optional quality-of-life)
  if (live && !playing) setTimeout(() => setPlaying(true), 0);

  return (
    <>
      <HeaderNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl ring-1 ring-neutral-800 bg-neutral-900 p-3">
              <GameCanvas playing={playing} />
            </div>

            <div className="mt-6">
              <h1 className="text-2xl font-semibold">Game Title</h1>
              <p className="mt-2 text-sm text-neutral-400">
                Hand-gesture lane runner. Camera controls the player.
              </p>
              <button
                onClick={() => setPlaying((v) => !v)}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 transition px-6 py-3 font-medium"
              >
                {playing ? "Pause" : "Play"}
              </button>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4">
            <ControlsPanel />
          </section>
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
