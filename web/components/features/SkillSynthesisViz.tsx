"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Skill synthesis - feature 01 "Skills, not caches".
 *
 * ONE skill (nextjs-supabase-auth), four readable beats, looping forever:
 *   1. SOLVING   - a Claude Code session terminal streams a few real-looking
 *                  lines as the agent sets up Supabase auth, ending in
 *                  "session solved". Caption: solving.
 *   2. SCAN      - a bright horizontal scan bar (with a soft trail) sweeps down
 *                  the panel; the messy lines condense behind it.
 *                  Caption: distilling.
 *   3. SKILL     - the panel becomes a compact, clean SKILL CARD: name,
 *                  version, deps, exports, a "verified - tests pass" chip.
 *                  Caption: skill.
 *   4. SHIP      - the card lifts, shrinks, and flies up to a small commons
 *                  network glyph centered above with a light trail and a
 *                  "published to commons" tag. Then a fresh session fades in.
 *
 * Transparent over #0a0a0a (the page applies a global edge-fade mask, so this
 * component adds NO outer box / border / background-tint / full-bleed grid).
 * Only glowing elements are visible. Emerald accents, mono terminal/card text.
 * Everything stays inside the square with padding (nothing clipped). All timers
 * cleaned up on unmount, honors prefers-reduced-motion.
 */

const EMERALD = "#34d399";
const EMERALD_LIGHT = "#6ee7b7";
const EMERALD_PALE = "#a7f3d0";

type Tone = "cmd" | "log" | "warn" | "retry" | "ok";

interface LogLine {
  t: Tone;
  s: string;
}

const SESSION: LogLine[] = [
  { t: "cmd", s: "> set up Supabase auth for this Next.js app" },
  { t: "log", s: "read middleware.ts, lib/supabase/server.ts" },
  { t: "warn", s: "WARN cookies() must be awaited (next 15)" },
  { t: "log", s: "wire getAll() / setAll() cookie bridge" },
  { t: "retry", s: "retry 2/3 -> PKCE exchange 401, refreshing" },
  { t: "ok", s: "callback /auth/confirm -> 302 session persisted" },
  { t: "ok", s: "session solved" },
];

const SKILL = {
  name: "nextjs-supabase-auth",
  version: "v1.2.0",
  deps: "next@15 - @supabase/ssr",
  exports: "withAuth() - getSession()",
  tests: "9 tests pass",
};

const toneClass: Record<Tone, string> = {
  cmd: "text-emerald-200",
  log: "text-zinc-400",
  warn: "text-amber-400",
  retry: "text-rose-400",
  ok: "text-emerald-400",
};

type Stage = "solving" | "scan" | "skill" | "ship";

// Phase timing (ms).
const T = {
  solving: 4200,
  scan: 1600,
  skill: 3400,
  ship: 1900,
} as const satisfies Record<Stage, number>;

const PLAN: Stage[] = ["solving", "scan", "skill", "ship"];

const CAPTION: Record<Stage, string> = {
  solving: "solving",
  scan: "distilling",
  skill: "skill",
  ship: "published to commons",
};

