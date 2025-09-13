"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGesture, LANE } from "../gesture/GestureContext";

// Vehicle image configuration - easily extensible
const vehicleConfig = {
  car: {
    src: "/car.png",
    type: "car",
    mult: 2,
    color: "#e84c3d",
  },
  truck: {
    src: "/truck-kun.png",
    type: "truck",
    mult: 2.2,
    color: "#e84c3d",
  },
  train: {
    src: "/shinkansen.png", // No image, uses drawn graphics
    type: "train",
    mult: 5,
    color: "#3498db",
  },
};

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
  // Extensible vehicle image management system
  const vehicleImagesRef = useRef({});

  const playerhappy1 = useRef(null);
  const playerhappy2 = useRef(null);
  const playerunhappy1 = useRef(null);
  const playerunhappy2 = useRef(null);

  const coin1 = useRef(null);

  useEffect(() => {
    laneRef.current = lane;
  }, [lane]);
  useEffect(() => {
    brushRef.current = brush;
  }, [brush]);

  // Load all vehicle images
  useEffect(() => {
    Object.entries(vehicleConfig).forEach(([key, config]) => {
      if (config.src) {
        const img = new Image();
        img.onload = () => {
          vehicleImagesRef.current[key] = img;
        };
        img.onerror = () => {
          console.warn(`Failed to load vehicle image: ${config.src}`);
        };
        img.src = config.src;
      }
    });

    const h1 = new Image();
    h1.onload = () => {
      playerhappy1.current = h1;
    };
    h1.src = "/happy1.png";

    const h2 = new Image();
    h2.onload = () => {
      playerhappy2.current = h2;
    };
    h2.src = "/happy2.png";

    const u1 = new Image();
    u1.onload = () => {
      playerunhappy1.current = u1;
    };
    u1.src = "/unhappy1.png";

    const u2 = new Image();
    u2.onload = () => {
      playerunhappy2.current = u2;
    };
    u2.src = "/unhappy2.png";

    const c1 = new Image();
    c1.onload = () => {
      coin1.current = c1;
    };
    c1.src = "/coin1.png";
  }, []);

  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameOver, setGameOver] = useState(false);
  const [walkState, setWalkState] = useState(false);
  const [isUnhappy, setUnhappy] = useState(false);

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
      laneLineOffset: 0, // Track horizontal offset for lane line animation
    };
  }

  // timer lifecycle (starts when playing turns true)
  useEffect(() => {
    if (!playing) return;
    setGameOver(false);
    setScore(0);
    setTimeLeft(120);
    setWalkState(false);

    const t2 = setInterval(() => {
      setWalkState((s) => !s);
    }, 300);

    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          clearInterval(t2);
          setGameOver(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [playing]);

  const obstacleSpec = useCallback(() => {
    // Use the vehicle configuration for consistent specs
    const vehicleKeys = Object.keys(vehicleConfig);
    const randomKey =
      vehicleKeys[Math.floor(Math.random() * vehicleKeys.length)];
    const config = vehicleConfig[randomKey];
    return {
      type: config.type,
      mult: config.mult,
      color: config.color,
      vehicleKey: randomKey, // Store the key for image lookup
    };
  }, []);

  const createObstacle = useCallback(
    (initialX, S) => {
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
        vehicleKey: spec.vehicleKey, // Store the vehicle key for image lookup
      };
    },
    [obstacleSpec]
  );

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
  }, [playing, createObstacle]);

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
    ctx.imageSmoothingEnabled = false;
    let prev = 0;

    function update() {
      const S = stateRef.current;

      // lane following (smooth)
      S.ty = targetYFromLane(laneRef.current, S);
      if (Math.abs(S.ty - S.y) > 1) S.y += (S.ty - S.y) * 0.1;
      else S.y = S.ty;

      // move obstacles with brushing boost
      const boost = Math.max(0, brushRef.current);
      let collidedIdx = -1;

      // Update lane line offset for animation (moves left with same speed as obstacles)
      S.laneLineOffset += boost;
      // Reset offset when it goes beyond the dash pattern length (36px total: 18px dash + 18px gap)
      if (S.laneLineOffset <= -36) {
        S.laneLineOffset = 0;
      }

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
        setUnhappy(true);
        const o = S.obstacles[collidedIdx];
        const oy = S.laneH * o.lane + S.laneH / 2;
        if (S.x < o.x - o.width / 2) {
          const push = S.x + PLAYER_SIZE / 2 - (o.x - o.width / 2);
          for (const ob of S.obstacles) ob.x += push;
          for (const co of S.collectibles) co.x += push;
          S.laneLineOffset -= push;
        } else {
          if (S.y < oy) S.y = oy - o.height / 2 - PLAYER_SIZE / 2;
          else S.y = oy + o.height / 2 + PLAYER_SIZE / 2;
          S.ty = S.y;
        }
      } else setUnhappy(false);

      // collectibles
      for (let i = S.collectibles.length - 1; i >= 0; i--) {
        const c = S.collectibles[i];
        c.x -= boost;

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
      ctx.fillStyle = "#242424";
      ctx.fillRect(0, 0, W, H);

      // lanes - animated with offset for seamless looping
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.setLineDash([18, 18]); // 18px dash, 18px gap
      ctx.lineWidth = 4;
      ctx.lineDashOffset = S.laneLineOffset; // Apply the animated offset
      ctx.beginPath();

      ctx.moveTo(0, S.laneH);
      ctx.lineTo(W + 40, S.laneH);

      ctx.moveTo(0, S.laneH * 2);
      ctx.lineTo(W + 40, S.laneH * 2);
      ctx.stroke();

      // Reset line dash offset for other drawing operations
      ctx.lineDashOffset = 0;

      // player
      ctx.drawImage(
        isUnhappy
          ? walkState
            ? playerunhappy1.current
            : playerunhappy2.current
          : walkState
          ? playerhappy1.current
          : playerhappy2.current,
        S.x - PLAYER_SIZE / 2,
        S.y - PLAYER_SIZE / 2,
        PLAYER_SIZE,
        PLAYER_SIZE
      );

      // collectibles
      for (const c of S.collectibles) {
        ctx.drawImage(
          coin1.current,
          c.x - c.size / 2,
          c.y - c.size / 2,
          c.size,
          c.size
        );
      }

      // obstacles
      for (const o of S.obstacles) {
        const cy = S.laneH * o.lane + S.laneH / 2;
        const ox = o.x - o.width / 2;
        const oy = cy - o.height / 2;
        ctx.fillStyle = o.color;

        // Check if we have an image for this vehicle type
        const vehicleImage = vehicleImagesRef.current[o.vehicleKey];
        if (vehicleImage) {
          // Draw the vehicle image
          ctx.drawImage(vehicleImage, ox, oy, o.width, o.height);
        } else {
          // Fallback to drawn graphics (like trains)
          if (o.type === "train") {
            ctx.fillRect(ox, oy, o.width, o.height);
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
          } else {
            // Fallback rectangle for any vehicle without an image
            ctx.fillRect(ox, oy, o.width, o.height);
          }
        }
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
        ctx.textAlign = "left";
      }
    }

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
  }, [
    playing,
    gameOver,
    score,
    timeLeft,
    walkState,
    live,
    createObstacle,
    isUnhappy,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full max-w-4xl aspect-[16/9] rounded-2xl bg-neutral-900 ring-1 ring-neutral-800"
    />
  );
}
