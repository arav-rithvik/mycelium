"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";

/**
 * Feature 01 — "Skills, not caches."
 *
 * One compact window that MORPHS through the real lifecycle, looping forever:
 *   1. TERMINAL  — a Claude Code session streams real-looking setup lines,
 *                  ending in "session solved".
 *   2. SCAN      — a bright bar sweeps the panel; the session is distilled.
 *   3. JSON      — the session condenses into skill.json (the spec).
 *   4. SKILL     — it seals into an executable SKILL card + `mycelium use`.
 *
 * Single centered artifact (no spread-out diagram, no separate card). The
 * window chrome stays constant so it reads as ONE thing transforming.
 */

const EMERALD = "#34d399";
const LIGHT = "#6ee7b7";
const PALE = "#a7f3d0";

type Tone = "cmd" | "log" | "warn" | "retry" | "ok" | "done";

const SESSION: { t: Tone; s: string }[] = [
  { t: "cmd", s: "> set up Supabase auth for this Next.js app" },
  { t: "log", s: "read middleware.ts, lib/supabase/server.ts" },
  { t: "warn", s: "WARN cookies() must be awaited (next 15)" },
  { t: "log", s: "wire getAll() / setAll() cookie bridge" },
  { t: "retry", s: "retry 2/3 → PKCE exchange 401, refreshing" },
  { t: "ok", s: "callback /auth/confirm → 302 session persisted" },
  { t: "done", s: "session solved" },
];

const toneColor: Record<Tone, string> = {
  cmd: PALE,
  log: "rgba(255,255,255,0.5)",
  warn: "#fcd34d",
  retry: "#fca5a5",
  ok: LIGHT,
  done: EMERALD,
};

// JSON spec lines (rendered with light syntax coloring).
const JSON_LINES: { k?: string; v: string; vColor: string }[] = [
  { v: "{", vColor: "rgba(255,255,255,0.4)" },
  { k: "name", v: '"nextjs-supabase-auth"', vColor: LIGHT },
  { k: "version", v: '"1.2.0"', vColor: LIGHT },
  { k: "deps", v: '["next@15", "@supabase/ssr"]', vColor: LIGHT },
  { k: "exports", v: '["withAuth", "getSession"]', vColor: LIGHT },
  { k: "checks", v: '{ "tests": 9, "passed": 9 }', vColor: PALE },
  { k: "sealed", v: "true", vColor: EMERALD },
  { v: "}", vColor: "rgba(255,255,255,0.4)" },
];

// Loop timeline (seconds)
const T = { session: 3.0, scan: 1.2, json: 2.3, skill: 3.1 };
const LOOP = T.session + T.scan + T.json + T.skill; // 9.6s

const STEPS = ["solve", "scan", "json", "skill"] as const;

type Phase = "session" | "json" | "skill";

const SPORES = [
  { top: "20%", left: "10%", d: 10, delay: 0 },
  { top: "72%", left: "16%", d: 13, delay: 1.4 },
  { top: "30%", left: "88%", d: 11, delay: 0.8 },
  { top: "78%", left: "82%", d: 14, delay: 2.1 },
];

