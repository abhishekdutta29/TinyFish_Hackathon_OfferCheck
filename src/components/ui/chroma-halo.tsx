"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ChromaHaloProps {
  className?: string;
  style?: React.CSSProperties;
  /**
   * Color palette for the chromatic blooming ink.
   * If omitted or in adaptive mode, dynamically harmonizes with the background.
   */
  colors?: string[];
  /**
   * Whether to adaptively detect and match the background color under the cursor.
   * When true, samples the DOM background to emit harmonized ink blooms.
   * @default true
   */
  adaptive?: boolean;
  /**
   * Initial spawn radius of the ink droplet (in px).
   * @default 24
   */
  initialRadius?: number;
  /**
   * Maximum expansion radius as the ink blooms out (in px).
   * @default 92
   */
  maxRadius?: number;
  /**
   * Rate at which the ink blooms outward per frame.
   * @default 1.2
   */
  bloomSpeed?: number;
  /**
   * Fade/dissipation decay factor per frame.
   * @default 0.016
   */
  decay?: number;
  /**
   * Peak opacity for freshly spawned ink drops.
   * @default 0.65
   */
  maxOpacity?: number;
  /**
   * Canvas blend mode for blooming ink colors.
   * Defaults to "screen" on dark backgrounds for a soft luminous halo.
   */
  blendMode?: GlobalCompositeOperation;
  /**
   * CSS backdrop or canvas blur in pixels.
   * @default 12
   */
  blur?: number;
}

interface InkDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  decay: number;
  bloomSpeed: number;
  color: string;
  chromaOffset: number;
}

// Default palette harmonized directly with the dark slate-950 / slate-900 canvas
const SLATE_DARK_PALETTE = [
  "#38bdf8", // Sky 400 (Atmospheric cyan-blue glow against dark slate)
  "#2dd4bf", // Teal 400 (Ethereal oceanic mist)
  "#10b981", // Emerald 500 (Brand verification signature)
  "#0ea5e9", // Ocean Sky (Deep luminous blue)
  "#818cf8", // Indigo 400 (Twilight accent harmonizing with slate-950)
  "#94a3b8", // Slate 400 (Soft liquid slate smoke)
];

// Contextual palettes triggered when cursor moves across contextual cards/elements
const THEMATIC_PALETTES = {
  emerald: ["#10b981", "#34d399", "#2dd4bf", "#6ee7b7", "#059669"],
  amber: ["#f59e0b", "#fbbf24", "#f97316", "#fcd34d", "#d97706"],
  rose: ["#f43f5e", "#fb7185", "#f87171", "#fda4af", "#e11d48"],
  indigo: ["#6366f1", "#818cf8", "#a855f7", "#38bdf8", "#4f46e5"],
  cyan: ["#06b6d4", "#22d3ee", "#38bdf8", "#2dd4bf", "#0284c7"],
};

/**
 * ChromaHalo - Soft ink that blooms behind the cursor
 *
 * Dynamically computes chromatic halo colors according to the underlying
 * background color and theme (slate-950 dark canvas, verified cards, warning banners, etc.).
 */
