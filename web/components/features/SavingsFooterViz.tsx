"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";

/* ------------------------------------------------------------------ */
/*  "A receipt on every message"                                       */
/*  A chat bubble types two lines, then a savings receipt STAMPS onto  */
/*  its bottom edge with a green pulse. Tokens count up; three metric  */
/*  icons (leaf / water drop / cloud-bolt) fill and count. Hold, fade, */
/*  new message, loop forever. No outer box; soft over #0a0a0a.        */
/* ------------------------------------------------------------------ */

const ACCENT = "#34d399";
const ACCENT_LIGHT = "#6ee7b7";
const ACCENT_PALE = "#a7f3d0";

type Variant = {
  lines: [string, string];
  tokens: number;
  carbon: string; // CO2 grams
  water: string; // mL
  energy: string; // Wh
};

const VARIANTS: Variant[] = [
  {
    lines: ["Reusing your deploy skill.", "No need to re-derive the steps."],
    tokens: 14720,
    carbon: "3.1 g",
    water: "48 mL",
    energy: "9.4 Wh",
  },
  {
    lines: ["Pulled the cached schema.", "Skipping the full re-scan."],
    tokens: 9840,
    carbon: "2.0 g",
    water: "31 mL",
    energy: "6.2 Wh",
  },
  {
    lines: ["Recalled your review style.", "Applied it without a re-prompt."],
    tokens: 21360,
    carbon: "4.5 g",
    water: "70 mL",
    energy: "13.7 Wh",
  },
];

/* ------------------------------- icons ----------------------------- */

function LeafIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z"
        fill="currentColor"
        opacity={0.22}
      />
      <path
        d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M6 18C9 14 12 11 16 9"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function DropIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5c3.4 4 6 7 6 10a6 6 0 1 1-12 0c0-3 2.6-6 6-10Z"
        fill="currentColor"
        opacity={0.22}
      />
      <path
        d="M12 3.5c3.4 4 6 7 6 10a6 6 0 1 1-12 0c0-3 2.6-6 6-10Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M9.5 14.5a2.5 2.5 0 0 0 2 2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoltCloudIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 17a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 8.5a3.5 3.5 0 0 1 .4 6.97"
        fill="currentColor"
        opacity={0.18}
      />
      <path
        d="M7 17a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 8.5a3.5 3.5 0 0 1 .4 6.97"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M12 11.5 10 15h2.4L11 18.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* --------------------------- count-up hook ------------------------- */

function useCountUp(target: number, run: boolean, duration = 1100) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!run) {
      setValue(0);
      return;
    }
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      // easeOutExpo for a satisfying settle
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, run, duration]);

  return value;
}

/* ------------------------------ metric ----------------------------- */

function Metric({
  icon,
  value,
  show,
  delay,
}: {
  icon: React.ReactNode;
  value: string;
  show: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ opacity: 0, y: 6 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <div className="relative flex h-7 w-7 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${ACCENT}33, transparent 70%)`,
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={
            show
              ? { scale: [0.5, 1.25, 1], opacity: [0, 0.9, 0.5] }
              : { scale: 0.5, opacity: 0 }
          }
          transition={{ delay, duration: 0.6, ease: "easeOut" }}
        />
        <span style={{ color: ACCENT_LIGHT }}>{icon}</span>
      </div>
      <span
        className="font-mono text-[10px] tabular-nums tracking-tight"
        style={{ color: ACCENT_PALE }}
      >
        {value}
      </span>
    </motion.div>
  );
}

/* ------------------------------- main ------------------------------ */

