"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * "Trails that strengthen with use" - digital stigmergy, told literally.
 * Recognizable ants walk the veins of a single leaf. Each pass lays a glowing
 * pheromone deposit that brightens and thickens that vein; veins that stop being
 * walked dim and evaporate back toward the leaf. Self-reinforcing, no curator.
 * Loops forever.
 */

type Vein = {
  id: number;
  /** path geometry across a 0..100 viewBox */
  d: string;
  /** seconds for one ant to walk this vein */
  dur: number;
  /** stagger phases (0..1), one ant per entry */
  phases: number[];
};

// A leaf tilted from lower-left (stem) to upper-right (tip). The midrib runs the
// length; lateral veins branch off it. Ants travel midrib + laterals so the
// whole leaf reads as a trail network. Kept well inside 0..100 with padding.
const MIDRIB =
  "M 24 80 C 30 66, 40 52, 52 42 S 70 28, 78 20";

const VEINS: Vein[] = [
  // the midrib itself, the busiest highway
  { id: 0, d: MIDRIB, dur: 6.4, phases: [0, 0.34, 0.67] },
  // upper-right laterals (toward the leaf's upper edge)
  { id: 1, d: "M 40 52 C 46 44, 54 40, 62 30", dur: 4.6, phases: [0.15, 0.6] },
  { id: 2, d: "M 52 42 C 58 36, 66 34, 72 26", dur: 4.2, phases: [0.4] },
  // lower-left laterals (toward the leaf's lower edge)
  { id: 3, d: "M 36 60 C 30 56, 24 56, 18 50", dur: 4.8, phases: [0.25, 0.75] },
  { id: 4, d: "M 48 46 C 42 44, 36 46, 30 40", dur: 4.4, phases: [0.55] },
  { id: 5, d: "M 30 70 C 26 66, 22 66, 16 62", dur: 5.0, phases: [0.1] },
];

// Leaf blade outline (closed): an organic almond. Soft dark fill, faint edge.
const LEAF_BLADE =
  "M 24 80 C 14 60, 18 36, 44 22 C 60 14, 78 14, 82 18 C 86 30, 82 50, 64 66 C 48 80, 34 84, 24 80 Z";

export default function StigmergyViz() {
  // Per-vein reinforcement strength (0..1). Driven by deposit + decay.
  const [strength, setStrength] = useState<number[]>(() => VEINS.map(() => 0.2));

  const targetRef = useRef<number[]>(VEINS.map(() => 0.22));
  const valRef = useRef<number[]>(VEINS.map(() => 0.2));
  const rafRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (reduce) {
      // settle on a pleasant static lighting so the leaf still reads
      setStrength(VEINS.map((v) => 0.3 + v.phases.length * 0.14));
      return;
    }

    let last = performance.now();
    const timers = timersRef.current;

    // Each vein fires a pheromone deposit on a cadence tied to how many ants ride
    // it (more ants -> more frequent deposits -> brighter, thicker, sticky).
    // Occasionally a vein goes quiet so the audience watches it evaporate before
    // renewed traffic revives it.
    const scheduleDeposit = (i: number, suppress = false) => {
      const v = VEINS[i];
      const ants = Math.max(1, v.phases.length);
      const base = (v.dur / ants) * 1000;
      const wait = suppress
        ? 2600 + Math.random() * 1800
        : base * (0.7 + Math.random() * 0.6);
      timers[i] = setTimeout(() => {
        if (!suppress) {
          targetRef.current[i] = Math.min(
            1,
            targetRef.current[i] + 0.18 + ants * 0.04,
          );
        }
        scheduleDeposit(i, Math.random() < 0.12);
      }, wait);
    };
    VEINS.forEach((_, i) => scheduleDeposit(i));

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cur = valRef.current;
      const tgt = targetRef.current;
      for (let i = 0; i < cur.length; i++) {
        // constant evaporation drains every vein toward a faint floor...
        tgt[i] = Math.max(0.1, tgt[i] - dt * 0.12);
        // ...display eases toward target for a smooth living glow.
        cur[i] += (tgt[i] - cur[i]) * Math.min(1, dt * 6);
      }
      setStrength(cur.slice());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      timers.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [reduce]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* soft atmospheric glow seated under the leaf, no box, fades to nothing */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 52%, rgba(16,75,55,0.42) 0%, rgba(10,10,10,0) 70%)",
        }}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="leaf-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="leaf-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>

          {/* leaf blade: dark translucent body, brighter near the midrib */}
          <radialGradient id="leaf-body" cx="42%" cy="62%" r="72%">
            <stop offset="0%" stopColor="#0f3a2c" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#0c241c" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#0a0f0d" stopOpacity="0" />
          </radialGradient>

          {/* reusable vein geometry referenced by ant motion (mpath) */}
          {VEINS.map((v) => (
            <path key={`vp-${v.id}`} id={`vein-path-${v.id}`} d={v.d} />
          ))}
        </defs>

        {/* ---- LEAF BLADE ---- */}
        <g filter="url(#leaf-soft)">
          {/* soft body */}
          <path d={LEAF_BLADE} fill="url(#leaf-body)" />
          {/* faint emerald edge that fades at the leaf's own extremities */}
          <path
            d={LEAF_BLADE}
            fill="none"
            stroke="#34d399"
            strokeWidth={0.7}
            strokeLinejoin="round"
            opacity={0.34}
          />
        </g>

        {/* ---- VEIN GHOSTS (always faintly present, even when unused) ---- */}
        <use
          href="#vein-path-0"
          fill="none"
          stroke="#1f4538"
          strokeWidth={0.9}
          strokeLinecap="round"
          opacity={0.55}
        />
        {VEINS.slice(1).map((v) => (
          <use
            key={`ghost-${v.id}`}
            href={`#vein-path-${v.id}`}
            fill="none"
            stroke="#1f4538"
            strokeWidth={0.55}
            strokeLinecap="round"
            opacity={0.45}
          />
        ))}

        {/* ---- REINFORCED VEINS: width + glow scale with strength ---- */}
        {VEINS.map((v, i) => {
          const s = strength[i] ?? 0.2;
          return (
            <use
              key={`lit-${v.id}`}
              href={`#vein-path-${v.id}`}
              fill="none"
              stroke="#34d399"
              strokeWidth={(v.id === 0 ? 0.6 : 0.4) + s * (v.id === 0 ? 3.2 : 2.4)}
              strokeLinecap="round"
              opacity={0.12 + s * 0.78}
              filter="url(#leaf-soft)"
              style={{
                transition: "stroke-width 140ms linear, opacity 140ms linear",
              }}
            />
          );
        })}

        {/* bright pheromone core only where a vein is well-reinforced */}
        {VEINS.map((v, i) => {
          const s = strength[i] ?? 0.2;
          if (s < 0.45) return null;
          return (
            <use
              key={`core-${v.id}`}
              href={`#vein-path-${v.id}`}
              fill="none"
              stroke="#6ee7b7"
              strokeWidth={0.25 + (s - 0.45) * 1.5}
              strokeLinecap="round"
              opacity={(s - 0.45) * 1.4}
            />
          );
        })}

        {/* ---- ANTS: recognizable head + thorax + abdomen, 6 legs, 2 antennae ---- */}
        {VEINS.map((v) =>
          v.phases.map((phase, k) => {
            const begin = `${-phase * v.dur}s`;
            const big = v.id === 0 && k === 0;
            const scale = big ? 1.25 : 1;
            return (
              <g key={`ant-${v.id}-${k}`}>
                <animateMotion
                  dur={`${v.dur}s`}
                  begin={begin}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href={`#vein-path-${v.id}`} />
                </animateMotion>
                <Ant scale={scale} />
              </g>
            );
          }),
        )}
      </svg>

      <style>{`
        @keyframes ant-leg {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.62); }
        }
      `}</style>
    </div>
  );
}

