"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * "Skills are data, never commands."
 * A poisoned packet slams the commons membrane, is blocked, loses all trust,
 * and is quarantined. Healthy emerald packets pass through normally. Loops forever.
 */

const EMERALD = "#34d399";
const EMERALD_SOFT = "#6ee7b7";
const RED = "#f87171";

// Single shared clock so the whole sequence stays in lockstep and self-heals.
const CYCLE = 7.2; // seconds per full loop

type Phase = "idle" | "approach" | "impact" | "reject" | "quarantine";

function phaseFor(t: number): { phase: Phase; local: number } {
  // t in [0, 1)
  if (t < 0.22) return { phase: "approach", local: t / 0.22 };
  if (t < 0.32) return { phase: "impact", local: (t - 0.22) / 0.1 };
  if (t < 0.5) return { phase: "reject", local: (t - 0.32) / 0.18 };
  if (t < 0.86) return { phase: "quarantine", local: (t - 0.5) / 0.36 };
  return { phase: "idle", local: (t - 0.86) / 0.14 };
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
const easeIn = (x: number) => x * x;

export default function AntiPoisonViz() {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const loop = (now: number) => {
      if (start.current === null) start.current = now;
      const elapsed = ((now - start.current) / 1000) % CYCLE;
      setT(elapsed / CYCLE);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const { phase, local } = phaseFor(t);

  // ---- Geometry (viewBox 0..200, centered, generous padding) ----
  const cx = 100;
  const cy = 98;
  const shieldR = 40; // membrane radius -> spans 58..138, well inside frame
  const impactAngle = -148 * (Math.PI / 180); // poison hits upper-left of membrane

  // Membrane contact point
  const hitX = cx + Math.cos(impactAngle) * shieldR;
  const hitY = cy + Math.sin(impactAngle) * shieldR;

  // Poison packet launch + quarantine destinations, all kept inside the square.
  const launchX = 26;
  const launchY = 36;
  const quarantineX = 158;
  const quarantineY = 150;

  // Poison packet path: charges from inside-frame toward hit point, then recoils.
  let poisonX = launchX;
  let poisonY = launchY;
  let poisonScale = 1;
  let poisonOpacity = 1;
  let poisonRot = 0;
  let trust = 1; // 1 -> 0 over the cycle

  if (phase === "approach") {
    const e = easeIn(local);
    poisonX = launchX + (hitX - 12 - launchX) * e;
    poisonY = launchY + (hitY - 4 - launchY) * e;
    poisonScale = 1 + 0.18 * local;
    poisonRot = local * 40;
    trust = 1;
  } else if (phase === "impact") {
    poisonX = hitX - 12 + 4 * local;
    poisonY = hitY - 4 + 4 * local;
    poisonScale = 1.18 - 0.1 * local;
    poisonRot = 40 + local * 60;
    trust = 1 - local * 0.35;
  } else if (phase === "reject") {
    const e = easeOut(local);
    const fromX = hitX - 8;
    const fromY = hitY;
    poisonX = fromX + (quarantineX - fromX) * e;
    poisonY = fromY + (quarantineY - fromY) * e;
    poisonScale = 1.08 - 0.28 * e;
    poisonRot = 100 + local * 220;
    trust = 0.65 - 0.65 * e;
  } else if (phase === "quarantine") {
    poisonX = quarantineX;
    poisonY = quarantineY;
    poisonScale = 0.8;
    poisonRot = 320;
    poisonOpacity = 0.55;
    trust = 0;
  } else {
    // idle: poison hidden, resetting
    poisonOpacity = 0;
    poisonX = launchX;
    poisonY = launchY;
    trust = 0;
  }

  // Ripple at the membrane where impact happened.
  const rippleActive = phase === "impact" || phase === "reject";
  const rippleLocal =
    phase === "impact" ? local * 0.45 : phase === "reject" ? 0.45 + local * 0.55 : 0;
  const rippleR = 4 + rippleLocal * 30;
  const rippleOpacity = rippleActive ? (1 - rippleLocal) * 0.9 : 0;

  // Membrane flash strength on impact.
  const flash =
    phase === "impact"
      ? Math.sin(local * Math.PI)
      : phase === "reject"
        ? Math.max(0, 1 - local * 2.4) * 0.5
        : 0;

  // Label visibility
  const labelShown = phase === "impact" || phase === "reject";
  const labelOpacity = phase === "impact" ? easeOut(local) : Math.max(0, 1 - local * 1.3);

  // Healthy packets: continuous, phase-offset, glide through membrane.
  const healthy = [0, 0.5];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* atmospheric backdrop glow only, no box or tint */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 49%, rgba(52,211,153,0.10), transparent 56%)",
        }}
      />
      {/* faint grid that fades fully toward the edges (no hard rectangle) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.05) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(circle at 50% 49%, black 22%, transparent 64%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 49%, black 22%, transparent 64%)",
        }}
      />

      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="ap-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EMERALD_SOFT} stopOpacity="0.9" />
            <stop offset="55%" stopColor={EMERALD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={EMERALD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ap-shield" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor={EMERALD} stopOpacity="0" />
            <stop offset="86%" stopColor={EMERALD} stopOpacity="0.18" />
            <stop offset="100%" stopColor={EMERALD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ap-poison" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fecaca" stopOpacity="0.95" />
            <stop offset="55%" stopColor={RED} stopOpacity="0.9" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </radialGradient>
          <filter id="ap-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ap-blur-soft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* ---- Commons network inside the membrane ---- */}
        <g filter="url(#ap-glow)">
          <CommonsNetwork cx={cx} cy={cy} t={t} />
        </g>

        {/* soft membrane fill halo */}
        <circle cx={cx} cy={cy} r={shieldR + 4} fill="url(#ap-shield)" />

        {/* ---- Membrane / shield ring ---- */}
        <ShieldRing cx={cx} cy={cy} r={shieldR} t={t} flash={flash} />

        {/* impact ripple on the membrane */}
        {rippleOpacity > 0.01 && (
          <>
            <circle
              cx={hitX}
              cy={hitY}
              r={rippleR}
              fill="none"
              stroke={RED}
              strokeWidth={2.2 * (1 - rippleLocal) + 0.4}
              opacity={rippleOpacity}
            />
            <circle
              cx={hitX}
              cy={hitY}
              r={rippleR * 0.55}
              fill="none"
              stroke={EMERALD_SOFT}
              strokeWidth={1.4}
              opacity={rippleOpacity * 0.8}
            />
          </>
        )}

        {/* ---- Healthy emerald packets passing through ---- */}
        {healthy.map((offset, i) => (
          <HealthyPacket key={i} t={t} offset={offset} cx={cx} cy={cy} r={shieldR} />
        ))}

        {/* ---- Poison packet ---- */}
        {poisonOpacity > 0.01 && (
          <PoisonPacket
            x={poisonX}
            y={poisonY}
            scale={poisonScale}
            opacity={poisonOpacity}
            rot={poisonRot}
            t={t}
            quarantined={phase === "quarantine"}
          />
        )}

        {/* ---- Quarantine cell (dim corner) ---- */}
        <QuarantineCell
          x={quarantineX}
          y={quarantineY}
          active={phase === "quarantine"}
          local={phase === "quarantine" ? local : 0}
        />
      </svg>

      {/* ---- Floating HUD label on block ---- */}
      {labelShown && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[14%] -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: labelOpacity }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: "#fca5a5" }}
          >
            blocked: untrusted data
          </span>
        </motion.div>
      )}

      {/* ---- Trust meter (bottom-left, floating widget) ---- */}
      <TrustMeter trust={trust} quarantined={phase === "quarantine"} />
    </div>
  );
}

