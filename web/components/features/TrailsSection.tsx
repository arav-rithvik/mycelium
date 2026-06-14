"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/**
 * Feature 03 — "Trails that strengthen with use."
 *
 * Centerpiece: ONE big, nicely-drawn ant walks left→right across a wide lane,
 * laying a glowing emerald pheromone trail behind it. The trail is brightest
 * right behind the ant and fades to nothing over ~2s (oldest parts vanish
 * first), so the lane is clean by the time the ant re-enters. The walk + gap
 * are tuned so a full loop is ~8 seconds.
 *
 * Implementation: a single requestAnimationFrame clock drives `t`. The ant's
 * x-position is derived from `t`; the trail is a fixed pool of segment dots
 * whose age (now - bornAt) controls opacity/scale, giving a smooth fade.
 *
 * Bottom: three horizontal detail cards (REINFORCED · EVAPORATING · NO CURATOR)
 * using FeatureSection's card style.
 */

const EMERALD = "#34d399";
const LIGHT = "#6ee7b7";
const PALE = "#a7f3d0";

// Loop timeline (seconds): the ant walks across, then a clean gap, then repeats.
const WALK = 5.2; // time crossing the lane
const GAP = 2.8; // empty lane while the last trail fades out
const LOOP = WALK + GAP; // ~8s

// Trail fade lifetime (seconds). Older dots disappear first.
const TRAIL_LIFE = 2.0;
// How often (in loop-progress fraction) we drop a new pheromone dot.
const DROP_EVERY = 0.014;

const SPORES = [
  { top: "16%", left: "11%", d: 10, delay: 0 },
  { top: "74%", left: "18%", d: 13, delay: 1.4 },
  { top: "28%", left: "87%", d: 11, delay: 0.8 },
  { top: "80%", left: "80%", d: 14, delay: 2.1 },
  { top: "48%", left: "52%", d: 12, delay: 1.1 },
];

const DETAILS: { heading: string; text: string }[] = [
  {
    heading: "REINFORCED",
    text: "Every successful reuse deposits pheromone. The more a skill is used, the stronger and more discoverable its trail.",
  },
  {
    heading: "EVAPORATING",
    text: "Trails decay over time, so knowledge that stops working quietly fades instead of piling up.",
  },
  {
    heading: "NO CURATOR",
    text: "No one ranks or prunes the commons by hand. Reality does it, continuously.",
  },
];

type Dot = { x: number; y: number; born: number; r: number };

// Vertical wobble so the trail reads as an organic walked path, not a ruler line.
function laneY(p: number) {
  return Math.sin(p * Math.PI * 4) * 6 + Math.sin(p * Math.PI * 9 + 1.2) * 2.5;
}