export default function SkillSynthesisSection({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const num = String(index).padStart(2, "0");
  const tot = String(total).padStart(2, "0");

  const [t, setT] = useState(reduce ? LOOP - 0.2 : 0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    if (!inView) {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      start.current = null;
      return;
    }
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      setT(((now - start.current) / 1000) % LOOP);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [inView, reduce]);

  // derive phase + helpers
  const scanStart = T.session;
  const jsonStart = T.session + T.scan;
  const skillStart = T.session + T.scan + T.json;

  const phase: Phase = t < jsonStart ? "session" : t < skillStart ? "json" : "skill";
  const scanning = t >= scanStart && t < jsonStart;
  const scanP = scanning ? (t - scanStart) / T.scan : 0;
  const linesShown = Math.min(
    SESSION.length,
    Math.floor((t / T.session) * (SESSION.length + 1)) + 1,
  );

  const stepIndex = t < scanStart ? 0 : t < jsonStart ? 1 : t < skillStart ? 2 : 3;
  const titleByPhase =
    phase === "json"
      ? "skill.json"
      : phase === "skill"
        ? "sealed skill"
        : scanning
          ? "distilling…"
          : "claude-code · session";

  return (
    <section
      data-snap
      ref={ref}
      className="relative isolate flex h-screen w-full items-center overflow-hidden bg-transparent"
    >
      {/* ambient dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(52,211,153,0.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 45%, black, transparent 80%)",
        }}
      />
      {/* center glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[62%] -z-20 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.09),transparent_62%)] blur-[120px]"
      />
      {/* spores */}
      {!reduce &&
        SPORES.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute -z-10 h-1 w-1 rounded-full bg-emerald-300/40 blur-[1px]"
            style={{ top: s.top, left: s.left }}
            animate={{ y: [0, -16, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: s.d, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
          />
        ))}

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-8 md:px-14">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-medium leading-none text-emerald-300">{num}</span>
            <span className="h-px w-12 flex-none bg-gradient-to-r from-emerald-400/50 to-transparent" />
            <span className="font-mono text-[11px] tracking-wider text-white/25">/ {tot}</span>
          </div>
          <h3 className="text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-[2.6rem]">
            Skills, not caches.
          </h3>
          <p className="max-w-3xl text-base leading-relaxed text-white/55 md:text-lg">
            Every solved session is distilled into a named, versioned, executable skill — a sealed
            package other agents can trust, not a text blob you paste and hope.
          </p>
        </motion.div>

        {/* the morphing window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5"
        >
          <div
            className="relative w-full max-w-[760px] overflow-hidden rounded-2xl border border-emerald-400/15 bg-[#0b0e0d]/80 backdrop-blur-sm"
            style={{ boxShadow: "0 0 60px rgba(16,185,129,0.10), inset 0 1px 0 rgba(255,255,255,0.04)" }}
          >
            {/* window header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-white/15" />
                <span className="h-3 w-3 rounded-full bg-white/15" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/50" />
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={titleByPhase}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.25 }}
                  className="font-mono text-[13px] tracking-[0.12em] text-emerald-300/70"
                >
                  {titleByPhase}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* body — fixed height, content swaps per phase */}
            <div className="relative h-[372px] px-7 py-6 font-mono text-[15px] leading-[1.95]">
              <AnimatePresence mode="wait">
                {phase === "session" && (
                  <motion.div
                    key="session"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col"
                  >
                    {SESSION.slice(0, linesShown).map((l, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ color: toneColor[l.t] }}
                        className="whitespace-pre-wrap"
                      >
                        {l.s}
                        {l.t === "done" && " ✓"}
                      </motion.span>
                    ))}
                    {!scanning && linesShown < SESSION.length && (
                      <span className="mt-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-300/70" />
                    )}
                  </motion.div>
                )}

                {phase === "json" && (
                  <motion.div
                    key="json"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col"
                  >
                    {JSON_LINES.map((l, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="whitespace-pre-wrap"
                      >
                        {l.k ? (
                          <>
                            {"  "}
                            <span style={{ color: PALE }}>&quot;{l.k}&quot;</span>
                            <span className="text-white/35">: </span>
                            <span style={{ color: l.vColor }}>{l.v}</span>
                            {i < JSON_LINES.length - 2 && <span className="text-white/35">,</span>}
                          </>
                        ) : (
                          <span style={{ color: l.vColor }}>{l.v}</span>
                        )}
                      </motion.span>
                    ))}
                  </motion.div>
                )}

                {phase === "skill" && (
                  <motion.div
                    key="skill"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-full flex-col"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-emerald-300">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path d="M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6l7-3z" strokeLinejoin="round" />
                        </svg>
                        <span className="tracking-[0.16em] text-[13px]">SKILL</span>
                      </span>
                      <span className="rounded border border-emerald-400/30 px-2.5 py-1 text-[10px] tracking-[0.14em] text-emerald-300/80">
                        EXECUTABLE
                      </span>
                    </div>
                    {[
                      ["NAME", "nextjs-supabase-auth"],
                      ["VERSION", "v1.2.0"],
                      ["DEPS", "next@15 · @supabase/ssr"],
                      ["EXPORTS", "withAuth() · getSession()"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-4 text-[14px] leading-[2]">
                        <span className="w-[88px] shrink-0 text-white/30">{k}</span>
                        <span className="text-emerald-100/90">{v}</span>
                      </div>
                    ))}
                    <div className="mt-3.5 flex items-center justify-between rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-2">
                      <span className="flex items-center gap-2 text-[13px] text-emerald-300/90">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M8 12l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        verified · 9 tests pass
                      </span>
                      <span className="text-[10px] tracking-[0.14em] text-white/30">SEALED</span>
                    </div>
                    <div className="mt-auto border-t border-white/[0.06] pt-3 text-[13.5px]">
                      <span className="text-emerald-400/80">mycelium</span>
                      <span className="text-white/55"> use nextjs-supabase-auth</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* scan sweep overlay */}
              {scanning && (
                <>
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 h-16"
                    style={{
                      top: `${scanP * 100}%`,
                      transform: "translateY(-50%)",
                      background:
                        "linear-gradient(to bottom, transparent, rgba(52,211,153,0.18), transparent)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 h-px"
                    style={{
                      top: `${scanP * 100}%`,
                      background: "linear-gradient(to right, transparent, #6ee7b7, transparent)",
                      boxShadow: "0 0 12px rgba(110,231,183,0.8)",
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* stepper */}
          <div className="flex items-center gap-3">
            {STEPS.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full transition-all duration-300"
                      style={{
                        background: active || done ? EMERALD : "rgba(255,255,255,0.18)",
                        boxShadow: active ? "0 0 10px rgba(52,211,153,0.9)" : "none",
                      }}
                    />
                    <span
                      className="font-mono text-[12.5px] uppercase tracking-[0.18em] transition-colors duration-300"
                      style={{ color: active ? PALE : done ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.25)" }}
                    >
                      {s}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span
                      className="h-px w-9 transition-colors duration-300"
                      style={{ background: done ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.12)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