/* ----------------------------------------------------------------- */

function ShieldRing({
  cx,
  cy,
  r,
  t,
  flash,
}: {
  cx: number;
  cy: number;
  r: number;
  t: number;
  flash: number;
}) {
  const segs = 60;
  const rot = t * 360 * 0.25;
  const breath = 1 + Math.sin(t * Math.PI * 2 * 2) * 0.012;
  const rr = r * breath;
  const dots = Array.from({ length: segs }, (_, i) => {
    const a = (i / segs) * Math.PI * 2 + (rot * Math.PI) / 180;
    return {
      x: cx + Math.cos(a) * rr,
      y: cy + Math.sin(a) * rr,
      o: 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(a * 3 + t * 8)),
    };
  });
  const flashColor = flash > 0;
  return (
    <g>
      {/* solid base ring */}
      <circle
        cx={cx}
        cy={cy}
        r={rr}
        fill="none"
        stroke={
          flashColor ? `rgba(248,113,113,${0.5 * flash})` : "rgba(52,211,153,0.28)"
        }
        strokeWidth={1.4 + flash * 2.4}
        style={{ filter: flash > 0.05 ? "url(#ap-glow)" : undefined }}
      />
      {/* inner faint ring */}
      <circle
        cx={cx}
        cy={cy}
        r={rr - 5}
        fill="none"
        stroke="rgba(110,231,183,0.14)"
        strokeWidth={0.8}
        strokeDasharray="2 5"
      />
      {/* orbiting membrane nodes */}
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={1.15}
          fill={EMERALD_SOFT}
          opacity={Math.max(0.18, d.o) * (1 - flash * 0.3)}
        />
      ))}
      {/* flash overlay ring */}
      {flash > 0.02 && (
        <circle
          cx={cx}
          cy={cy}
          r={rr}
          fill="none"
          stroke={RED}
          strokeWidth={3.5 * flash}
          opacity={0.4 * flash}
          filter="url(#ap-blur-soft)"
        />
      )}
    </g>
  );
}

