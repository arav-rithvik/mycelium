"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  animate,
  AnimatePresence,
} from "motion/react";

/**
 * "Trust you can watch fall."
 * A live Bayesian pass-rate gauge. Success checks fly in and push the needle
 * UP. A failure in a wrong environment flies in as a red X and JOLTS it DOWN,
 * flashing an "unproven" tag, then it recovers and loops forever.
 */

type Beat = {
  /** target trust value 0..1 after this beat resolves */
  to: number;
  /** kind of event flying in */
  kind: "pass" | "fail";
  /** ms to wait before firing this beat */
  delay: number;
};

// The whole story, in trust values. The drop is the point.
const TIMELINE: Beat[] = [
  { to: 0.5, kind: "pass", delay: 700 },
  { to: 0.71, kind: "pass", delay: 950 },
  { to: 0.84, kind: "pass", delay: 950 },
  { to: 0.93, kind: "pass", delay: 950 },
  { to: 0.41, kind: "fail", delay: 1150 }, // the fall
  { to: 0.58, kind: "pass", delay: 1400 }, // recover a touch
  { to: 0.74, kind: "pass", delay: 950 },
];

const R = 118; // arc radius
const STROKE = 13;
const START_ANGLE = 135; // degrees
const SWEEP = 270; // total arc sweep
const CX = 230;
const CY = 230;

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx: number, cy: number, r: number, from: number, to: number) => {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
};

type Flyer = { id: number; kind: "pass" | "fail" };

