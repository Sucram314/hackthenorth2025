"use client";
import { useEffect, useRef, useState } from "react";
import { useGestureBus, GESTURES } from "../gesture/GestureContext";

/**
 * Simple runner: a circle you can move left/right and jump.
 * Listens to gestures published by WebcamGesture via the GestureContext.
 */
export default function GameCanvas({ playing }) {
  const canvasRef = useRef(null);
  const { subscribe } = useGestureBus();
  const [w, h] = [960, 540]; // canvas dimensions
  const playerRef = useRef({ x: 120, y: h - 60, vx: 0, vy: 0, onGround: true });

  // Handle gestures → mutate velocity/position
  useEffect(() => {
    const unsub = subscribe((gesture) => {
      if (!playing) return;
      const p = playerRef.current;
      switch (gesture) {
        case GESTURES.MOVE_LEFT:
          p.vx = Math.max(p.vx - 1.6, -8);
          break;
        case GESTURES.MOVE_RIGHT:
          p.vx = Math.min(p.vx + 1.6, 8);
          break;
        case GESTURES.JUMP:
          if (p.onGround) {
            p.vy = -14;
            p.onGround = false;
          }
          break;
        default:
      }
    });
    return () => unsub();
  }, [playing, subscribe]);

  // Physics + draw loop
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    let raf;

    const groundY = h - 40;

    const step = () => {
      // physics
      const p = playerRef.current;
      p.x += p.vx;
      p.vx *= 0.9; // friction
      p.vy += 0.9; // gravity
      p.y += p.vy;

      // ground collision
      if (p.y > groundY) {
        p.y = groundY;
        p.vy = 0;
        p.onGround = true;
      }

      // walls
      if (p.x < 20) p.x = 20;
      if (p.x > w - 20) p.x = w - 20;

      // draw
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      // ground
      ctx.fillStyle = "#171717";
      ctx.fillRect(0, groundY, w, h - groundY);

      // player
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // title text when not playing
      if (!playing) {
        ctx.fillStyle = "#d4d4d4";
        ctx.font = "28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Main Game Area", w / 2, h / 2);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [w, h, playing]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      className="w-full h-[540px] rounded-2xl bg-white"
    />
  );
}
