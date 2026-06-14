"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * EnvScopedTrustViz - signature animation for "Proven for your machine".
 *
 * Trust is conditioned on YOUR environment. A skill proven on react 19 is
 * "unproven, re-confirm" on react 20. We cycle a "your environment" selector
 * through combos; the skill's trust score recomputes live and each env chip
 * flips proven (emerald check) / unproven (amber question). A glowing emerald
 * "proven envelope" hugs the confirmed chips and grows one env at a time.
 */

const EMERALD = "#34d399";
const EMERALD_SOFT = "#6ee7b7";
const AMBER = "#fbbf24";

// Six environment chips laid out in a 3x2 grid.
const ENVS = [
  "react 19",
  "react 20",
  "node 20",
  "deno",
  "macOS",
  "linux",
] as const;

// Grid geometry (in the chip-board's local coordinate space, 0..100 box).
// Generous side padding so chips, glyphs and labels never reach the edge.
const COLS = 3;
const ROWS = 2;
const PAD = 9; // inner padding inside the 0..100 board on every side
const GAP_X = 5;
const GAP_Y = 11;
const BOARD_W = 100 - PAD * 2;
const BOARD_H = 100 - PAD * 2;
const CHIP_W = (BOARD_W - (COLS - 1) * GAP_X) / COLS;
const CHIP_H = (BOARD_H - (ROWS - 1) * GAP_Y) / ROWS;
const OFF_X = PAD;
const OFF_Y = PAD;

function chipRect(i: number) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = OFF_X + col * (CHIP_W + GAP_X);
  const y = OFF_Y + row * (CHIP_H + GAP_Y);
  return {
    x,
    y,
    w: CHIP_W,
    h: CHIP_H,
    cx: x + CHIP_W / 2,
    cy: y + CHIP_H / 2,
  };
}

// Each scene: which env the user is currently on, and the proven set so far.
// Coverage WIDENS one environment at a time across the loop, then resets.
type Scene = {
  label: string; // the "your environment" combo shown in the selector
  active: number; // index of the chip being evaluated / focused this scene
  proven: number[]; // chips currently inside the proven envelope
};

const SCENES: Scene[] = [
  { label: "react 19 / macOS", active: 0, proven: [0] },
  { label: "react 19 / linux", active: 5, proven: [0, 5] },
  { label: "react 20 / macOS", active: 1, proven: [0, 5] }, // react 20 still unproven
  { label: "react 20 / macOS", active: 1, proven: [0, 5, 1] }, // re-confirmed -> widens
  { label: "node 20 / linux", active: 2, proven: [0, 5, 1, 2] },
  { label: "deno / macOS", active: 3, proven: [0, 5, 1, 2] }, // deno unproven
  { label: "deno / macOS", active: 3, proven: [0, 5, 1, 2, 3] }, // re-confirmed -> widens
];

const SCENE_MS = 1900;