export default function EarnedTrustViz() {
  const reduceMotion = useReducedMotion();
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [unproven, setUnproven] = useState(false);
  const [display, setDisplay] = useState("0.00");

  // raw trust (drives label) and a springy mirror (drives the arc) so a drop
  // visibly overshoots and settles.
  const trust = useMotionValue(0);
  const arcTrust = useSpring(trust, { stiffness: 90, damping: 13, mass: 0.9 });

  const flashRed = useMotionValue(0); // 0..1 red wash intensity
  const shakeX = useMotionValue(0);

  const totalLen = (SWEEP / 360) * 2 * Math.PI * R;
  const dashOffset = useTransform(arcTrust, (t) =>
    totalLen * (1 - Math.max(0, Math.min(1, t))),
  );
  const needleAngle = useTransform(arcTrust, (t) =>
    START_ANGLE + SWEEP * Math.max(0, Math.min(1, t)),
  );
  const needleX = useTransform(needleAngle, (deg) => polar(CX, CY, R - STROKE / 2 - 2, deg).x);
  const needleY = useTransform(needleAngle, (deg) => polar(CX, CY, R - STROKE / 2 - 2, deg).y);

  const arcColor = useTransform(flashRed, [0, 1], ["#34d399", "#f87171"]);
  const glowColor = useTransform(flashRed, [0, 1], ["#34d399", "#f87171"]);

  const idRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stops = useRef<Array<() => void>>([]);

  useEffect(() => {
    let alive = true;
    const after = (ms: number, fn: () => void) => {
      const t = setTimeout(() => {
        if (alive) fn();
      }, ms);
      timers.current.push(t);
    };

    const unsub = trust.on("change", (v) => setDisplay(v.toFixed(2)));

    // Respect reduced-motion: skip the flying tokens / shake / looping climb
    // and just settle on a representative trust value.
    if (reduceMotion) {
      trust.set(0.74);
      return () => {
        alive = false;
        unsub();
      };
    }

    const runBeat = (i: number, onDone: () => void) => {
      const beat = TIMELINE[i];
      after(beat.delay, () => {
        const id = ++idRef.current;
        setFlyer({ id, kind: beat.kind });

        // mid-flight impact
        after(520, () => {
          if (beat.kind === "fail") {
            setUnproven(true);
            const s1 = animate(flashRed, [0, 1, 0], {
              duration: 0.9,
              times: [0, 0.18, 1],
              ease: "easeOut",
            });
            const s2 = animate(shakeX, [0, -9, 8, -6, 4, -2, 0], {
              duration: 0.55,
              ease: "easeInOut",
            });
            stops.current.push(s1.stop, s2.stop);
            after(1500, () => setUnproven(false));
          }
          const s3 = animate(trust, beat.to, {
            duration: beat.kind === "fail" ? 0.42 : 0.7,
            ease: beat.kind === "fail" ? [0.7, 0, 0.3, 1] : "easeOut",
          });
          stops.current.push(s3.stop);
          after(beat.kind === "fail" ? 900 : 700, () => setFlyer(null));
          after(beat.kind === "fail" ? 1000 : 800, onDone);
        });
      });
    };

    const loop = () => {
      let i = 0;
      const step = () => {
        if (!alive) return;
        if (i >= TIMELINE.length) {
          after(1100, () => {
            const sr = animate(trust, 0, { duration: 0.6, ease: "easeIn" });
            stops.current.push(sr.stop);
            after(700, () => {
              if (alive) loop();
            });
          });
          return;
        }
        const cur = i++;
        runBeat(cur, step);
      };
      step();
    };

    loop();

    return () => {
      alive = false;
      unsub();
      timers.current.forEach(clearTimeout);
      timers.current = [];
      stops.current.forEach((s) => s());
      stops.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* dark pool that fades into the page so the dial reads as a glow, not a box */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,9,8,0.92)_28%,rgba(6,9,8,0.6)_54%,transparent_80%)]" />
      {/* ambient field (no box, no grid, just a soft emerald halo) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(52,211,153,0.10),transparent_60%)]" />
      {/* failure red wash */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        style={{
          background:
            "radial-gradient(circle at 50% 46%,rgba(248,113,113,0.26),transparent 58%)",
          opacity: flashRed,
        }}
      />

      {/* centered composition: the gauge is the sole focal point */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-[5%] md:p-[6%]"
        style={{ x: shakeX }}
      >
        <div className="relative flex aspect-square w-full max-w-[480px] items-center justify-center md:max-w-[520px]">
          <svg viewBox="0 0 460 460" className="h-full w-full overflow-visible">
            <defs>
              <filter id="trustGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* minimal endpoint ticks: just mark the empty/full extents */}
            {[START_ANGLE, START_ANGLE + SWEEP].map((deg, i) => {
              const a = polar(CX, CY, R + 12, deg);
              const b = polar(CX, CY, R + 20, deg);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
              );
            })}

            {/* track */}
            <path
              d={arcPath(CX, CY, R, START_ANGLE, START_ANGLE + SWEEP)}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />

            {/* live trust arc */}
            <motion.path
              d={arcPath(CX, CY, R, START_ANGLE, START_ANGLE + SWEEP)}
              fill="none"
              stroke={arcColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={totalLen}
              strokeDashoffset={dashOffset}
              filter="url(#trustGlow)"
            />

            {/* needle */}
            <motion.line
              x1={CX}
              y1={CY}
              x2={needleX}
              y2={needleY}
              stroke={glowColor}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.9}
            />
            <circle
              cx={CX}
              cy={CY}
              r={9}
              fill="#0a0a0a"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
            />
            <motion.circle cx={CX} cy={CY} r={4} fill={glowColor} />
          </svg>

          {/* center readout */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.42em] text-emerald-300/55 md:text-xs">
              pass rate
            </span>
            <motion.span
              className="font-mono text-[64px] font-semibold leading-none tabular-nums md:text-[72px]"
              initial={false}
              style={{ color: arcColor }}
            >
              {display}
            </motion.span>
            <span className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.32em] text-white/30 md:text-[11px]">
              live trust
            </span>

            {/* unproven flag, kept fully inside the gauge bowl */}
            <AnimatePresence>
              {unproven && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                  className="absolute top-[63%] flex items-center gap-1.5 rounded-full border border-[#f87171]/45 bg-[#f87171]/10 px-3 py-1"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f87171]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#f87171]">
                    unproven
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* flying event token */}
          <AnimatePresence mode="popLayout">
            {flyer && <EventToken key={flyer.id} kind={flyer.kind} />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function EventToken({ kind }: { kind: "pass" | "fail" }) {
  const pass = kind === "pass";
  const fromX = pass ? -118 : 118;
  const fromY = pass ? -76 : 76;
  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      initial={{ x: fromX, y: fromY, opacity: 0, scale: 0.4 }}
      animate={{
        x: [fromX, fromX * 0.18, 0],
        y: [fromY, fromY * 0.18, 0],
        opacity: [0, 1, 1, 0],
        scale: [0.4, 1, pass ? 1.2 : 1.4, 0.6],
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        duration: pass ? 0.78 : 0.92,
        ease: "easeOut",
        times: [0, 0.55, 0.82, 1],
      }}
      style={{ marginLeft: -20, marginTop: -20 }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-sm"
        style={{
          borderColor: pass ? "rgba(110,231,183,0.55)" : "rgba(248,113,113,0.6)",
          background: pass ? "rgba(52,211,153,0.16)" : "rgba(248,113,113,0.18)",
          boxShadow: pass
            ? "0 0 24px rgba(52,211,153,0.45)"
            : "0 0 30px rgba(248,113,113,0.55)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          {pass ? (
            <path
              d="M5 12.5l4.2 4.2L19 7"
              stroke="#6ee7b7"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M7 7l10 10M17 7L7 17"
              stroke="#f87171"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </motion.div>
  );
}
