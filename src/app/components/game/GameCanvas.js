"use client";
import { useEffect, useRef, useState } from "react";
import { useGesture, LANE } from "../gesture/GestureContext";

/**
 * Canvas game ported from your PoC:
 * - 3 lanes + player disk
 * - Obstacles: car/truck/train, with widths, spacing, colors, details
 * - Collectibles (coins)
 * - Score & 2-minute timer
 * - Obstacle speed boosted by "brushing" from the webcam component
 * - Lane selection driven by pitch (up/front/down)
 */
export default function GameCanvas({ playing }) {
  const gestureContext = useGesture();
  const lane = gestureContext?.lane ?? LANE.FRONT;
  const brush = gestureContext?.brush ?? 0;
  const live = gestureContext?.live ?? false;
  const laneRef = useRef(lane);
  const brushRef = useRef(brush);

  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);
  useEffect(() => {
    brushRef.current = brush;
  }, [brush]);

  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameOver, setGameOver] = useState(false);

  // --- dimensions / constants (adapted from PoC) ---
  const W = 960,
    H = 540;
  const PLAYER_SIZE = 40;
  const OBSTACLE_HEIGHT = 60;
  const COLLECTIBLE_SIZE = 20;
  const OBSTACLE_SPACING = 500;
  const COLLECTIBLE_SPACING = 250;
  const NUMBER_OF_OBS = 10;
  const NUMBER_OF_COL = 20;

  const stateRef = useRef(null);
  if (!stateRef.current) {
    stateRef.current = {
      lanes: [0, 1, 2],
      laneH: H / 3,
      x: W / 4,
      y: (H / 3) * 1.5,
      ty: (H / 3) * 1.5,
      vx: 0,
      vy: 0,
      obstacles: [],
      collectibles: [],
      baseObstacleSpeed: 2,
    };
  }

  // timer lifecycle (starts when playing turns true)
  useEffect(() => {
    if (!playing) return;
    setGameOver(false);
    setScore(0);
    setTimeLeft(120);

    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setGameOver(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing]);

  // build a new level whenever we (re)start
  useEffect(() => {
    const S = stateRef.current;
    S.laneH = H / 3;
    S.y = S.ty = S.laneH * 1.5;
    S.obstacles = [];
    S.collectibles = [];

    // Obstacles
    for (let i = 0; i < NUMBER_OF_OBS; i++) {
      const initialX = W + i * OBSTACLE_SPACING;
      S.obstacles.push(createObstacle(initialX, S));
    }
    // Collectibles
    for (let i = 0; i < NUMBER_OF_COL; i++) {
      const initialX = W + i * COLLECTIBLE_SPACING;
      const c = createCollectible(initialX, S);
      if (c) S.collectibles.push(c);
    }
  }, [playing]);

  function obstacleSpec() {
    const types = [
      { type: "car", mult: 2, color: "#e84c3d" },
      { type: "truck", mult: 3, color: "#f1c40f" },
      { type: "train", mult: 4, color: "#3498db" },
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  function createObstacle(initialX, S) {
    const spec = obstacleSpec();
    const lane = S.lanes[Math.floor(Math.random() * S.lanes.length)];
    const width = OBSTACLE_HEIGHT * spec.mult;
    return {
      lane,
      x: initialX + width,
      height: OBSTACLE_HEIGHT,
      width,
      color: spec.color,
      type: spec.type,
    };
  }

  function createCollectible(initialX, S) {
    let tries = 0;
    while (tries++ < 100) {
      const lane = S.lanes[Math.floor(Math.random() * S.lanes.length)];
      const y = S.laneH * lane + S.laneH / 2;
      const x = initialX + Math.random() * (W / 2);

      // avoid overlap with any obstacle
      const hit = S.obstacles.some((o) => {
        const oy = S.laneH * o.lane + S.laneH / 2;
        return !(
          x + COLLECTIBLE_SIZE / 2 < o.x - o.width / 2 ||
          x - COLLECTIBLE_SIZE / 2 > o.x + o.width / 2 ||
          y + COLLECTIBLE_SIZE / 2 < oy - o.height / 2 ||
          y - COLLECTIBLE_SIZE / 2 > oy + o.height / 2
        );
      });
      if (!hit) return { lane, x, y, size: COLLECTIBLE_SIZE, color: "#FFD700" };
    }
    return null;
  }

  function targetYFromLane(l, S) {
    if (l === LANE.UP) return S.laneH / 2;
    if (l === LANE.DOWN) return S.laneH * 2.5;
    return S.laneH * 1.5;
  }

  function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
    const left = rx,
      right = rx + rw,
      top = ry,
      bottom = ry + rh;
    const nearestX = Math.max(left, Math.min(cx, right));
    const nearestY = Math.max(top, Math.min(cy, bottom));
    const dx = cx - nearestX,
      dy = cy - nearestY;
    return dx * dx + dy * dy <= r * r;
  }

  // main game loop
  useEffect(() => {
    if (!playing) return;

    const ctx = canvasRef.current.getContext("2d");
    let prev = 0;

    function step(ts) {
      if (gameOver) {
        draw(ctx, true);
        return;
      }
      const dt = (ts - prev) / 16.67; // ~ frames
      prev = ts;

      update(dt);
      draw(ctx, false);
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, gameOver]);

  function update() {
    const S = stateRef.current;

    // lane following (smooth)
    S.ty = targetYFromLane(laneRef.current, S);
    if (Math.abs(S.ty - S.y) > 1) S.y += (S.ty - S.y) * 0.1;
    else S.y = S.ty;

    // move obstacles with brushing boost
    const boost = Math.max(0, brushRef.current);
    let collidedIdx = -1;

    for (let i = S.obstacles.length - 1; i >= 0; i--) {
      const o = S.obstacles[i];
      o.x -= S.baseObstacleSpeed + boost;

      // collision
      const oy = S.laneH * o.lane + S.laneH / 2;
      const ox = o.x - o.width / 2;
      if (
        circleRectCollision(
          S.x,
          S.y,
          PLAYER_SIZE / 2,
          ox,
          oy - o.height / 2,
          o.width,
          o.height
        )
      ) {
        collidedIdx = i;
      }

      // recycle off-screen
      if (o.x + o.width / 2 < 0) {
        S.obstacles.splice(i, 1);
        const last = S.obstacles[S.obstacles.length - 1];
        const newX = last ? last.x + OBSTACLE_SPACING : W;
        S.obstacles.push(createObstacle(newX, S));
      }
    }

    // simple resolve on collision: push around obstacle (same spirit as PoC)
    if (collidedIdx !== -1) {
      const o = S.obstacles[collidedIdx];
      const oy = S.laneH * o.lane + S.laneH / 2;
      if (S.x < o.x - o.width / 2) {
        const push = S.x + PLAYER_SIZE / 2 - (o.x - o.width / 2);
        for (const ob of S.obstacles) ob.x += push;
        for (const co of S.collectibles) co.x += push;
      } else {
        if (S.y < oy) S.y = oy - o.height / 2 - PLAYER_SIZE / 2;
        else S.y = oy + o.height / 2 + PLAYER_SIZE / 2;
        S.ty = S.y;
      }
    }

    // collectibles
    for (let i = S.collectibles.length - 1; i >= 0; i--) {
      const c = S.collectibles[i];
      c.x -= S.baseObstacleSpeed + boost;

      // collide
      if (
        circleRectCollision(
          S.x,
          S.y,
          PLAYER_SIZE / 2,
          c.x - c.size / 2,
          c.y - c.size / 2,
          c.size,
          c.size
        )
      ) {
        setScore((s) => s + 1);
        S.collectibles.splice(i, 1);
        const last = S.collectibles[S.collectibles.length - 1];
        const newX = last ? last.x + COLLECTIBLE_SPACING : W;
        const nc = createCollectible(newX, S);
        if (nc) S.collectibles.push(nc);
        continue;
      }

      // recycle off-screen
      if (c.x + c.size / 2 < 0) {
        S.collectibles.splice(i, 1);
        const last = S.collectibles[S.collectibles.length - 1];
        const newX = last ? last.x + COLLECTIBLE_SPACING : W;
        const nc = createCollectible(newX, S);
        if (nc) S.collectibles.push(nc);
      }
    }
  }

  function draw(ctx, showGameOver) {
    const S = stateRef.current;
    ctx.clearRect(0, 0, W, H);

    // bg
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    // lanes
    ctx.strokeStyle = "rgba(150,150,150,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, S.laneH);
    ctx.lineTo(W, S.laneH);
    ctx.moveTo(0, S.laneH * 2);
    ctx.lineTo(W, S.laneH * 2);
    ctx.stroke();

    // player
    ctx.beginPath();
    ctx.arc(S.x, S.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#5ad";
    ctx.fill();

    // obstacles
    for (const o of S.obstacles) {
      const cy = S.laneH * o.lane + S.laneH / 2;
      const ox = o.x - o.width / 2;
      const oy = cy - o.height / 2;
      ctx.fillStyle = o.color;
      ctx.fillRect(ox, oy, o.width, o.height);

      // minimal “details” (car/truck/train) as in PoC
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      if (o.type === "car") {
        ctx.fillRect(
          ox + o.width * 0.2,
          oy + o.height * 0.1,
          o.width * 0.6,
          o.height * 0.3
        );
        ctx.fillRect(
          ox + o.width * 0.2,
          oy + o.height * 0.6,
          o.width * 0.6,
          o.height * 0.3
        );
      } else if (o.type === "truck") {
        ctx.fillRect(ox, oy, o.width * 0.3, o.height);
      } else if (o.type === "train") {
        ctx.fillRect(
          ox + o.width * 0.1,
          oy + o.height * 0.2,
          o.width * 0.15,
          o.height * 0.6
        );
        ctx.fillRect(
          ox + o.width * 0.3,
          oy + o.height * 0.2,
          o.width * 0.15,
          o.height * 0.6
        );
        ctx.fillRect(
          ox + o.width * 0.5,
          oy + o.height * 0.2,
          o.width * 0.15,
          o.height * 0.6
        );
        ctx.fillRect(
          ox + o.width * 0.7,
          oy + o.height * 0.2,
          o.width * 0.15,
          o.height * 0.6
        );
      }
    }

    // collectibles
    for (const c of S.collectibles) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
    }

    // HUD
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px ui-sans-serif, system-ui, -apple-system";
    ctx.fillText(`Score: ${score}`, 12, 22);
    ctx.fillText(
      `Time: ${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
        timeLeft % 60
      ).padStart(2, "0")}`,
      12,
      42
    );
    ctx.fillText(`Boost: ${brushRef.current.toFixed(2)}`, 12, 62);
    ctx.fillText(`Lane: ${laneRef.current}`, 12, 82);
    if (!live) ctx.fillText(`Camera: off`, 12, 102);

    if (showGameOver) {
      ctx.fillStyle = "rgba(255,0,0,0.7)";
      ctx.font = "bold 48px ui-sans-serif, system-ui, -apple-system";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER!", W / 2, H / 2);
      ctx.font = "bold 24px ui-sans-serif, system-ui, -apple-system";
      ctx.fillText("Start the camera to play again.", W / 2, H / 2 + 40);
      ctx.textAlign = "left";
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full h-[540px] rounded-2xl bg-neutral-900 ring-1 ring-neutral-800"
    />
  );
}