export default function SkillSynthesisViz() {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("solving");
  const [loop, setLoop] = useState(0); // bumps each cycle to remount the session
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (reduceMotion) {
      setStage("skill");
      return;
    }
    let cancelled = false;
    const push = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.current.push(id);
    };

    const cycle = () => {
      let acc = 0;
      PLAN.forEach((st) => {
        push(() => setStage(st), acc);
        acc += T[st];
      });
      push(() => {
        setLoop((n) => n + 1);
        setStage("solving");
        cycle();
      }, acc);
    };

    setStage("solving");
    cycle();

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduceMotion]);

  const showSession = stage === "solving" || stage === "scan";
  const showCard = stage === "skill" || stage === "ship";
  const shipping = stage === "ship";

  return (
    <div className="absolute inset-0 overflow-hidden font-mono">
      {/*
        NO outer box / border / background tint. Transparent over the page's
        #0a0a0a. Only the soft center wash + the edge-faded grid + glowing
        elements are visible.
      */}

      {/* Ambient center wash (fades to nothing, no hard edges) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 50% at 50% 44%, rgba(52,211,153,0.10), transparent 70%)",
        }}
      />

      {/* Fine grid, masked so it dissolves fully toward every edge */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.045) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage:
            "radial-gradient(62% 62% at 50% 46%, #000 0%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(62% 62% at 50% 46%, #000 0%, transparent 78%)",
        }}
      />

      {/* Centered composition: header / target / stage / caption stacked,
          all kept inside the square with generous padding. */}
      <div className="absolute inset-0 flex items-center justify-center p-[7%]">
        <div className="flex w-full max-w-[560px] flex-col items-center gap-4">
          {/* Header row */}
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <CrystalGlyph size={14} />
              <span className="text-[10px] tracking-[0.34em] text-emerald-300/70 uppercase">
                skill synthesis
              </span>
            </div>
            <StageTabs stage={stage} />
          </div>

          {/* Commons target - centered, inline above the stage */}
          <CommonsGlyph active={shipping} reduceMotion={!!reduceMotion} />

          {/* Stage - the session terminal / skill card live here */}
          <div className="relative h-[360px] w-full">
            <AnimatePresence mode="popLayout">
              {showSession && (
                <Session
                  key={`session-${loop}`}
                  scanning={stage === "scan"}
                  reduceMotion={!!reduceMotion}
                />
              )}
              {showCard && (
                <SkillCard
                  key={`card-${loop}`}
                  shipping={shipping}
                  reduceMotion={!!reduceMotion}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Caption */}
          <Caption stage={stage} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SOLVING + SCAN: session terminal                                    */
/* ------------------------------------------------------------------ */

function Session({
  scanning,
  reduceMotion,
}: {
  scanning: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* The terminal window may keep a subtle frame (this is allowed). */}
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#070707]/85 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] backdrop-blur-sm">
        {/* title bar */}
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] tracking-[0.28em] text-zinc-500">
            claude code - session
          </span>
          <span className="rounded border border-white/10 px-2 py-0.5 text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
            auth
          </span>
        </div>

        {/* CRT texture */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(52,211,153,0.03) 0px, rgba(52,211,153,0.03) 1px, transparent 1px, transparent 4px)",
          }}
        />

        {/* log body - condenses behind the scan line */}
        <motion.div
          className="relative z-[2] flex-1 overflow-hidden px-5 py-3.5"
          initial={{ opacity: 1, scaleY: 1, filter: "blur(0px)" }}
          animate={
            scanning
              ? { opacity: 0.18, scaleY: 0.82, filter: "blur(3px)" }
              : { opacity: 1, scaleY: 1, filter: "blur(0px)" }
          }
          style={{ transformOrigin: "top" }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          {SESSION.map((ln, i) => (
            <LogRow key={i} n={i + 1} line={ln} reduceMotion={reduceMotion} />
          ))}
          {/* prompt caret */}
          <motion.div
            className="mt-1 flex items-baseline gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.45 + SESSION.length * 0.34 }}
          >
            <span className="w-5 shrink-0 text-right text-[10px] text-emerald-500/30 tabular-nums select-none">
              {SESSION.length + 1}
            </span>
            <span className="text-[13px] text-emerald-300/80">$</span>
            <motion.span
              className="inline-block h-[14px] w-[7px] bg-emerald-300/80"
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: "linear",
                times: [0, 0.5, 0.5, 1],
              }}
            />
          </motion.div>
        </motion.div>

        {/* footer */}
        <div className="relative z-[2] flex items-center justify-between border-t border-white/[0.07] px-5 py-2.5">
          <span className="text-[10px] tracking-wide text-zinc-500">
            47 tool calls - 9 files - solved in 6m12s
          </span>
          <span className="flex items-center gap-1.5 text-[10px] tracking-wide text-emerald-400/85">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            solved
          </span>
        </div>

        {/* SCAN line + trail */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="scan"
              className="pointer-events-none absolute inset-x-0 top-0 z-[6]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-x-0"
                initial={{ top: "-8%" }}
                animate={{ top: "104%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                {/* soft trailing glow above the bar */}
                <div
                  className="absolute inset-x-0 -top-24 h-24"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, rgba(110,231,183,0.16))",
                  }}
                />
                {/* the bright bar */}
                <div
                  className="absolute inset-x-0 -top-2 h-4"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, rgba(167,243,208,0.9), transparent)",
                    boxShadow:
                      "0 0 26px 8px rgba(110,231,183,0.55), 0 0 60px 16px rgba(52,211,153,0.25)",
                  }}
                />
                <div className="absolute inset-x-0 -top-px h-px bg-[#d1fae5]" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function LogRow({
  n,
  line,
  reduceMotion,
}: {
  n: number;
  line: LogLine;
  reduceMotion: boolean;
}) {
  const isSolved = line.s === "session solved";
  return (
    <motion.div
      className="flex items-baseline gap-3 leading-[1.7]"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: reduceMotion ? 0 : 0.45 + n * 0.34,
        duration: 0.28,
        ease: "easeOut",
      }}
    >
      <span className="w-5 shrink-0 text-right text-[10px] text-emerald-500/30 tabular-nums select-none">
        {n}
      </span>
      <span className={"truncate text-[12.5px] tracking-tight " + toneClass[line.t]}>
        {line.s}
        {(line.t === "ok" || isSolved) && (
          <span className="text-emerald-400"> &#10003;</span>
        )}
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* SKILL + SHIP: skill card                                            */
/* ------------------------------------------------------------------ */