function CommonsNetwork({ cx, cy, t }: { cx: number; cy: number; t: number }) {
  // small internal node cluster representing the commons
  const nodes = [
    [0, 0],
    [-15, -9],
    [13, -11],
    [16, 8],
    [-11, 13],
    [-2, -18],
    [5, 18],
  ];
  const pts = nodes.map(([dx, dy], i) => {
    const wob = Math.sin(t * Math.PI * 2 + i) * 1.2;
    return [cx + dx + wob, cy + dy + Math.cos(t * Math.PI * 2 + i) * 1.2];
  });
  const links: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 5],
    [2, 5],
    [3, 6],
    [4, 6],
  ];
  return (
    <g>
      <circle cx={cx} cy={cy} r={26} fill="url(#ap-core)" opacity={0.7} />
      {links.map(([a, b], i) => {
        const pulse = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.5 + i));
        return (
          <line
            key={i}
            x1={pts[a][0]}
            y1={pts[a][1]}
            x2={pts[b][0]}
            y2={pts[b][1]}
            stroke={EMERALD}
            strokeWidth={0.7}
            opacity={pulse}
          />
        );
      })}
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === 0 ? 3 : 1.8}
          fill={i === 0 ? EMERALD_SOFT : EMERALD}
          opacity={0.85}
        />
      ))}
    </g>
  );
}

function HealthyPacket({
  t,
  offset,
  cx,
  cy,
  r,
}: {
  t: number;
  offset: number;
  cx: number;
  cy: number;
  r: number;
}) {
  // each packet travels along its own line, entering from inside the frame,
  // passing through the membrane, reaching the core, fading.
  const local = (t + offset) % 1;
  const angle = offset === 0 ? 32 * (Math.PI / 180) : 208 * (Math.PI / 180);
  const startDist = 78; // kept inside the square at every angle
  const endDist = 10;
  const dist = startDist + (endDist - startDist) * easeOut(local);
  const x = cx + Math.cos(angle) * dist;
  const y = cy + Math.sin(angle) * dist;

  // brighten as it crosses the membrane
  const crossing = Math.abs(dist - r) < 6;
  const fade =
    local < 0.08
      ? local / 0.08
      : local > 0.82
        ? Math.max(0, (1 - local) / 0.18)
        : 1;

  return (
    <g opacity={fade}>
      {crossing && (
        <circle
          cx={x}
          cy={y}
          r={6}
          fill={EMERALD_SOFT}
          opacity={0.25}
          filter="url(#ap-blur-soft)"
        />
      )}
      <circle cx={x} cy={y} r={2.6} fill={EMERALD_SOFT} filter="url(#ap-glow)" />
      <circle cx={x} cy={y} r={1.3} fill="#effbf5" />
      {/* trailing tail */}
      <circle
        cx={cx + Math.cos(angle) * (dist + 5)}
        cy={cy + Math.sin(angle) * (dist + 5)}
        r={1.4}
        fill={EMERALD}
        opacity={0.4}
      />
    </g>
  );
}

