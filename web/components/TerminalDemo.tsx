"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, type Variants } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

/* ────────────────────────────────────────────────────────────────────────
   A simulated asciinema-style recording of Claude Code using Mycelium.
   One deterministic timeline, advanced by chained timeouts, looping forever.
   Every line is described declaratively so the sequencer stays readable.
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

export default function TerminalDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.45 });

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
  }, [loop]);

  // Pause/clean nothing extra on unmount beyond timers (handled above).
  useEffect(() => clearAll, []);

  const fadingOut = phase === "hold";

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex h-screen w-full items-center justify-center overflow-hidden bg-[#0a0a0a] px-6"
    >
      {/* ── Ambient emerald glow, matching sibling sections ─────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
        animate={{
          opacity: [0.55, 0.8, 0.55],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle, rgba(52,211,153,0.14), transparent 62%)",
        }}
      />
      {/* faint grid / scanline texture for "screen" feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5] [background-image:linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:100%_3px]"
      />
      {/* feather top & bottom into bg so it blends with neighbors */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]"
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        {/* ── Eyebrow + headline (compact) ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={
            inView
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 16, filter: "blur(6px)" }
          }
          transition={{ duration: 0.8, ease }}
          className="mb-6 flex flex-col items-center text-center"
        >
          <span className="inline-flex items-center rounded-full border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.32em] text-emerald-200/80 backdrop-blur-sm">
            See it run
          </span>
          <h2 className="mt-5 text-balance text-3xl font-medium leading-[1.05] tracking-tight text-white sm:text-4xl">
            Reuse a proven skill,{" "}
            <span className="text-emerald-300/90">not your tokens.</span>
          </h2>
        </motion.div>

        {/* ── The terminal window ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 22 }}
          animate={
            inView
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.94, y: 22 }
          }
          transition={{ duration: 1, ease, delay: 0.12 }}
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

            {/* Terminal body — fixed height so the layout never jumps. */}
            <div className="relative h-[270px] overflow-hidden px-5 py-4 font-mono text-[13px] leading-[1.55] sm:text-[13.5px]">
              <div className="flex flex-col gap-[3px]">
                {/* 1 ─ Prompt */}
                <div className="flex items-start">
                  <span className="mr-2 select-none text-emerald-400/70">
                    &gt;
                  </span>
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
                {(phase === "result" ||
                  phase === "savings" ||
                  phase === "hold") &&
                  RESULT_LINES.slice(0, resultCount).map((line, i) => {
                    const isCurrent = i === resultCount - 1;
                    const shown =
                      isCurrent && phase === "result"
                        ? line.slice(0, resultTyped)
                        : line;
                    const stillTyping =
                      isCurrent &&
                      phase === "result" &&
                      resultTyped < line.length;
                    return (
                      <motion.div
                        key={i}
                        variants={lineRise}
                        initial="hidden"
                        animate="show"
                        className="flex items-start pl-[1.1rem] text-white/70"
                      >
                        <span className="mr-2 select-none text-white/25">
                          ·
                        </span>
                        <span className="text-pretty">
                          {/* highlight the ✓ and 302 if present */}
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
                        <span className="text-[13.5px] font-medium tracking-tight text-emerald-50">
                          Mycelium saved{" "}
                          <span className="text-emerald-300">{scenario.savedTokens}</span>{" "}
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
        </motion.div>

        {/* ── Sub-caption ──────────────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ duration: 0.8, ease, delay: 0.5 }}
          className="mt-5 text-center text-[12.5px] text-white/35"
        >
          Every reused skill is energy, water, and carbon the network never
          spends twice.
        </motion.p>
      </div>
    </section>
  );
}