export function ChromaHalo({
  className,
  style,
  colors,
  adaptive = true,
  initialRadius = 24,
  maxRadius = 92,
  bloomSpeed = 1.2,
  decay = 0.016,
  maxOpacity = 0.65,
  blendMode = "screen",
  blur = 12,
}: ChromaHaloProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropsRef = useRef<InkDrop[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const colorIndexRef = useRef(0);
  const currentPaletteRef = useRef<string[]>(colors || SLATE_DARK_PALETTE);
  const lastSampleTimeRef = useRef(0);

  // Helper to convert hex to RGB
  const hexToRgb = useCallback((hex: string): [number, number, number] => {
    let clean = hex.replace("#", "");
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }, []);

  // Parse CSS rgb/rgba into numbers
  const parseCssColor = useCallback(
    (colorStr: string): [number, number, number, number] | null => {
      if (!colorStr || colorStr === "transparent") return null;
      const match = colorStr.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
      );
      if (match) {
        return [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          match[4] !== undefined ? parseFloat(match[4]) : 1,
        ];
      }
      return null;
    },
    []
  );

  // Detect and resolve the background color under coordinates (x, y)
  const detectBackgroundPalette = useCallback(
    (x: number, y: number): string[] => {
      if (typeof document === "undefined") return SLATE_DARK_PALETTE;

      try {
        let el = document.elementFromPoint(x, y);
        while (el && el !== document.documentElement) {
          const style = window.getComputedStyle(el);
          const bg = style.backgroundColor;
          const parsed = parseCssColor(bg);

          if (parsed && parsed[3] > 0.08) {
            const [r, g, b] = parsed;

            // Check if hovering over colored UI elements
            // Emerald / Green
            if (g > r * 1.25 && g > b * 1.1 && g > 70) {
              return THEMATIC_PALETTES.emerald;
            }
            // Rose / Red
            if (r > g * 1.35 && r > b * 1.2 && r > 90) {
              return THEMATIC_PALETTES.rose;
            }
            // Amber / Orange
            if (r > 140 && g > 90 && b < 70) {
              return THEMATIC_PALETTES.amber;
            }
            // Indigo / Violet
            if (b > r && b > g * 1.2 && b > 90) {
              return THEMATIC_PALETTES.indigo;
            }
            // Cyan
            if (b > 110 && g > 110 && r < 90) {
              return THEMATIC_PALETTES.cyan;
            }

            // Dark slate background (slate-950 #020617 / slate-900 #0f172a)
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            if (luminance < 0.2) {
              return SLATE_DARK_PALETTE;
            }
          }
          el = el.parentElement;
        }
      } catch {
        // Fallback safely to slate dark palette
      }

      return SLATE_DARK_PALETTE;
    },
    [parseCssColor]
  );

  const spawnInk = useCallback(
    (x: number, y: number) => {
      const activeColors = currentPaletteRef.current;
      const color = activeColors[colorIndexRef.current % activeColors.length];
      colorIndexRef.current += 1;

      // Slight organic fluid velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.7 + 0.3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      dropsRef.current.push({
        x,
        y,
        vx,
        vy,
        radius: initialRadius * (0.8 + Math.random() * 0.4),
        maxRadius: maxRadius * (0.85 + Math.random() * 0.3),
        alpha: maxOpacity,
        decay: decay * (0.9 + Math.random() * 0.2),
        bloomSpeed: bloomSpeed * (0.9 + Math.random() * 0.2),
        color,
        chromaOffset: (Math.random() - 0.5) * 5,
      });

      // Keep particles bounded for consistent 60fps performance
      if (dropsRef.current.length > 120) {
        dropsRef.current.splice(0, dropsRef.current.length - 120);
      }
    },
    [initialRadius, maxRadius, bloomSpeed, decay, maxOpacity]
  );

  useEffect(() => {
    // If static colors are provided and adaptive is false, use provided colors
    if (colors && !adaptive) {
      currentPaletteRef.current = colors;
    }
  }, [colors, adaptive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Sample background color under cursor periodically (every 60ms) for high efficiency
      const now = performance.now();
      if (adaptive && now - lastSampleTimeRef.current > 60) {
        lastSampleTimeRef.current = now;
        currentPaletteRef.current = detectBackgroundPalette(clientX, clientY);
      }

      if (!lastPosRef.current) {
        lastPosRef.current = { x: clientX, y: clientY };
        spawnInk(clientX, clientY);
        return;
      }

      const dx = clientX - lastPosRef.current.x;
      const dy = clientY - lastPosRef.current.y;
      const dist = Math.hypot(dx, dy);

      // Interpolate ink droplets along cursor path for seamless blooming ribbon
      const step = 14;
      if (dist >= step) {
        const count = Math.min(Math.floor(dist / step), 8);
        for (let i = 1; i <= count; i++) {
          const interpX = lastPosRef.current.x + (dx * i) / count;
          const interpY = lastPosRef.current.y + (dy * i) / count;
          spawnInk(interpX, interpY);
        }
        lastPosRef.current = { x: clientX, y: clientY };
      }
    };

    const handlePointerLeave = () => {
      lastPosRef.current = null;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("mouseleave", handlePointerLeave);

    // Animation render loop
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      ctx.clearRect(0, 0, width, height);

      const drops = dropsRef.current;
      if (drops.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = blendMode;

        for (let i = drops.length - 1; i >= 0; i--) {
          const drop = drops[i];

          // Physics update
          drop.x += drop.vx;
          drop.y += drop.vy;
          drop.vx *= 0.98;
          drop.vy *= 0.98;

          // Bloom expansion & Alpha decay
          if (drop.radius < drop.maxRadius) {
            drop.radius += drop.bloomSpeed;
          }
          drop.alpha -= drop.decay;

          if (drop.alpha <= 0.005) {
            drops.splice(i, 1);
            continue;
          }

          const [r, g, b] = hexToRgb(drop.color);

          // Soft blooming ink radial gradient
          const grad = ctx.createRadialGradient(
            drop.x,
            drop.y,
            0,
            drop.x + drop.chromaOffset * 0.4,
            drop.y,
            Math.max(1, drop.radius)
          );

          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${drop.alpha})`);
          grad.addColorStop(
            0.35,
            `rgba(${r}, ${g}, ${b}, ${drop.alpha * 0.65})`
          );
          grad.addColorStop(
            0.7,
            `rgba(${r}, ${g}, ${b}, ${drop.alpha * 0.22})`
          );
          grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [spawnInk, blendMode, hexToRgb, adaptive, detectBackgroundPalette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "fixed inset-0 pointer-events-none z-40 transition-opacity duration-300",
        className
      )}
      style={{
        filter: blur ? `blur(${blur}px)` : undefined,
        ...style,
      }}
    />
  );
}

export default ChromaHalo;