/** A single, fairly large, walking ant drawn in SVG. `phase` drives leg/body bob. */
function Ant({ phase }: { phase: number }) {
  // bob: subtle vertical body bounce; legSwing: alternating leg phase.
  const bob = Math.sin(phase * Math.PI * 2) * 1.4;
  const swingA = Math.sin(phase * Math.PI * 2);
  const swingB = Math.sin(phase * Math.PI * 2 + Math.PI);
  const stroke = LIGHT;

  const leg = (
    hipX: number,
    hipY: number,
    dir: number,
    swing: number,
    len: number,
  ) => {
    const kneeX = hipX + dir * (len * 0.55);
    const kneeY = hipY + 6 + swing * 1.6;
    const footX = hipX + dir * len + swing * 3.2;
    const footY = hipY + 13;
    return `M ${hipX} ${hipY} Q ${kneeX} ${kneeY} ${footX} ${footY}`;
  };

  return (
    <svg
      viewBox="-44 -34 88 68"
      width={88}
      height={68}
      style={{
        overflow: "visible",
        transform: `translateY(${bob}px)`,
        filter: "drop-shadow(0 0 6px rgba(52,211,153,0.55))",
      }}
    >
      {/* legs — 3 per side, alternating tripod gait */}
      <g
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        opacity={0.92}
      >
        {/* right side (top in this top-down-ish profile) */}
        <path d={leg(-2, -3, 1, swingA, 18)} />
        <path d={leg(2, -3, 1, swingB, 20)} />
        <path d={leg(6, -3, 1, swingA, 18)} />
        {/* left side (bottom) */}
        <g transform="scale(1,-1)">
          <path d={leg(-2, -3, 1, swingB, 18)} />
          <path d={leg(2, -3, 1, swingA, 20)} />
          <path d={leg(6, -3, 1, swingB, 18)} />
        </g>
      </g>

      {/* antennae */}
      <g stroke={PALE} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.95}>
        <path d={`M 16 -2 Q 28 ${-12 + swingA} 34 ${-16 + swingA}`} />
        <path d={`M 16 2 Q 28 ${12 + swingB} 34 ${16 + swingB}`} />
      </g>

      {/* body: abdomen + thorax + head ovals, head facing right (+x) */}
      <g>
        {/* abdomen */}
        <ellipse cx={-18} cy={0} rx={15} ry={10} fill="#0e1512" stroke={EMERALD} strokeWidth={2} />
        <ellipse cx={-18} cy={0} rx={15} ry={10} fill={EMERALD} opacity={0.18} />
        {/* thorax */}
        <ellipse cx={-1} cy={0} rx={8.5} ry={6.5} fill="#0e1512" stroke={EMERALD} strokeWidth={2} />
        <ellipse cx={-1} cy={0} rx={8.5} ry={6.5} fill={EMERALD} opacity={0.22} />
        {/* head */}
        <ellipse cx={14} cy={0} rx={8} ry={7} fill="#0e1512" stroke={LIGHT} strokeWidth={2} />
        <ellipse cx={14} cy={0} rx={8} ry={7} fill={EMERALD} opacity={0.3} />
        {/* glowing eye */}
        <circle cx={18} cy={-2.5} r={1.8} fill={PALE} />
      </g>
    </svg>
  );
}

