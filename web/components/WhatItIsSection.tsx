"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  type Variants,
} from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease },
  },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

/* ──────────────────────────────────────────────────────────────────────────
 * SUBTLE MYCELIUM AMBIENCE
 *
 * A toned-down version of the cross-section: a handful of faint organic
 * filaments drifting behind the content, plus a couple of glowing carrier
 * nodes. Kept deliberately quiet so the copy + terminal stay legible.
 * Authored against viewBox 1200 x 800, xMidYMid slice.
 * ────────────────────────────────────────────────────────────────────────── */
type Filament = { d: string; carrier?: boolean; reverse?: boolean; w?: number };

const FILAMENTS: Filament[] = [
  // a few spanning trunk-lines
  { d: "M-30 250 C 160 232, 260 286, 420 270 C 560 256, 660 300, 820 286 C 960 274, 1040 312, 1230 296", carrier: true, w: 1 },
  { d: "M1230 470 C 1020 456, 900 500, 720 484 C 560 470, 440 506, 280 492 C 160 482, 60 506, -30 498", carrier: true, reverse: true, w: 0.9 },
  { d: "M-30 640 C 200 624, 340 664, 520 648 C 700 632, 820 666, 1230 652", carrier: true, w: 0.8 },

  // branching tendrils
  { d: "M260 286 C 250 340, 286 392, 262 452 C 244 500, 276 552, 256 612", w: 0.6 },
  { d: "M820 286 C 832 340, 800 392, 832 452 C 858 500, 826 556, 850 616", w: 0.6 },
  { d: "M520 648 C 530 688, 504 720, 528 760", w: 0.5 },
  { d: "M420 270 C 470 286, 528 278, 568 312", carrier: true, w: 0.6 },
  { d: "M720 484 C 668 502, 612 494, 568 528", carrier: true, reverse: true, w: 0.6 },

  // fine texture strands
  { d: "M150 244 C 162 272, 138 296, 158 328", w: 0.4 },
  { d: "M980 300 C 992 328, 968 352, 988 384", w: 0.4 },
  { d: "M360 540 C 396 548, 428 536, 464 552", w: 0.4 },
  { d: "M760 600 C 796 608, 828 596, 864 612", w: 0.4 },
];

const CARRIERS = FILAMENTS.filter((f) => f.carrier);