// Envelope: a single rounded rect that bounds all proven chips, with padding.
function envelopeBox(proven: number[]) {
  if (proven.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const i of proven) {
    const r = chipRect(i);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  const pad = 2.4;
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

export default function EnvScopedTrustViz() {
  const [scene, setScene] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const id = setInterval(() => {
      setScene((s) => (s + 1) % SCENES.length);
    }, SCENE_MS);
    return () => clearInterval(id);
  }, []);

  const current = SCENES[scene];
  const provenSet = new Set(current.proven);
  const score = Math.round((current.proven.length / ENVS.length) * 100);
  const env = envelopeBox(current.proven);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* ambient backdrop: soft radial emerald glow, no hard rectangle */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(52,211,153,0.10), transparent 62%)",
        }}
      />
      {/* faint emerald grid that fades to nothing toward all edges */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#34d399 1px, transparent 1px), linear-gradient(90deg, #34d399 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          maskImage:
            "radial-gradient(circle at 50% 50%, #000 22%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, #000 22%, transparent 70%)",
        }}
      />

      {/* skill card: subtle frame only, soft glow, no hard container edge */}
      <div className="relative flex aspect-square w-[86%] max-w-[400px] flex-col">
        <div
          className="relative flex flex-1 flex-col rounded-[1.25rem] p-[7%]"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            backgroundImage:
              "radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.035), rgba(255,255,255,0.008) 60%, transparent 100%)",
            boxShadow:
              "0 0 70px -28px rgba(52,211,153,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
            maskImage:
              "radial-gradient(130% 130% at 50% 45%, #000 72%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(130% 130% at 50% 45%, #000 72%, transparent 100%)",
          }}
        >
          {/* header: skill identity + live score */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-emerald-300/60">
                skill
              </div>
              <div className="mt-1 truncate font-mono text-[0.92rem] font-medium tracking-tight text-white/90">
                migrate-router
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end">
              <ScoreDial score={score} />
              <div className="mt-1 font-mono text-[0.52rem] uppercase tracking-[0.18em] text-white/30">
                proven coverage
              </div>
            </div>
          </div>

          {/* "your environment" selector */}
          <div className="mt-[6%] flex items-center gap-2">
            <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/35">
              your env
            </span>
            <div className="relative h-[1.5rem] flex-1 overflow-hidden rounded-md border border-white/10 bg-black/40">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`${scene}-${current.label}`}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex items-center gap-2 px-2.5"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
                  <span className="truncate font-mono text-[0.7rem] tracking-tight text-white/85">
                    {current.label}
                  </span>
                </motion.div>
              </AnimatePresence>
              {/* sweeping scan line on env change */}
              <motion.div
                key={`scan-${scene}`}
                initial={{ x: "-100%", opacity: 1 }}
                animate={{ x: "120%", opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="pointer-events-none absolute inset-y-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(52,211,153,0.18), transparent)",
                }}
              />
            </div>
          </div>

          {/* chip board with proven envelope */}
          <div className="relative mt-[6%] flex-1">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <defs>
                <filter
                  id="env-glow"
                  x="-40%"
                  y="-40%"
                  width="180%"
                  height="180%"
                >
                  <feGaussianBlur stdDeviation="1.2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="env-stroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={EMERALD_SOFT} />
                  <stop offset="100%" stopColor={EMERALD} />
                </linearGradient>
              </defs>

              {/* proven envelope: animates its bounding box, grows over time */}
              {env && (
                <>
                  <motion.rect
                    initial={false}
                    animate={{
                      x: env.x,
                      y: env.y,
                      width: env.w,
                      height: env.h,
                    }}
                    transition={{
                      duration: reduced.current ? 0 : 0.7,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    rx={4.5}
                    fill="rgba(52,211,153,0.07)"
                    stroke="url(#env-stroke)"
                    strokeWidth={0.9}
                    strokeDasharray="3.5 2.2"
                    filter="url(#env-glow)"
                  />
                  {/* slow dash drift to feel "alive" */}
                  <motion.rect
                    initial={false}
                    animate={{
                      x: env.x,
                      y: env.y,
                      width: env.w,
                      height: env.h,
                    }}
                    transition={{
                      duration: reduced.current ? 0 : 0.7,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    rx={4.5}
                    fill="none"
                    stroke={EMERALD_SOFT}
                    strokeWidth={0.5}
                    strokeDasharray="1 5"
                    opacity={0.7}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-12"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </motion.rect>
                </>
              )}

              {/* chips */}
              {ENVS.map((label, i) => {
                const r = chipRect(i);
                const isProven = provenSet.has(i);
                const isActive = current.active === i;
                const stroke = isProven ? EMERALD : AMBER;
                return (
                  <g key={label}>
                    {/* active focus ring */}
                    {isActive && (
                      <motion.rect
                        x={r.x - 1.4}
                        y={r.y - 1.4}
                        width={r.w + 2.8}
                        height={r.h + 2.8}
                        rx={4}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={0.6}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.2, 0.9, 0.2] }}
                        transition={{
                          duration: 1.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <motion.rect
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      rx={3.2}
                      initial={false}
                      animate={{
                        fill: isProven
                          ? "rgba(52,211,153,0.12)"
                          : "rgba(251,191,36,0.08)",
                        stroke,
                      }}
                      transition={{ duration: 0.5 }}
                      strokeWidth={0.7}
                    />
                    {/* status glyph */}
                    <StatusGlyph
                      key={`${i}-${isProven ? "p" : "u"}`}
                      cx={r.x + 4.6}
                      cy={r.cy}
                      proven={isProven}
                    />
                    <text
                      x={r.x + 8.6}
                      y={r.cy}
                      dominantBaseline="central"
                      fontSize={4}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fill={
                        isProven
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(255,255,255,0.62)"
                      }
                      letterSpacing="-0.1"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* footer legend */}
          <div className="mt-[5%] flex items-center justify-between gap-2 font-mono text-[0.5rem] uppercase tracking-[0.14em]">
            <span className="flex shrink-0 items-center gap-1.5 text-emerald-300/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              proven
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={scene}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="truncate text-center text-white/40"
              >
                {provenSet.has(current.active)
                  ? "trusted here"
                  : "unproven, re-confirm"}
              </motion.span>
            </AnimatePresence>
            <span className="flex shrink-0 items-center gap-1.5 text-amber-300/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              unproven
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- live-morphing numeric score with a tiny progress arc ---- */
function ScoreDial({ score }: { score: number }) {
  const display = useAnimatedNumber(score, 600);
  const R = 13;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-[2.5rem] w-[2.5rem]">
      <svg viewBox="0 0 32 32" className="h-full w-full -rotate-90">
        <circle
          cx="16"
          cy="16"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2.4"
        />
        <motion.circle
          cx="16"
          cy="16"
          r={R}
          fill="none"
          stroke={EMERALD}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 3px rgba(52,211,153,0.7))" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[0.74rem] font-semibold tabular-nums text-emerald-200">
          {display}
        </span>
      </div>
    </div>
  );
}

function useAnimatedNumber(target: number, duration: number) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  return value;
}

/* ---- check (proven) / question (unproven) glyph, drawn in SVG units ---- */
function StatusGlyph({
  cx,
  cy,
  proven,
}: {
  cx: number;
  cy: number;
  proven: boolean;
}) {
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
      style={
        {
          transformOrigin: `${cx}px ${cy}px`,
          transformBox: "fill-box",
        } as React.CSSProperties
      }
    >
      <circle
        cx={cx}
        cy={cy}
        r={2.4}
        fill={proven ? "rgba(52,211,153,0.18)" : "rgba(251,191,36,0.16)"}
        stroke={proven ? EMERALD : AMBER}
        strokeWidth={0.4}
      />
      {proven ? (
        <path
          d={`M ${cx - 1.05} ${cy} L ${cx - 0.2} ${cy + 0.9} L ${cx + 1.2} ${cy - 1.05}`}
          fill="none"
          stroke={EMERALD}
          strokeWidth={0.62}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <text
          x={cx}
          y={cy + 0.1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={3.2}
          fontWeight={700}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fill={AMBER}
        >
          ?
        </text>
      )}
    </motion.g>
  );
}
