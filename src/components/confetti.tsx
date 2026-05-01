"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
  drift: number;
};

const PALETTE = [
  "#2563eb", // blue
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#0ea5e9", // sky
  "#a78bfa", // violet
  "#10b981", // emerald
  "#fbbf24", // amber accent
];

export function Confetti({
  active,
  duration = 4000,
  burst = 220,
}: {
  active: boolean;
  duration?: number;
  burst?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = window.innerWidth;
    const particles: Particle[] = Array.from({ length: burst }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 100,
      y: -20,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -8 - 4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 8 + 6,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      shape: Math.random() > 0.4 ? "rect" : "circle",
      drift: (Math.random() - 0.5) * 0.5,
    }));

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gravity = 0.35;
      const drag = 0.99;
      let alive = 0;
      for (const p of particles) {
        p.vy += gravity;
        p.vx = p.vx * drag + p.drift;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < window.innerHeight + 40) alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (elapsed < duration && alive > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, duration, burst]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100]"
    />
  );
}