function SkillCard({
  shipping,
  reduceMotion,
}: {
  shipping: boolean;
  reduceMotion: boolean;
}) {
  const fields: { k: string; v: string; accent?: boolean }[] = [
    { k: "name", v: SKILL.name, accent: true },
    { k: "version", v: SKILL.version },
    { k: "deps", v: SKILL.deps },
    { k: "exports", v: SKILL.exports },
  ];

  // SHIP: lift straight up toward the centered commons glyph, shrink + fade.
  // Short, bounded travel so nothing clips the square.
  const shipAnim = reduceMotion
    ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
    : shipping
      ? {
          opacity: 0,
          scale: 0.22,
          y: -150,
          filter: "blur(2px)",
        }
      : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.94, y: 0, filter: "blur(8px)" }}
      animate={shipAnim}
      exit={{ opacity: 0 }}
      transition={{ duration: shipping ? 1.0 : 0.55, ease: [0.5, 0, 0.2, 1] }}
    >
      <div className="relative w-full max-w-[420px]">
        {/* ship trail - rises straight up behind the card */}
        <AnimatePresence>
          {shipping && !reduceMotion && (
            <motion.div
              key="trail"
              className="pointer-events-none absolute bottom-1/2 left-1/2 -z-10 w-1.5 origin-bottom -translate-x-1/2"
              style={{
                height: 150,
                background:
                  "linear-gradient(to top, rgba(110,231,183,0.55), transparent)",
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 0.9, 0], scaleY: 1 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* glow halo */}
        <motion.div
          className="pointer-events-none absolute -inset-5 rounded-[2rem]"
          initial={{ opacity: 0 }}
          animate={
            reduceMotion
              ? { opacity: 0.45 }
              : { opacity: shipping ? 0.2 : [0.4, 0.75, 0.4] }
          }
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(55% 60% at 50% 45%, rgba(52,211,153,0.34), transparent 70%)",
          }}
        />

        <div className="relative overflow-hidden rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-[#0c1813] to-[#060e0b] shadow-[0_0_60px_-14px_rgba(52,211,153,0.6)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />

          {/* header */}
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
            <div className="flex items-center gap-2">
              <CrystalGlyph size={15} />
              <span className="text-[10px] tracking-[0.32em] text-emerald-300/80 uppercase">
                skill
              </span>
            </div>
            <span className="rounded border border-emerald-400/30 bg-emerald-400/5 px-2 py-0.5 text-[9px] tracking-[0.2em] text-emerald-300/85 uppercase">
              executable
            </span>
          </div>

          {/* fields */}
          <div className="space-y-2.5 px-5 py-3.5">
            {fields.map((f, i) => (
              <Field
                key={f.k}
                index={i}
                label={f.k}
                value={f.v}
                accent={f.accent}
                reduceMotion={reduceMotion}
              />
            ))}
            <VerifiedChip reduceMotion={reduceMotion} />
          </div>

          {/* use footer */}
          <motion.div
            className="flex items-center justify-between border-t border-white/[0.07] bg-black/30 px-5 py-2.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 1.0, duration: 0.4 }}
          >
            <span className="text-[11px] tracking-wide text-zinc-500">
              <span className="text-emerald-400/85">mycelium</span> use{" "}
              <span className="text-zinc-300">{SKILL.name}</span>
            </span>
            <motion.span
              className="inline-block h-[13px] w-[6px] bg-emerald-300/70"
              initial={{ opacity: 1 }}
              animate={
                reduceMotion ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }
              }
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: "linear",
                times: [0, 0.5, 0.5, 1],
              }}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Field({
  index,
  label,
  value,
  accent,
  reduceMotion,
}: {
  index: number;
  label: string;
  value: string;
  accent?: boolean;
  reduceMotion: boolean;
}) {
  const delay = reduceMotion ? 0 : 0.16 + index * 0.14;
  return (
    <motion.div
      className="flex items-baseline gap-3"
      initial={{ opacity: 0, x: 10, filter: "blur(3px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ delay, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="w-[58px] shrink-0 text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
        {label}
      </span>
      <span
        className={
          "truncate text-[14px] leading-tight " +
          (accent ? "font-medium text-emerald-200" : "text-zinc-300")
        }
      >
        {value}
      </span>
    </motion.div>
  );
}

function VerifiedChip({ reduceMotion }: { reduceMotion: boolean }) {
  const delay = reduceMotion ? 0 : 0.16 + 4 * 0.14;
  return (
    <motion.div
      className="mt-1 flex items-center gap-2.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-1.5"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 280, damping: 18 }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke={EMERALD}
          strokeWidth="2.4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.05, duration: 0.4 }}
        />
        <motion.path
          d="M7 12.5l3.2 3.2L17 8.5"
          stroke={EMERALD_LIGHT}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.28, duration: 0.32, ease: "easeOut" }}
        />
      </svg>
      <span className="text-[11px] tracking-wide text-emerald-200/90">
        verified - {SKILL.tests}
      </span>
      <span className="ml-auto text-[9px] tracking-[0.2em] text-emerald-300/50 uppercase">
        sealed
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Commons glyph (ship target, centered above the stage)               */
/* ------------------------------------------------------------------ */

function CommonsGlyph({
  active,
  reduceMotion,
}: {
  active: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/[0.05]"
        initial={{ opacity: 1, scale: 1 }}
        animate={
          reduceMotion
            ? { opacity: 1, scale: 1 }
            : active
              ? {
                  scale: [1, 1.25, 1],
                  boxShadow: [
                    "0 0 0px 0px rgba(52,211,153,0)",
                    "0 0 30px 6px rgba(110,231,183,0.6)",
                    "0 0 0px 0px rgba(52,211,153,0)",
                  ],
                }
              : { scale: 1 }
        }
        transition={{ duration: 1.1, ease: "easeOut" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* hub + spokes network */}
          <circle cx="12" cy="12" r="2.4" fill={EMERALD_LIGHT} />
          {[
            [5, 5],
            [19, 5],
            [4, 18],
            [20, 17],
            [12, 3],
          ].map(([x, y], i) => (
            <g key={i}>
              <line
                x1="12"
                y1="12"
                x2={x}
                y2={y}
                stroke={EMERALD}
                strokeWidth="0.9"
                opacity="0.55"
              />
              <circle cx={x} cy={y} r="1.5" fill={EMERALD_PALE} opacity="0.85" />
            </g>
          ))}
        </svg>
      </motion.div>
      <span className="text-[8px] tracking-[0.26em] text-emerald-300/55 uppercase">
        commons
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome: stage tabs, caption, crystal                                */
/* ------------------------------------------------------------------ */

function StageTabs({ stage }: { stage: Stage }) {
  return (
    <div className="flex items-center gap-3">
      {PLAN.map((s) => {
        const on = s === stage;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
              style={{
                background: on ? EMERALD_LIGHT : "rgba(110,231,183,0.2)",
                boxShadow: on ? "0 0 8px rgba(110,231,183,0.9)" : "none",
              }}
            />
            <span
              className="text-[9px] tracking-[0.16em] uppercase transition-colors duration-300"
              style={{ color: on ? EMERALD_PALE : "rgba(161,161,170,0.4)" }}
            >
              {s === "skill" ? "skill" : s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Caption({ stage }: { stage: Stage }) {
  return (
    <div className="flex h-4 justify-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={CAPTION[stage]}
          className="flex items-center gap-2 text-[11px] tracking-[0.34em] text-emerald-300/65 uppercase"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <span className="h-1 w-1 rounded-full bg-emerald-400/70" />
          {CAPTION[stage]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function CrystalGlyph({ size = 12 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
    >
      <path
        d="M12 2l8 6-3 12H7L4 8z"
        fill="none"
        stroke={EMERALD_LIGHT}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 2v20M4 8l16 0" stroke={EMERALD} strokeWidth="0.9" opacity="0.5" />
    </motion.svg>
  );
}
