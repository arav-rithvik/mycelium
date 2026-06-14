"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";

/**
 * ProvenHealingSection — merges "Proven for your machine" (env-scoped trust)
 * with "It heals on contact" (self-healing on version drift) into ONE feature.
 *
 * One organism, one story: trust is conditioned on YOUR environment, and a new
 * version is just a new point in environment-space. A glowing emerald envelope
 * spans the proven versions; as the world drifts, a new version appears dim and
 * unproven, an agent packet travels to it and re-confirms — success WIDENS the
 * envelope, failure flashes red and PRUNES it. Below, the environment
 * fingerprint chips light up as "proven for your machine."
 */

const EMERALD = "#34d399";
const EMERALD_SOFT = "#6ee7b7";
const EMERALD_PALE = "#a7f3d0";
const RED = "#f87171";

const MASK =
  "linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent)";

const SPORES = [
  { top: "18%", left: "12%", d: 9, delay: 0 },
  { top: "70%", left: "20%", d: 12, delay: 1.5 },
  { top: "32%", left: "84%", d: 10, delay: 0.8 },
  { top: "78%", left: "72%", d: 14, delay: 2.2 },
  { top: "50%", left: "50%", d: 11, delay: 1.1 },
];

const DETAILS = [
  {
    heading: "ENVIRONMENT FINGERPRINT",
    text: "Framework, version, OS, key deps. Each skill stores the fingerprint of every environment it has proven itself in.",
  },
  {
    heading: "TRUSTED FOR YOU",
    text: "High overlap with your machine reads as trusted; low overlap reads as unproven — re-confirm before relying on it.",
  },
  {
    heading: "HEALS ON DRIFT",
    text: "A new major version is just a new point in environment-space. The first agent re-confirms it: success widens coverage, failure prunes it. No cron job.",
  },
];