/** A glowing node travelling along one filament path via animateMotion. */
function Carrier({
  pathId,
  dur,
  begin,
  reverse,
}: {
  pathId: string;
  dur: number;
  begin: number;
  reverse?: boolean;
}) {
  const keyPoints = reverse ? "1;0" : "0;1";
  const motionProps = {
    dur: `${dur}s`,
    begin: `${begin}s`,
    repeatCount: "indefinite" as const,
    keyPoints,
    keyTimes: "0;1",
    calcMode: "linear" as const,
  };
  const fade = {
    attributeName: "opacity",
    values: "0;1;1;0",
    keyTimes: "0;0.1;0.88;1",
    dur: `${dur}s`,
    begin: `${begin}s`,
    repeatCount: "indefinite" as const,
  };
  return (
    <g filter="url(#wii-node-glow)">
      <circle r="3.5" fill="#34d399" opacity="0.18">
        <animateMotion {...motionProps}>
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
      <circle r="1.6" fill="#6ee7b7">
        <animateMotion {...motionProps}>
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <animate {...fade} />
      </circle>
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   TERMINAL DEMO (inlined)

   A simulated asciinema-style recording of Claude Code using Mycelium.
   One deterministic timeline, advanced by chained timeouts, looping forever.
   Reused verbatim from TerminalDemo.tsx — same 3 scenarios, same phases,
   same ~4s hold — but stripped of its own eyebrow + headline so it can sit
   inside the right column of the combined section.
──────────────────────────────────────────────────────────────────────── */

type Phase =
  | "typing-prompt"
  | "searching"
  | "found"
  | "applying"
  | "result"
  | "savings"
  | "hold";

type Scenario = {
  prompt: string;
  skill: string;
  trust: string;
  resultLines: string[];
  savedTokens: string;
  chips: string[];
};

const SCENARIOS: Scenario[] = [
  {
    prompt: "set up Supabase auth in my Next.js app",
    skill: "nextjs-supabase-auth",
    trust: "0.93",
    resultLines: [
      "Installed @supabase/ssr · created app/auth/callback route (PKCE)",
      "wired middleware · success_check: GET /auth/callback → 302  ✓",
    ],
    savedTokens: "18,400 tokens",
    chips: ["7.7 Wh", "184 mL water", "2.9 g CO₂", "solved in ~20% of the tokens"],
  },
  {
    prompt: "add Stripe checkout to my store",
    skill: "stripe-checkout-session",
    trust: "0.89",
    resultLines: [
      "Installed stripe · created /api/checkout (Checkout Session)",
      "verified webhook /api/stripe/webhook · success_check: session.url returned  ✓",
    ],
    savedTokens: "22,100 tokens",
    chips: ["9.3 Wh", "221 mL water", "3.5 g CO₂", "solved in ~18% of the tokens"],
  },
  {
    prompt: "containerize this service with Docker",
    skill: "node-docker-multistage",
    trust: "0.96",
    resultLines: [
      "Wrote multi-stage Dockerfile · .dockerignore · healthcheck",
      "image builds 142MB · success_check: container responds 200  ✓",
    ],
    savedTokens: "9,800 tokens",
    chips: ["4.1 Wh", "98 mL water", "1.6 g CO₂", "solved in ~22% of the tokens"],
  },
];

/* The blinking block cursor, reused in a few places. */
function Cursor({ on = true }: { on?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="ml-0.5 inline-block h-[1.05em] w-[0.55ch] translate-y-[0.12em] rounded-[1px] bg-emerald-300/90 align-middle"
      animate={on ? { opacity: [1, 1, 0, 0] } : { opacity: 0 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* A small shimmering "working…" line (used for searching + applying). */
function Shimmer({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-white/40">
      <motion.span
        aria-hidden
        className="inline-block h-[7px] w-[7px] rounded-full bg-emerald-300/80"
        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative overflow-hidden">
        <span className="relative z-10">{children}</span>
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent"
          style={{ mixBlendMode: "overlay" }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
    </span>
  );
}

const lineRise: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

function TerminalWindow({ inView }: { inView: boolean }) {
  const [phase, setPhase] = useState<Phase>("typing-prompt");
  const [typed, setTyped] = useState(""); // prompt characters revealed
  const [resultCount, setResultCount] = useState(0); // result lines revealed
  const [resultTyped, setResultTyped] = useState(0); // chars of current result line
  const [loop, setLoop] = useState(0); // increments each run; also drives scenario index

  const scenario = SCENARIOS[loop % SCENARIOS.length];
  const { prompt: PROMPT, resultLines: RESULT_LINES, chips: CHIPS } = scenario;

  // All pending timers, cleared on unmount / reset.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wait = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };
  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // ── The master timeline. Re-runs whenever `loop` increments. ──────────
  useEffect(() => {
    clearAll();
    setPhase("typing-prompt");
    setTyped("");
    setResultCount(0);
    setResultTyped(0);

    // Stay empty until the section is actually in view, and restart from the
    // very beginning each time it re-enters (never arrive to a finished run).
    if (!inView) return;

    // 1. Type the prompt char by char (slightly irregular cadence).
    let acc = 450;
    for (let i = 1; i <= PROMPT.length; i++) {
      const step = 26 + (i % 5 === 0 ? 55 : 0) + Math.random() * 34;
      acc += step;
      wait(acc, () => setTyped(PROMPT.slice(0, i)));
    }

    // 2. searching the commons…
    acc += 520;
    wait(acc, () => setPhase("searching"));

    // 3. ✓ found skill
    acc += 900;
    wait(acc, () => setPhase("found"));

    // 4. ▸ applying skill…
    acc += 750;
    wait(acc, () => setPhase("applying"));

    // 5. result lines type out
    acc += 720;
    wait(acc, () => setPhase("result"));

    let racc = acc + 120;
    RESULT_LINES.forEach((line, li) => {
      racc += 220; // small gap before each line begins
      for (let c = 1; c <= line.length; c++) {
        racc += 8 + Math.random() * 10;
        wait(racc, () => {
          setResultCount(li + 1);
          setResultTyped(c);
        });
      }
    });

    // 6. savings panel pops in
    racc += 560;
    wait(racc, () => setPhase("savings"));

    // 7. hold the completed result ~4s so it can be read, then fade + reset + loop
    racc += 4000;
    wait(racc, () => setPhase("hold"));
    racc += 800;
    wait(racc, () => setLoop((n) => n + 1));

    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, inView]);

  // Clean up timers on unmount.
  useEffect(() => clearAll, []);

  const fadingOut = phase === "hold";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 22 }}
      animate={
        inView
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 0, scale: 0.94, y: 22 }
      }
      transition={{ duration: 1, ease, delay: 0.25 }}
      className="relative w-full"
    >
      {/* soft emerald outer glow ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-[radial-gradient(120%_120%_at_50%_0%,rgba(52,211,153,0.22),transparent_60%)] blur-[2px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-20 rounded-[28px] bg-emerald-400/[0.06] blur-3xl"
      />

      <motion.div
        animate={{ opacity: fadingOut ? 0.35 : 1 }}
        transition={{ duration: 0.7, ease }}
        className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e0f0e] to-[#0a0b0a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(52,211,153,0.05),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
      >
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.015] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]/90 shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]/90 shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]/90 shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
          </div>
          <div className="flex flex-1 items-center justify-center gap-2">
            <span className="font-mono text-[11px] tracking-wide text-white/35">
              claude
            </span>
            <span className="text-white/15">·</span>
            <span className="font-mono text-[11px] tracking-wide text-emerald-300/60">
              mycelium
            </span>
          </div>
          {/* keep title centered with a spacer mirroring the dots */}
          <div className="h-3 w-[52px]" />
        </div>

        {/* Terminal body — grows to fit the tallest scenario so nothing clips. */}
        <div className="relative min-h-[330px] px-5 py-4 font-mono text-[12px] leading-[1.5] sm:text-[12.5px]">
          <div className="flex flex-col gap-[3px]">
            {/* 1 ─ Prompt */}
            <div className="flex items-start">
              <span className="mr-2 select-none text-emerald-400/70">&gt;</span>
              <span className="text-white/90">
                {typed}
                {phase === "typing-prompt" && <Cursor />}
              </span>
            </div>

            {/* 2 ─ searching the commons… */}
            <AnimatePresence>
              {phase === "searching" && (
                <motion.div
                  variants={lineRise}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  className="pl-[1.1rem]"
                >
                  <Shimmer>searching the commons…</Shimmer>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3 ─ found skill (persists after search) */}
            {(phase === "found" ||
              phase === "applying" ||
              phase === "result" ||
              phase === "savings" ||
              phase === "hold") && (
              <motion.div
                variants={lineRise}
                initial="hidden"
                animate="show"
                className="flex flex-wrap items-center gap-x-1 pl-[1.1rem] text-white/55"
              >
                <span className="text-emerald-400">✓</span>
                <span className="ml-1">found skill</span>
                <span className="ml-1 rounded-md border border-emerald-400/20 bg-emerald-400/[0.07] px-1.5 py-px font-medium text-emerald-200/90">
                  {scenario.skill}
                </span>
                <span className="mx-1 text-white/20">·</span>
                <span className="text-white/50">
                  trust{" "}
                  <span className="text-emerald-300/90">{scenario.trust}</span>
                </span>
                <span className="mx-1 text-white/20">·</span>
                <span className="text-white/40">proven on your env</span>
              </motion.div>
            )}

            {/* 4 ─ applying skill… (shimmer while applying) */}
            <AnimatePresence>
              {phase === "applying" && (
                <motion.div
                  variants={lineRise}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  className="pl-[1.1rem]"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="text-emerald-400/80">▸</span>
                    <Shimmer>applying skill…</Shimmer>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 5 ─ result lines, typed out */}
            {(phase === "result" || phase === "savings" || phase === "hold") &&
              RESULT_LINES.slice(0, resultCount).map((line, i) => {
                const isCurrent = i === resultCount - 1;
                const shown =
                  isCurrent && phase === "result"
                    ? line.slice(0, resultTyped)
                    : line;
                const stillTyping =
                  isCurrent && phase === "result" && resultTyped < line.length;
                return (
                  <motion.div
                    key={i}
                    variants={lineRise}
                    initial="hidden"
                    animate="show"
                    className="flex items-start pl-[1.1rem] text-white/70"
                  >
                    <span className="mr-2 select-none text-white/25">·</span>
                    <span className="text-pretty">
                      <span className="text-white/75">{shown}</span>
                      {stillTyping && <Cursor />}
                    </span>
                  </motion.div>
                );
              })}

            {/* 6 ─ SAVINGS PANEL */}
            <AnimatePresence>
              {(phase === "savings" || phase === "hold") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.55,
                    ease,
                    scale: { type: "spring", stiffness: 260, damping: 18 },
                  }}
                  className="relative mt-3 overflow-hidden rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/[0.10] to-emerald-400/[0.02] px-4 py-3"
                >
                  {/* soft pulsing emerald glow behind the panel */}
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-emerald-400/20 blur-2xl"
                    animate={{ opacity: [0.45, 0.8, 0.45] }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium tracking-tight text-emerald-50">
                      Mycelium saved{" "}
                      <span className="text-emerald-300">
                        {scenario.savedTokens}
                      </span>{" "}
                      this turn
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {CHIPS.map((chip, i) => (
                      <motion.span
                        key={chip}
                        initial={{ opacity: 0, y: 6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.4,
                          ease,
                          delay: 0.22 + i * 0.08,
                        }}
                        className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-1 text-[11px] tracking-tight text-emerald-100/90"
                      >
                        {chip}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* small caption under the terminal */}
      <p className="mt-4 text-center text-[12px] text-white/35">
        Every reused skill is energy, water, and carbon the network never spends
        twice.
      </p>
    </motion.div>
  );
}

export default function WhatItIsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });

  return (
    <section
      ref={ref}
      className="relative isolate flex h-screen w-full items-center justify-center overflow-hidden bg-transparent"
    >
      {/* ── Ambient depth glow (toned down) ─────────────────────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[42rem] w-[58rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
        animate={{
          background: [
            "radial-gradient(circle, rgba(52,211,153,0.10), transparent 64%)",
            "radial-gradient(circle, rgba(45,212,191,0.10), transparent 64%)",
            "radial-gradient(circle, rgba(34,211,238,0.08), transparent 64%)",
            "radial-gradient(circle, rgba(52,211,153,0.10), transparent 64%)",
          ],
          scale: [1, 1.05, 1.02, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Subtle mycelium filament ambience ───────────────────────────── */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.55]"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
        fill="none"
      >
        <defs>
          <linearGradient id="wii-hypha" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <filter
            id="wii-node-glow"
            x="-300%"
            y="-300%"
            width="700%"
            height="700%"
          >
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* filaments drawn on scroll-in */}
        {FILAMENTS.map((f, i) => (
          <motion.path
            key={`fil-${i}`}
            id={`wii-fil-${i}`}
            d={f.d}
            stroke="url(#wii-hypha)"
            strokeWidth={f.w ?? 0.6}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              inView
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: 2.4, delay: 0.4 + i * 0.05, ease }}
          />
        ))}

        {/* faint pulsing junction nodes */}
        {[
          [260, 286], [820, 286], [520, 648], [568, 312], [568, 528], [420, 270],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={`node-${i}`}
            cx={cx}
            cy={cy}
            r="1.6"
            fill="#6ee7b7"
            filter="url(#wii-node-glow)"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: [0.25, 0.65, 0.25] } : { opacity: 0 }}
            transition={{
              duration: 4 + (i % 4),
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1 + i * 0.25,
            }}
          />
        ))}

        {/* a couple of drifting carrier nodes travelling the network */}
        {CARRIERS.map((f, i) => (
          <Carrier
            key={`carrier-${i}`}
            pathId={`wii-fil-${FILAMENTS.indexOf(f)}`}
            dur={9 + (i % 3) * 1.4}
            begin={i * 1.3}
            reverse={f.reverse}
          />
        ))}
      </svg>


      {/* ── Two-column content: explanation (left) + terminal (right) ───── */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2 md:gap-14 lg:gap-20">
        {/* LEFT — explanation */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="relative flex flex-col items-center text-center md:items-start md:text-left"
        >
          {/* dark scrim so copy stays readable over the network */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-12 -inset-y-10 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgba(10,10,10,0.9),rgba(10,10,10,0.6)_58%,transparent_82%)] blur-md"
          />

          <motion.h2
            variants={rise}
            className="text-balance text-3xl font-medium leading-[1.06] tracking-tight text-white sm:text-4xl lg:text-[2.9rem]"
          >
            A living shared memory for AI agents.
          </motion.h2>

          <motion.p
            variants={rise}
            className="mt-5 max-w-xl text-pretty text-[14.5px] leading-relaxed text-white/60 md:text-[15px]"
          >
            This is built on a real phenomenon. In an actual rainforest, no tree
            grows alone. Underground, a living fungal{" "}
            <span className="text-white/80">mycelium network</span> (biologists
            call it the &ldquo;Wood&nbsp;Wide&nbsp;Web&rdquo;) physically links
            tree roots, letting them trade nutrients, water, and even warnings.
            It isn&apos;t a metaphor; it&apos;s how forests genuinely share what
            they learn.{" "}
            <span className="text-white/80">
              Today, AI agents grow alone. Mycelium gives them that same network.
            </span>
          </motion.p>

          <motion.div
            variants={rise}
            className="mt-6 flex flex-col items-center md:items-start"
          >
            <span
              aria-hidden
              className="mb-4 h-px w-20 bg-gradient-to-r from-emerald-300/40 to-transparent"
            />
            <p className="max-w-xl text-pretty text-[14px] leading-relaxed text-white/75 md:text-[14.5px]">
              An{" "}
              <span className="font-medium text-emerald-200/90">MCP server</span>{" "}
              you install anywhere, so every agent can publish what it learns and
              reuse what others already have.
            </p>
          </motion.div>
        </motion.div>

        {/* RIGHT — looping terminal */}
        <div className="w-full">
          <TerminalWindow inView={inView} />
        </div>
      </div>
    </section>
  );
}