function PoisonPacket({
  x,
  y,
  scale,
  opacity,
  rot,
  t,
  quarantined,
}: {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rot: number;
  t: number;
  quarantined: boolean;
}) {
  // glitch jitter
  const jitter = quarantined ? 0 : Math.sin(t * 120) * 0.8;
  const size = 4.6 * scale;
  return (
    <g transform={`translate(${x + jitter} ${y}) rotate(${rot})`} opacity={opacity}>
      {/* aura */}
      <circle r={size * 2.1} fill="url(#ap-poison)" opacity={quarantined ? 0.25 : 0.55} />
      {/* glitchy core: jagged shard */}
      <polygon
        points={`0,${-size} ${size * 0.7},0 0,${size} ${-size * 0.7},0`}
        fill={RED}
        stroke="#fecaca"
        strokeWidth={0.6}
        filter="url(#ap-glow)"
      />
      {/* glitch slices */}
      {!quarantined && (
        <>
          <rect
            x={-size * 1.2}
            y={Math.sin(t * 90) * size * 0.4}
            width={size * 2.4}
            height={0.8}
            fill="#fca5a5"
            opacity={0.8}
          />
          <rect
            x={-size * 0.9}
            y={Math.cos(t * 70) * size * 0.5}
            width={size * 1.8}
            height={0.6}
            fill="#fecaca"
            opacity={0.6}
          />
        </>
      )}
    </g>
  );
}

function QuarantineCell({
  x,
  y,
  active,
  local,
}: {
  x: number;
  y: number;
  active: boolean;
  local: number;
}) {
  const appear = active ? Math.min(1, local * 3) : 0;
  if (appear < 0.01) return null;
  const w = 32;
  const h = 28;
  const corners: [number, number, number, number][] = [
    [-w / 2, -h / 2, 1, 1],
    [w / 2, -h / 2, -1, 1],
    [-w / 2, h / 2, 1, -1],
    [w / 2, h / 2, -1, -1],
  ];
  return (
    <g opacity={appear} transform={`translate(${x} ${y})`}>
      {/* dashed containment box */}
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={4}
        fill="rgba(248,113,113,0.04)"
        stroke={RED}
        strokeOpacity={0.45}
        strokeWidth={0.9}
        strokeDasharray="3 3"
      />
      {/* corner ticks */}
      {corners.map(([px, py, sx, sy], i) => (
        <path
          key={i}
          d={`M ${px} ${py + sy * 5} L ${px} ${py} L ${px + sx * 5} ${py}`}
          fill="none"
          stroke={RED}
          strokeOpacity={0.7}
          strokeWidth={1.1}
        />
      ))}
      <text
        x={0}
        y={h / 2 + 9}
        textAnchor="middle"
        fontSize={5.4}
        fill="#fca5a5"
        opacity={0.75}
        style={{
          fontFamily: "ui-monospace, monospace",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        quarantined
      </text>
    </g>
  );
}

function TrustMeter({
  trust,
  quarantined,
}: {
  trust: number;
  quarantined: boolean;
}) {
  const pct = Math.max(0, Math.min(1, trust));
  const danger = pct < 0.45;
  const color = danger ? RED : EMERALD;
  return (
    <div className="pointer-events-none absolute bottom-9 left-4 w-[112px]">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/45">
          trust score
        </span>
        <span className="font-mono text-[8px] tabular-nums" style={{ color }}>
          {quarantined ? "0.00" : pct.toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full"
          initial={{ opacity: 1 }}
          style={{
            width: `${pct * 100}%`,
            background: `linear-gradient(90deg, ${color}, ${
              danger ? "#fecaca" : EMERALD_SOFT
            })`,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
}