export default function SavingsFooterViz() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });

  const [cycle, setCycle] = useState(0);
  // phase: 0 idle, 1 typing line A, 2 typing line B, 3 stamp + count, 4 hold/fade
  const [phase, setPhase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const variant = VARIANTS[cycle % VARIANTS.length];

  useEffect(() => {
    if (!inView) return;
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const schedule = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };

    setPhase(0);
    schedule(() => setPhase(1), 350); // bubble in -> type line A
    schedule(() => setPhase(2), 1250); // type line B
    schedule(() => setPhase(3), 2150); // stamp receipt + count up
    schedule(() => setPhase(4), 4700); // hold, then fade out
    schedule(() => setCycle((c) => c + 1), 5500); // next message

    return clear;
  }, [cycle, inView]);

  const counting = phase >= 3;
  const tokens = useCountUp(variant.tokens, counting);

  const visible = phase >= 1 && phase < 4;
  const showReceipt = phase >= 3;

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 flex items-center justify-center"
    >
      {/* soft ambient glow only - no hard-edged grid or frame */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 44%, rgba(52,211,153,0.12), transparent 72%)",
        }}
      />

      {/* centered stack; fixed min-height reserves room so the receipt
          never shifts layout or clips against the square edges */}
      <div className="relative flex w-full max-w-[300px] items-center justify-center px-6">
        <div
          className="flex w-full flex-col items-stretch"
          style={{ minHeight: 250 }}
        >
          {/* header label */}
          <motion.div
            className="mb-3 flex items-center gap-2 self-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-emerald-300/55">
              every reply
            </span>
          </motion.div>

          <AnimatePresence mode="wait">
            {visible && (
              <motion.div
                key={cycle}
                className="relative w-full"
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {/* assistant message bubble - soft frame, no hard edge */}
                <div
                  className="relative w-full rounded-2xl rounded-tl-md border px-4 pb-3 pt-3.5"
                  style={{
                    borderColor: showReceipt
                      ? "rgba(52,211,153,0.4)"
                      : "rgba(255,255,255,0.08)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))",
                    boxShadow: showReceipt
                      ? "0 0 0 1px rgba(52,211,153,0.16), 0 22px 60px -24px rgba(52,211,153,0.4)"
                      : "0 22px 60px -28px rgba(0,0,0,0.85)",
                    transition: "border-color 0.4s, box-shadow 0.4s",
                  }}
                >
                  {/* avatar + name */}
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_PALE})`,
                        color: "#06281c",
                      }}
                    >
                      M
                    </div>
                    <span className="font-mono text-[9px] tracking-wider text-white/45">
                      assistant
                    </span>
                  </div>

                  {/* typed lines */}
                  <div className="space-y-1">
                    <TypeLine
                      text={variant.lines[0]}
                      active={phase >= 1}
                      caret={phase === 1}
                    />
                    <TypeLine
                      text={variant.lines[1]}
                      active={phase >= 2}
                      caret={phase === 2}
                      muted
                    />
                  </div>

                  {/* ---------------- the receipt ---------------- */}
                  <AnimatePresence>
                    {showReceipt && (
                      <motion.div
                        key="receipt"
                        className="relative mt-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* perforation divider */}
                        <div
                          className="mb-2.5 h-px w-full"
                          style={{
                            backgroundImage:
                              "repeating-linear-gradient(90deg, rgba(52,211,153,0.45) 0 4px, transparent 4px 9px)",
                          }}
                        />

                        {/* stamp pulse ring - kept inset so it never clips */}
                        <motion.div
                          className="pointer-events-none absolute inset-0 rounded-xl"
                          style={{ border: `1px solid ${ACCENT}` }}
                          initial={{ opacity: 0.6, scale: 0.98 }}
                          animate={{ opacity: 0, scale: 1.04 }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />

                        <motion.div
                          className="rounded-xl border px-3 py-2.5"
                          style={{
                            borderColor: "rgba(52,211,153,0.25)",
                            background:
                              "linear-gradient(180deg, rgba(52,211,153,0.10), rgba(52,211,153,0.03))",
                          }}
                          initial={{ scale: 1.12, rotate: -1.2, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 16,
                          }}
                        >
                          {/* tokens headline */}
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-emerald-300/65">
                              saved
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span
                                className="font-mono text-[18px] font-semibold tabular-nums leading-none"
                                style={{
                                  color: ACCENT_LIGHT,
                                  textShadow: `0 0 14px ${ACCENT}66`,
                                }}
                              >
                                {tokens.toLocaleString("en-US")}
                              </span>
                              <span className="font-mono text-[9px] text-emerald-300/55">
                                tokens
                              </span>
                            </div>
                          </div>

                          {/* three metrics */}
                          <div className="mt-2.5 grid grid-cols-3 gap-1 border-t border-emerald-400/15 pt-2.5">
                            <Metric
                              icon={<LeafIcon />}
                              value={variant.carbon}
                              show={showReceipt}
                              delay={0.35}
                            />
                            <Metric
                              icon={<DropIcon />}
                              value={variant.water}
                              show={showReceipt}
                              delay={0.5}
                            />
                            <Metric
                              icon={<BoltCloudIcon />}
                              value={variant.energy}
                              show={showReceipt}
                              delay={0.65}
                            />
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* bubble tail */}
                <div
                  className="absolute -left-1 top-0 h-3 w-3"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))",
                    clipPath: "polygon(100% 0, 100% 100%, 0 0)",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- typed line ---------------------------- */

function TypeLine({
  text,
  active,
  caret,
  muted,
}: {
  text: string;
  active: boolean;
  caret?: boolean;
  muted?: boolean;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [active, text]);

  return (
    <p
      className="font-mono text-[11px] leading-snug"
      style={{
        color: muted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.82)",
      }}
    >
      {active ? text.slice(0, n) : ""}
      {caret && (
        <motion.span
          className="ml-0.5 inline-block h-3 w-1.5 -translate-y-px align-middle"
          style={{ background: ACCENT_LIGHT }}
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </p>
  );
}
