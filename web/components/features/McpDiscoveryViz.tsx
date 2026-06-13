"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * "The agent chooses" -- radar/sonar discovery.
 * A central agent node emits an expanding emerald sweep across a dark commons.
 * Matching skill labels light up as the ring passes; one is selected and locked
 * with a check, the rest dim back. Loops forever.
 *
 * Geometry note: viewBox is 460x460, center at 230,230. The sweep ring grows to
 * a MAX radius that, including its stroke width, stays well inside the square so
 * nothing is ever clipped. Skill labels live on a fixed orbit at evenly spaced
 * angles so their boxes never overlap.
 */

type Skill = {
  id: number;
  name: string;
  trust: number;
  /** angle on the orbit, in degrees (0 = right, clockwise) */
  angle: number;
  /** is this a match the sweep surfaces */
  match: boolean;
  /** the chosen one that locks in */
  chosen: boolean;
};

const C = 230; // center (viewBox units)

// Orbit radius for skill labels, in viewBox units. Kept modest so the HTML
// label boxes (which extend beyond their anchor point) never reach the edge.
const ORBIT = 150;

// Max radius the sweep ring reaches at full expansion. With the 18px stroke,
// the outer edge sits at ~196 + 9 = 205 < 230, leaving comfortable padding.
const MAX_RING = 196;
const RING_STROKE = 18;
const START_RING = 14;

const SKILLS: Skill[] = [
  { id: 0, name: "pdf.extract", trust: 0.98, angle: -90, match: true, chosen: false },
  { id: 1, name: "web.scrape", trust: 0.71, angle: -38, match: false, chosen: false },
  { id: 2, name: "sql.query", trust: 0.94, angle: 14, match: true, chosen: true },
  { id: 3, name: "doc.summarize", trust: 0.91, angle: 66, match: true, chosen: false },
  { id: 4, name: "img.caption", trust: 0.62, angle: 118, match: false, chosen: false },
  { id: 5, name: "csv.parse", trust: 0.89, angle: 170, match: true, chosen: false },
  { id: 6, name: "mail.send", trust: 0.55, angle: 222, match: false, chosen: false },
];

// timeline phases (seconds) within one loop
const T = {
  sweep: 2.2, // ring expands, matches light as it passes
  fan: 1.5, // matches pulse/lock focus
  choose: 1.3, // one is selected and locked
  hold: 1.2, // brief hold
};
const LOOP = T.sweep + T.fan + T.choose + T.hold;

function orbitPos(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: C + Math.cos(rad) * radius, y: C + Math.sin(rad) * radius };
}