export default function ProvenHealingSection({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const num = String(index).padStart(2, "0");

  return (
    <section
      data-snap
      ref={ref}
      className="relative isolate flex h-screen w-full items-center overflow-hidden bg-transparent"
    >
      {/* ambient dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(rgba(52,211,153,0.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 80%)",
        }}
      />
      {/* emerald glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -z-20 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.08),transparent_60%)] blur-[120px]"
        style={{ left: "-6rem" }}
      />
      {/* drifting spores */}
      {SPORES.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute -z-10 h-1 w-1 rounded-full bg-emerald-300/40 blur-[1px]"
          style={{ top: s.top, left: s.left }}
          initial={{ opacity: 0.2 }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: s.d, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        />
      ))}

      <div className="relative z-[5] mx-auto flex w-full max-w-7xl flex-col justify-center gap-8 px-8 md:px-14">
        <div className="grid w-full items-center gap-10 md:grid-cols-[0.92fr_1.08fr] md:gap-14">
          {/* TEXT + CARDS */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col gap-5"
          >
            {/* soft dark scrim so the heading + copy stay readable over the canopy */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-7 -inset-y-6 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(5,8,7,0.92),rgba(5,8,7,0.45)_62%,transparent_84%)] blur-md"
            />
            <div className="flex items-center gap-4">
              <span className="font-mono text-2xl font-medium leading-none text-emerald-300">
                {num}
              </span>
              <span className="h-px w-12 flex-none bg-gradient-to-r from-emerald-400/50 to-transparent" />
              <span className="font-mono text-[11px] tracking-wider text-white/25">
                / {String(total).padStart(2, "0")}
              </span>
            </div>
            <h3 className="text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-[2.6rem]">
              Proven for your machine.
              <br />
              Healed on drift.
            </h3>
            <p className="max-w-lg text-base leading-relaxed text-white/60 md:text-lg">
              Trust is conditioned on your environment — and a new version is just a
              new environment. Confirm a skill where you run it and the proven
              envelope widens; when it breaks, it prunes itself. No re-verification
              job, no rot.
            </p>

            <div className="mt-2 flex max-w-lg flex-col gap-2.5">
              {DETAILS.map((d) => (
                <div
                  key={d.heading}
                  className="group rounded-xl border border-emerald-400/10 bg-[#070b09]/85 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md px-4 py-3 text-left transition-colors duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/[0.08]"
                >
                  <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-emerald-300/90">
                    {d.heading}
                  </div>
                  <div className="mt-1.5 text-sm leading-relaxed text-white/45 transition-colors group-hover:text-white/65">
                    {d.text}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* UNIFIED VIZ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto aspect-square w-full max-w-[clamp(380px,46vw,640px)]"
          >
            <div
              className="absolute inset-0"
              style={{
                maskImage: MASK,
                WebkitMaskImage: MASK,
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
              }}
            >
              <ProvenHealingViz />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * The unified animation: a version timeline (each node = an environment point)
 * with a glowing proven envelope band that widens on heal and prunes on fail,
 * plus environment-fingerprint chips that read "proven for your machine".
 * -------------------------------------------------------------------------- */

const VERSIONS = ["v17", "v18", "v19", "v20", "v21", "v22"];

// 100x100 viewBox geometry with a comfortable safe inset on every side.
const TRACK_X0 = 17;
const TRACK_X1 = 83;
const TRACK_Y = 40;
const SLOT_X = (i: number) =>
  TRACK_X0 + (i / (VERSIONS.length - 1)) * (TRACK_X1 - TRACK_X0);

// Environment fingerprint chips, drawn below the timeline. They light up as the
// proven envelope confirms the user's machine.
const CHIPS = ["react 21", "node 22", "macOS", "vite 6"];

type Phase =
  | "idle"
  | "arrive"
  | "checking"
  | "heal"
  | "settle"
  | "wilt"
  | "prune";

function ProvenHealingViz() {
  const reduced = useReducedMotion();

  // provenIndex = highest version index currently inside the proven envelope.
  const [provenIndex, setProvenIndex] = useState(3); // v17..v20 proven
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetIndex, setTargetIndex] = useState(4);
  const [outcome, setOutcome] = useState<"pass" | "fail">("pass");
  const [brokenIndex, setBrokenIndex] = useState<number | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Reduced motion: park at a sensible static end-state and run nothing.
    if (reduced) {
      setProvenIndex(4); // v17..v21 proven (healed end-state)
      setPhase("settle");
      setTargetIndex(4);
      setBrokenIndex(null);
      return;
    }

    const list = timers.current;
    const after = (ms: number, fn: () => void) => {
      list.push(setTimeout(fn, ms));
    };

    let healsDone = 0;

    const reset = () => {
      setProvenIndex(3);
      setBrokenIndex(null);
      setTargetIndex(4);
      setOutcome("pass");
      setPhase("idle");
      after(1000, () => runCycle(4, "pass"));
    };

    const runCycle = (target: number, result: "pass" | "fail") => {
      setTargetIndex(target);
      setOutcome(result);
      setPhase("arrive");
      after(950, () => setPhase("checking"));
      after(2350, () => {
        if (result === "pass") {
          setPhase("heal");
          after(1100, () => setProvenIndex(target));
          after(1450, () => setPhase("settle"));
          after(2700, () => {
            healsDone += 1;
            // After the envelope reaches v21, attempt v22 — that one prunes.
            if (healsDone >= 1) {
              runCycle(target + 1, "fail");
            } else {
              runCycle(target + 1, "pass");
            }
          });
        } else {
          setPhase("wilt");
          after(1200, () => {
            setPhase("prune");
            setBrokenIndex(target);
          });
          after(3200, () => reset());
        }
      });
    };

    after(1000, () => runCycle(4, "pass"));
    return () => {
      list.forEach(clearTimeout);
      list.length = 0;
    };
  }, [reduced]);

  const provenRight = SLOT_X(provenIndex);
  const targetX = SLOT_X(targetIndex);
  const checking = phase === "checking";
  const healing = phase === "heal" || phase === "settle";
  const failing = phase === "wilt" || phase === "prune";
  const agentVisible =
    phase === "arrive" || phase === "checking" || phase === "wilt";

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* soft radial emerald glow behind the organism */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(52,211,153,0.10), transparent 62%)",
        }}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="ph-proven" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={EMERALD} stopOpacity="0.3" />
            <stop offset="100%" stopColor={EMERALD_SOFT} stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="ph-edge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EMERALD_PALE} stopOpacity="0.95" />
            <stop offset="100%" stopColor={EMERALD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ph-edge-red" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RED} stopOpacity="0.85" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ph-grid-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="60%" stopColor="white" stopOpacity="0.45" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <pattern id="ph-grid" width="9" height="9" patternUnits="userSpaceOnUse">
            <path
              d="M9 0 H0 V9"
              fill="none"
              stroke="rgba(52,211,153,0.5)"
              strokeWidth="0.15"
            />
          </pattern>
          <mask id="ph-grid-mask">
            <rect x="0" y="0" width="100" height="100" fill="url(#ph-grid-fade)" />
          </mask>
          <filter id="ph-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint radially-faded grid atmosphere */}
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="url(#ph-grid)"
          mask="url(#ph-grid-mask)"
          opacity={0.4}
        />

        {/* ----- VERSION TIMELINE = environment points ----- */}

        {/* base track */}
        <rect
          x={TRACK_X0}
          y={TRACK_Y - 1.6}
          width={TRACK_X1 - TRACK_X0}
          height={3.2}
          rx={1.6}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.25}
        />

        {/* proven envelope band — widens on heal */}
        <motion.rect
          y={TRACK_Y - 1.6}
          height={3.2}
          rx={1.6}
          fill="url(#ph-proven)"
          x={TRACK_X0}
          initial={false}
          animate={{ width: provenRight - TRACK_X0 }}
          transition={{ duration: reduced ? 0 : 1.05, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* glow riding the moving boundary */}
        <motion.circle
          cy={TRACK_Y}
          fill="url(#ph-edge)"
          initial={false}
          animate={{
            cx: provenRight,
            r: healing ? 4.4 : 2.4,
            opacity: healing ? 1 : 0.55,
          }}
          transition={{ duration: reduced ? 0 : 1.05, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* version nodes */}
        {VERSIONS.map((label, i) => {
          const x = SLOT_X(i);
          const isProven = i <= provenIndex;
          const isBroken = brokenIndex === i;
          const isTarget = i === targetIndex && phase !== "idle";
          const nodeColor = isBroken
            ? RED
            : isProven
              ? EMERALD
              : "rgba(255,255,255,0.28)";
          return (
            <g key={label}>
              <line
                x1={x}
                y1={TRACK_Y - 4}
                x2={x}
                y2={TRACK_Y + 4}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={0.18}
              />
              {isProven && !isBroken && (
                <circle cx={x} cy={TRACK_Y} r={3.4} fill="url(#ph-edge)" opacity={0.5} />
              )}
              <motion.circle
                cx={x}
                cy={TRACK_Y}
                initial={false}
                animate={{
                  r: isTarget ? 2.7 : 1.7,
                  fill: nodeColor,
                  opacity: isBroken && phase === "prune" ? 0.25 : 1,
                }}
                transition={{ duration: 0.5 }}
              />
              <motion.text
                x={x}
                y={TRACK_Y + 9}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: "3.4px", letterSpacing: "-0.05px" }}
                initial={false}
                animate={{
                  fill: isBroken
                    ? RED
                    : isProven
                      ? EMERALD_SOFT
                      : "rgba(255,255,255,0.32)",
                  opacity: isBroken && phase === "prune" ? 0.55 : 1,
                }}
                transition={{ duration: 0.5 }}
              >
                {label}
              </motion.text>
            </g>
          );
        })}

        {/* checking scan ring at the target environment point */}
        <AnimatePresence>
          {checking && (
            <motion.circle
              key="scan"
              cx={targetX}
              cy={TRACK_Y}
              r={5}
              fill="none"
              stroke={EMERALD_SOFT}
              strokeWidth={0.6}
              strokeDasharray="6 24"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.3 },
                rotate: { duration: 1.1, repeat: Infinity, ease: "linear" },
              }}
              style={{ originX: "50%", originY: "50%", transformBox: "fill-box" }}
            />
          )}
        </AnimatePresence>

        {/* agent packet that travels down onto the target version */}
        <AnimatePresence>
          {agentVisible && (
            <motion.g
              key={`agent-${targetIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.g
                initial={{ y: -22 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <rect
                  x={targetX - 0.18}
                  y={TRACK_Y - 13}
                  width={0.36}
                  height={7}
                  fill={`url(${failing ? "#ph-edge-red" : "#ph-edge"})`}
                  opacity={0.6}
                />
                <circle
                  cx={targetX}
                  cy={TRACK_Y - 13}
                  r={2.6}
                  fill="url(#ph-edge)"
                  opacity={failing ? 0 : 0.5}
                />
                <circle
                  cx={targetX}
                  cy={TRACK_Y - 13}
                  r={1.1}
                  fill={failing ? RED : EMERALD_SOFT}
                />
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* failure prune scatter */}
        <AnimatePresence>
          {phase === "prune" && brokenIndex !== null && (
            <motion.g key="prune" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {[0, 1, 2, 3, 4].map((k) => {
                const ang = (k / 5) * Math.PI * 2;
                return (
                  <motion.circle
                    key={k}
                    cx={SLOT_X(brokenIndex)}
                    cy={TRACK_Y}
                    r={0.7}
                    fill={RED}
                    initial={{ opacity: 0.9 }}
                    animate={{
                      cx: SLOT_X(brokenIndex) + Math.cos(ang) * 6,
                      cy: TRACK_Y + Math.sin(ang) * 6,
                      opacity: 0,
                    }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* status caption (above timeline) — short, centered, width-locked */}
        <AnimatePresence mode="wait">
          <motion.g
            key={phase + targetIndex}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.4 }}
          >
            <StatusLine phase={phase} target={VERSIONS[targetIndex]} />
          </motion.g>
        </AnimatePresence>

        {/* ----- ENVIRONMENT FINGERPRINT echo: "proven for your machine" ----- */}
        <EnvFingerprint provenForMe={!failing && provenIndex >= 4} reduced={!!reduced} />
      </svg>
    </div>
  );
}

/* ---- env fingerprint chips that confirm the user's machine ---- */
function EnvFingerprint({
  provenForMe,
  reduced,
}: {
  provenForMe: boolean;
  reduced: boolean;
}) {
  // Pushed slightly lower now that the bottom verdict line is gone, so the
  // composition (caption → timeline → chips) sits balanced in the safe area.
  const ROW_Y = 69;
  const n = CHIPS.length;
  const total = TRACK_X1 - TRACK_X0;
  const gap = 2;
  const w = (total - gap * (n - 1)) / n;
  const h = 7.5;
  // Chip inner layout: the status dot sits at a fixed inset from the left edge,
  // and the label is centered within the REMAINING space to the dot's right.
  // This keeps the dot clear of the first glyph (the overlap bug) while still
  // letting longer labels like "react 21" use the full available width.
  // No status dot anymore — the label is centered in the full chip box.
  const labelCx = w / 2;

  return (
    <g>
      <text
        x={50}
        y={ROW_Y - 4.2}
        textAnchor="middle"
        className="font-mono"
        style={{
          fontSize: "2.7px",
          letterSpacing: "1.1px",
          fill: "rgba(255,255,255,0.32)",
        }}
      >
        YOUR ENVIRONMENT
      </text>
      {CHIPS.map((label, i) => {
        const x = TRACK_X0 + i * (w + gap);
        return (
          <g key={label}>
            <motion.rect
              x={x}
              y={ROW_Y}
              width={w}
              height={h}
              rx={2}
              initial={false}
              animate={{
                fill: provenForMe ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.025)",
                stroke: provenForMe ? EMERALD : "rgba(255,255,255,0.12)",
              }}
              transition={{
                duration: reduced ? 0 : 0.6,
                delay: reduced ? 0 : i * 0.08,
              }}
              strokeWidth={0.4}
            />
            {/* label — centered in the full chip box (no leading dot) */}
            <text
              x={x + labelCx}
              y={ROW_Y + h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-mono"
              style={{
                fontSize: "2.6px",
                letterSpacing: "-0.1px",
                fill: provenForMe ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
              }}
            >
              {label}
            </text>
          </g>
        );
      })}
      {/*
       * The bottom verdict line was removed on purpose: it duplicated the
       * status caption above the timeline and created a third competing label
       * region. The chip fills (emerald = proven) now carry the "proven for
       * your machine" read on their own, keeping the eye path clean:
       * caption → timeline → chips.
       */}
    </g>
  );
}

function StatusLine({ phase, target }: { phase: Phase; target: string }) {
  // SHORT, punchy status words only — plain centered text at x=50 with
  // textAnchor="middle", so it can NEVER run off the viz edge regardless of
  // string. NO pill, NO leading dot, NO ✓/✗ glyphs, NO overlapping version tag.
  // The target version, when relevant, is folded directly into the single
  // centered word so there is no second competing label region.
  let word = "";
  let tone: "neutral" | "good" | "bad" = "neutral";
  switch (phase) {
    case "arrive":
      word = `NEW VERSION ${target.toUpperCase()}`;
      tone = "neutral";
      break;
    case "checking":
      word = `RE-CONFIRMING ${target.toUpperCase()}`;
      tone = "neutral";
      break;
    case "heal":
    case "settle":
      word = "PROVEN";
      tone = "good";
      break;
    case "wilt":
      word = "FAILED";
      tone = "bad";
      break;
    case "prune":
      word = "PRUNED";
      tone = "bad";
      break;
    default:
      word = "ENVELOPE HOLDING";
      tone = "good";
  }
  const color =
    tone === "good" ? EMERALD_SOFT : tone === "bad" ? RED : "rgba(255,255,255,0.65)";
  const cx = 50;
  const cy = 22;
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      className="font-mono"
      style={{ fontSize: "3.3px", letterSpacing: "0.5px", fill: color }}
    >
      {word}
    </text>
  );
}