/**
 * A single ant, drawn around its own origin (0,0) and oriented so it walks along
 * +X (the direction animateMotion's rotate="auto" points it). Built from a head,
 * thorax, and abdomen with constriction between segments, six animated legs, and
 * two antennae. Units are viewBox units (~3.5 long), so it reads clearly small.
 */
function Ant({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      {/* faint pheromone aura the ant carries */}
      <circle cx={0} cy={0} r={1.9} fill="#34d399" opacity={0.16} filter="url(#leaf-glow)" />

      {/* legs: three per side, animated for a subtle gait, drawn behind body */}
      <g stroke="#ecfdf5" strokeWidth={0.16} strokeLinecap="round" opacity={0.92}>
        {/* front pair */}
        <line x1={0.5} y1={0} x2={1.5} y2={-1.0} style={{ animation: "ant-leg 0.5s ease-in-out infinite", transformOrigin: "0.5px 0px" }} />
        <line x1={0.5} y1={0} x2={1.5} y2={1.0} style={{ animation: "ant-leg 0.5s ease-in-out 0.25s infinite", transformOrigin: "0.5px 0px" }} />
        {/* middle pair */}
        <line x1={0.1} y1={0} x2={0.0} y2={-1.15} style={{ animation: "ant-leg 0.5s ease-in-out 0.25s infinite", transformOrigin: "0.1px 0px" }} />
        <line x1={0.1} y1={0} x2={0.0} y2={1.15} style={{ animation: "ant-leg 0.5s ease-in-out infinite", transformOrigin: "0.1px 0px" }} />
        {/* rear pair */}
        <line x1={-0.4} y1={0} x2={-1.5} y2={-1.0} style={{ animation: "ant-leg 0.5s ease-in-out infinite", transformOrigin: "-0.4px 0px" }} />
        <line x1={-0.4} y1={0} x2={-1.5} y2={1.0} style={{ animation: "ant-leg 0.5s ease-in-out 0.25s infinite", transformOrigin: "-0.4px 0px" }} />
      </g>

      {/* abdomen (rear, largest) */}
      <ellipse cx={-1.05} cy={0} rx={0.78} ry={0.6} fill="#0f5132" stroke="#34d399" strokeWidth={0.12} />
      {/* thorax (middle) */}
      <ellipse cx={0.05} cy={0} rx={0.5} ry={0.42} fill="#0f5132" stroke="#34d399" strokeWidth={0.12} />
      {/* head (front) */}
      <circle cx={0.95} cy={0} r={0.46} fill="#127a4a" stroke="#6ee7b7" strokeWidth={0.12} />

      {/* antennae */}
      <g stroke="#6ee7b7" strokeWidth={0.13} strokeLinecap="round" fill="none">
        <path d="M 1.25 -0.2 C 1.8 -0.7, 2.1 -0.6, 2.3 -1.0" />
        <path d="M 1.25 0.2 C 1.8 0.7, 2.1 0.6, 2.3 1.0" />
      </g>
    </g>
  );
}
