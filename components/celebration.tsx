"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Won = {
  badge_id: number;
  name: string;
  description: string;
  image_path: string;
};

/**
 * Asks the database whether this resident has earned a badge they have not
 * been congratulated for yet. claim_badge_celebrations() returns them and
 * marks them in the same statement, so the fireworks never repeat.
 */
export function Celebration() {
  const [queue, setQueue] = useState<Won[]>([]);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;

    const supabase = createClient();
    supabase
      .rpc("claim_badge_celebrations")
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) setQueue(data as Won[]);
      });
  }, []);

  if (queue.length === 0) return null;
  const badge = queue[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm"
    >
      <Fireworks />

      <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          New badge
        </p>

        <div className="mt-3 flex justify-center">
          <Image
            src={badge.image_path}
            alt=""
            width={140}
            height={140}
            className="drop-shadow-sm"
          />
        </div>

        <h2 id="badge-title" className="mt-3 text-xl font-bold text-slate-900">
          {badge.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {badge.description}
        </p>

        <button
          type="button"
          onClick={() => setQueue((q) => q.slice(1))}
          className="mt-5 w-full rounded-xl bg-brand-700 px-4 py-3 font-medium text-white"
        >
          {queue.length > 1 ? `Next (${queue.length - 1} more)` : "Thank you"}
        </button>
      </div>
    </div>
  );
}

/** Canvas fireworks. Plain 2D canvas so there is no library to load. */
function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect people who asked for less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#215D4A", "#4A917C", "#99C5B5", "#D7EAE0", "#F5C451", "#F0906B"];
    type Spark = {
      x: number; y: number; vx: number; vy: number;
      life: number; max: number; color: string;
    };
    let sparks: Spark[] = [];

    function burst(x: number, y: number) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 46;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.8 + Math.random() * 3.2;
        const max = 60 + Math.random() * 40;
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: max, max,
          color: Math.random() > 0.75
            ? COLORS[Math.floor(Math.random() * COLORS.length)]
            : color,
        });
      }
    }

    let frame = 0;
    let raf = 0;

    const tick = () => {
      frame++;
      // A new burst roughly three times a second, for the first few seconds.
      if (frame % 20 === 0 && frame < 260) {
        burst(
          window.innerWidth * (0.2 + Math.random() * 0.6),
          window.innerHeight * (0.18 + Math.random() * 0.4),
        );
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      sparks = sparks.filter((s) => s.life > 0);
      for (const s of sparks) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.045;      // gravity
        s.vx *= 0.985;      // drag
        s.vy *= 0.985;
        s.life--;

        ctx.globalAlpha = Math.max(0, s.life / s.max);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(tick);
    };

    burst(window.innerWidth / 2, window.innerHeight * 0.32);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