export default function McpDiscoveryViz() {
  const [t, setT] = useState(0); // seconds within loop
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const elapsed = ((now - start.current) / 1000) % LOOP;
      setT(elapsed);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  // phase progress helpers
  const sweepP = clamp01(t / T.sweep); // 0..1 over sweep
  const fanP = clamp01((t - T.sweep) / T.fan);
  const chooseP = clamp01((t - T.sweep - T.fan) / T.choose);

  // sweep ring radius grows from agent outward, capped inside the square
  const ringR = START_RING + sweepP * (MAX_RING - START_RING);

  // sonar arm angle (a secondary rotating beam for texture)
  const beamAngle = (t / LOOP) * 360 * 2;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* dark pool that fades into the page so the radar reads as a glow, not a box */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,9,8,0.94)_30%,rgba(6,9,8,0.62)_55%,transparent_80%)]" />
      {/* atmospheric center glow (radial, fades to transparent -- no rectangle) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06),transparent_60%)]" />
      {/* faint grid, masked to a soft circle so it never reads as a box */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,0.04) 1px,transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(circle at 50% 50%,black 30%,transparent 66%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%,black 30%,transparent 66%)",
        }}
      />

      <svg viewBox="0 0 460 460" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="agentGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#34d399" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="96%" stopColor="#6ee7b7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        {/* radar range rings (static, faint) */}
        {[60, 110, 160].map((r) => (
          <circle
            key={r}
            cx={C}
            cy={C}
            r={r}
            fill="none"
            stroke="#34d399"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* rotating sonar beam (subtle texture), reaches the orbit but not the edge */}
        <g transform={`rotate(${beamAngle} ${C} ${C})`} opacity={0.5}>
          <path
            d={`M ${C} ${C} L ${C + ORBIT} ${C - 24} A ${ORBIT} ${ORBIT} 0 0 1 ${C + ORBIT} ${C + 24} Z`}
            fill="url(#beamGrad)"
          />
        </g>

        {/* expanding sweep ring during sweep phase */}
        {t < T.sweep + 0.25 && (
          <>
            <circle
              cx={C}
              cy={C}
              r={ringR}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth={RING_STROKE}
              opacity={1 - sweepP * 0.85}
            />
            <circle
              cx={C}
              cy={C}
              r={ringR}
              fill="none"
              stroke="#a7f3d0"
              strokeWidth={1.4}
              strokeOpacity={(1 - sweepP) * 0.9}
            />
          </>
        )}

        {/* connection lines from agent to surfaced matches */}
        {SKILLS.filter((s) => s.match).map((s) => {
          const p = orbitPos(s.angle, ORBIT);
          const lit = sweepLit(s, ringR);
          if (!lit && fanP === 0) return null;
          const lineOp = s.chosen
            ? 0.5 + chooseP * 0.4
            : (fanP > 0.05 ? 0.28 : 0.14) * (1 - chooseP * 0.6);
          return (
            <line
              key={`l-${s.id}`}
              x1={C}
              y1={C}
              x2={p.x}
              y2={p.y}
              stroke={s.chosen ? "#6ee7b7" : "#34d399"}
              strokeOpacity={lineOp}
              strokeWidth={s.chosen ? 1.6 : 1}
              strokeDasharray={s.chosen ? "0" : "3 4"}
            />
          );
        })}

        {/* agent core */}
        <circle cx={C} cy={C} r={44} fill="url(#agentGlow)" />
        <motion.circle
          cx={C}
          cy={C}
          r={15}
          fill="#0a0a0a"
          stroke="#6ee7b7"
          strokeWidth={1.6}
          initial={{ r: 15 }}
          animate={{ r: [15, 16.5, 15] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <circle cx={C} cy={C} r={5.5} fill="#a7f3d0" filter="url(#soft)" />
        <circle cx={C} cy={C} r={3.4} fill="#ecfdf5" />
      </svg>

      {/* skill labels as HTML for crisp text */}
      {SKILLS.map((s) => {
        const p = orbitPos(s.angle, ORBIT);
        const lit = s.match && sweepLit(s, ringR);
        const surfaced = s.match && fanP > 0;
        const active = lit || surfaced;
        // non-matches dim as the dealt hand takes focus
        const baseOpacity = s.match ? 1 : 0.34 - fanP * 0.14;
        const scale =
          (s.chosen ? 1 + chooseP * 0.16 : surfaced ? 1.04 : 1) * (active ? 1 : 0.94);

        return (
          <Card
            key={s.id}
            s={s}
            x={p.x}
            y={p.y}
            scale={scale}
            active={active}
            chosen={s.chosen}
            chooseP={chooseP}
            baseOpacity={baseOpacity}
          />
        );
      })}

    </div>
  );
}

function Card(props: {
  s: Skill;
  x: number;
  y: number;
  scale: number;
  active: boolean;
  chosen: boolean;
  chooseP: number;
  baseOpacity: number;
}) {
  const { s, x, y, scale, active, chosen, chooseP, baseOpacity } = props;
  const pct = (x / 460) * 100;
  const pcy = (y / 460) * 100;
  const showCheck = chosen && chooseP > 0.55;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${pct}%`,
        top: `${pcy}%`,
        transform: `translate(-50%,-50%) scale(${scale})`,
        opacity: Math.max(0, baseOpacity),
        transition: "transform 90ms linear, opacity 160ms linear",
        zIndex: chosen ? 30 : active ? 20 : 10,
      }}
    >
      <div
        className="relative flex items-center gap-1.5 rounded-md px-2 py-1 backdrop-blur-[2px]"
        style={{
          background: active
            ? "linear-gradient(180deg,rgba(16,185,129,0.16),rgba(10,10,10,0.85))"
            : "rgba(10,10,10,0.7)",
          border: `1px solid ${
            chosen
              ? "rgba(167,243,208,0.9)"
              : active
                ? "rgba(52,211,153,0.55)"
                : "rgba(52,211,153,0.16)"
          }`,
          boxShadow: chosen
            ? "0 0 22px rgba(52,211,153,0.55),0 0 0 1px rgba(167,243,208,0.4)"
            : active
              ? "0 0 14px rgba(52,211,153,0.28)"
              : "none",
        }}
      >
        {/* trust dot */}
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            background: active ? "#6ee7b7" : "#34d399",
            opacity: active ? 1 : 0.4,
            boxShadow: active ? "0 0 6px #6ee7b7" : "none",
          }}
        />
        <span
          className="font-mono text-[10px] leading-none tracking-tight"
          style={{ color: active ? "#d1fae5" : "rgba(167,243,208,0.55)" }}
        >
          {s.name}
        </span>
        <span
          className="font-mono text-[9px] leading-none tabular-nums"
          style={{ color: active ? "#6ee7b7" : "rgba(110,231,183,0.4)" }}
        >
          {s.trust.toFixed(2)}
        </span>

        {showCheck && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-300 text-[#06281c]"
          >
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3.5}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        )}
      </div>
    </div>
  );
}

/** Has the sweep ring reached this skill's orbit radius? */
function sweepLit(_s: Skill, ringR: number) {
  return ringR >= ORBIT - 6;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