export default function TrailsSection({
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

  // Animation clock (seconds within LOOP) and the live trail dot pool.
  const [tick, setTick] = useState(0); // forces re-render each frame
  const dots = useRef<Dot[]>([]);
  const tRef = useRef(0);
  const lastDropP = useRef(-1);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  // Static fallback for reduced motion: ant mid-lane with a short trail behind.
  useEffect(() => {
    if (!reduce) return;
    const midP = 0.5;
    const seed: Dot[] = [];
    for (let i = 0; i < 14; i++) {
      const p = midP - i * 0.012;
      if (p < 0) break;
      seed.push({
        x: p * 100,
        y: laneY(p),
        born: -i * (TRAIL_LIFE / 18), // graded age → graded fade
        r: 3.4,
      });
    }
    dots.current = seed;
    tRef.current = midP * WALK;
    setTick((n) => n + 1);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    if (!inView) {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      start.current = null;
      return;
    }

    const frame = (now: number) => {
      if (start.current === null) start.current = now;
      const elapsed = (now - start.current) / 1000;
      const t = elapsed % LOOP;
      // Detect loop wrap → clear any straggler dots from the previous pass.
      if (t < tRef.current) {
        lastDropP.current = -1;
      }
      tRef.current = t;

      const walking = t < WALK;
      const p = walking ? t / WALK : -1; // walk progress 0..1, else -1 (gap)

      // Drop new pheromone dots along the ant's path while it walks.
      if (walking) {
        if (lastDropP.current < 0) lastDropP.current = p - DROP_EVERY;
        while (p - lastDropP.current >= DROP_EVERY) {
          lastDropP.current += DROP_EVERY;
          const dp = lastDropP.current;
          dots.current.push({
            x: dp * 100,
            y: laneY(dp),
            born: elapsed,
            r: 3.2 + Math.random() * 1.2,
          });
        }
      }

      // Expire fully-faded dots.
      const cutoff = elapsed - TRAIL_LIFE;
      if (dots.current.length) {
        dots.current = dots.current.filter((d) => d.born > cutoff);
      }

      setTick((n) => (n + 1) % 1_000_000);
      raf.current = requestAnimationFrame(frame);
    };

    raf.current = requestAnimationFrame(frame);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [inView, reduce]);

  // Derive current ant state for render.
  const t = tRef.current;
  const walking = reduce ? true : t < WALK;
  const antP = reduce ? 0.5 : walking ? t / WALK : 1;
  const antVisible = reduce ? true : walking;
  const walkPhase = reduce ? 0 : (t / WALK) * 14; // leg-cycle frequency

  // Compute fade for each dot relative to a shared "now".
  const referenceNow = reduce
    ? 0
    : // elapsed isn't stored; reconstruct from the freshest dot if present
      dots.current.reduce((m, d) => Math.max(m, d.born), 0);

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
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 80%)",
        }}
      />
      {/* center glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-20 h-[36rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.08),transparent_62%)] blur-[120px]"
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

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-9 px-8 md:gap-12 md:px-14">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col gap-4"
        >
          {/* soft dark scrim so the heading + copy stay readable over the canopy */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-7 -inset-y-6 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(5,8,7,0.92),rgba(5,8,7,0.45)_62%,transparent_84%)] blur-md"
          />
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-medium leading-none text-emerald-300">{num}</span>
            <span className="h-px w-12 flex-none bg-gradient-to-r from-emerald-400/50 to-transparent" />
            <span className="font-mono text-[11px] tracking-wider text-white/25">/ {tot}</span>
          </div>
          <h3 className="text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-[2.6rem]">
            Trails that strengthen with use.
          </h3>
          <p className="max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">
            Every reuse lays a pheromone trail. Popular paths grow brighter, stale ones fade. The
            commons organizes itself, with no curator.
          </p>
        </motion.div>

        {/* centerpiece — the walking ant + fading pheromone trail */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full"
        >
          <div
            className="relative h-[150px] w-full overflow-hidden rounded-2xl border border-emerald-400/10 bg-transparent md:h-[180px]"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 0 50px rgba(16,185,129,0.06)",
              maskImage:
                "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
            }}
          >
            {/* faint baseline groove the ant walks along */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent"
            />

            {/* pheromone trail (SVG, percentage coordinate space) */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="trailGlow" x="-30%" y="-200%" width="160%" height="500%">
                  <feGaussianBlur stdDeviation="0.7" />
                </filter>
              </defs>
              <g filter="url(#trailGlow)">
                {dots.current.map((d, i) => {
                  const age = reduce ? -d.born : referenceNow - d.born;
                  const life = 1 - age / TRAIL_LIFE; // 1 fresh → 0 gone
                  if (life <= 0) return null;
                  const op = Math.pow(life, 1.4) * 0.85;
                  const r = (d.r / 10) * (0.45 + life * 0.55);
                  return (
                    <circle
                      key={i}
                      cx={d.x}
                      cy={20 + d.y}
                      r={r}
                      fill={life > 0.7 ? PALE : LIGHT}
                      opacity={op}
                    />
                  );
                })}
              </g>
            </svg>

            {/* the ant */}
            {antVisible && (
              <div
                className="absolute top-1/2"
                style={{
                  left: `${antP * 100}%`,
                  transform: "translate(-50%, -50%)",
                  willChange: "left",
                }}
              >
                <Ant phase={walkPhase} />
              </div>
            )}
          </div>

          {/* tiny legend so the metaphor is legible */}
          <div className="mt-3 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.9)" }} />
            pheromone trail
            <span className="mx-1 text-white/15">·</span>
            brightest behind · fades in {TRAIL_LIFE}s
          </div>
        </motion.div>

        {/* three horizontal detail cards */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {DETAILS.map((d) => (
            <div
              key={d.heading}
              className="group rounded-xl border border-emerald-400/10 bg-[#070b09]/85 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md px-4 py-3.5 text-left transition-colors duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/[0.08]"
            >
              <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-emerald-300/90">
                {d.heading}
              </div>
              <div className="mt-1.5 text-sm leading-relaxed text-white/45 transition-colors group-hover:text-white/65">
                {d.text}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
