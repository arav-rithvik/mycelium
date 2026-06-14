"use client";

import { motion, useAnimationFrame } from "motion/react";
import { useMemo, useRef, useState } from "react";

/**
 * MeasuredImpactViz - signature animation for
 * "We measure it. We do not model it."
 *
 * An impact odometer (rolling digits) counts up real tokens never generated,
 * converted through cited factors into liters of water and kg of CO2. With each
 * tick, a sapling sprouts from bare ground and grows; over the loop the ground
 * fills into a small glowing forest, then gently resets. Counted savings become
 * a forest that grows back.
 *
 * Layout note: transparent over #0a0a0a, only glowing elements. No outer box,
 * border, or full-bleed grid panel. The SVG scene is sized to fit-inside
 * (preserveAspectRatio meet) with generous internal padding so neither the
 * odometer nor the full regrown forest ever clips.
 */

const EMERALD = "#34d399";
const EMERALD_LIGHT = "#6ee7b7";
const EMERALD_PALE = "#a7f3d0";

// One full loop (ms). Trees grow over GROW_MS, hold, fade, reset.
const GROW_MS = 11000;
const HOLD_MS = 1600;
const FADE_MS = 1500;
const LOOP_MS = GROW_MS + HOLD_MS + FADE_MS;

// Final targets reached at end of GROW_MS.
const TARGET_TOKENS = 1_482_390;
const TARGET_WATER = 5_924; // liters
const TARGET_CO2 = 318; // kg

const TREE_COUNT = 11;

// Scene coordinate system. A square viewBox; everything lives inside the
// padded region so it fits with margin at all times.
const VB = 460;
const PAD = 34; // internal padding kept clear on every side
const GROUND_Y = 392; // horizon baseline, leaves bottom padding for canopies
const FOREST_LEFT = PAD + 8;
const FOREST_RIGHT = VB - PAD - 8;

type Tree = {
  x: number;
  groundY: number;
  scale: number;
  birth: number; // 0..1 fraction of grow phase when it sprouts
  hue: number; // 0..1 palette mix
  sway: number; // phase offset
  trunk: number;
  layers: 2 | 3;
};

function makeTrees(): Tree[] {
  // Deterministic layout so SSR/CSR match - pseudo-random from a seed.
  let s = 1337;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const span = FOREST_RIGHT - FOREST_LEFT;
  const trees: Tree[] = [];
  for (let i = 0; i < TREE_COUNT; i++) {
    const depth = rand(); // 0 = back, 1 = front
    trees.push({
      x: FOREST_LEFT + (i / (TREE_COUNT - 1)) * span + (rand() - 0.5) * 18,
      groundY: GROUND_Y - 18 + depth * 30,
      scale: 0.5 + depth * 0.55,
      birth: i / TREE_COUNT, // sprout in left-to-right-ish waves
      hue: rand(),
      sway: rand() * Math.PI * 2,
      trunk: 0.85 + rand() * 0.4,
      layers: rand() > 0.45 ? 3 : 2,
    });
  }
  // Sort so far (small) trees render first, near trees on top.
  return trees.sort((a, b) => a.groundY - b.groundY);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function lerpColor(t: number): string {
  // Blend across the three emerald accents by t in [0,1].
  const stops = [EMERALD, EMERALD_LIGHT, EMERALD_PALE];
  const seg = Math.min(1.999, t * 2);
  const i = Math.floor(seg);
  const f = seg - i;
  const hex = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const a = hex(stops[i]);
  const b = hex(stops[i + 1]);
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

/** A single rolling digit reel. Shows `digit` (0-9) with neighbors above/below. */
function DigitReel({ digit, dim }: { digit: number; dim: boolean }) {
  // Smoothly interpolated continuous value drives the vertical offset.
  const cellH = 1.15; // em
  return (
    <span
      className="relative inline-block overflow-hidden align-middle"
      style={{ height: `${cellH}em`, width: "0.62em" }}
    >
      <motion.span
        className="absolute left-0 top-0 flex flex-col items-center tabular-nums"
        initial={false}
        animate={{ y: `${-digit * cellH}em` }}
        transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.6 }}
        style={{ lineHeight: `${cellH}em` }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span
            key={n}
            style={{
              height: `${cellH}em`,
              color: dim ? "rgba(167,243,208,0.32)" : EMERALD_PALE,
              textShadow: dim ? "none" : "0 0 12px rgba(110,231,183,0.55)",
            }}
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Renders an odometer for a number with separators, padding to `width` digits. */
function Odometer({ value, width }: { value: number; width: number }) {
  const rounded = Math.round(value);
  const str = String(rounded).padStart(width, "0");
  const firstSig = str.length - String(rounded).length; // leading-zero boundary
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < str.length; i++) {
    const posFromRight = str.length - 1 - i;
    if (posFromRight > 0 && posFromRight % 3 === 0) {
      // thin separator
      cells.push(
        <span
          key={`sep-${i}`}
          className="inline-block"
          style={{ width: "0.18em", color: "rgba(110,231,183,0.35)" }}
        >
          ,
        </span>,
      );
    }
    cells.push(
      <DigitReel key={i} digit={Number(str[i])} dim={i < firstSig} />,
    );
  }
  return <span className="inline-flex items-center">{cells}</span>;
}

function StatRow({
  label,
  unit,
  value,
  width,
  flash,
}: {
  label: string;
  unit: string;
  value: number;
  width: number;
  flash: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-emerald-300/55">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className="font-mono text-[19px] font-semibold leading-none"
          style={{
            filter: `drop-shadow(0 0 ${4 + flash * 10}px rgba(52,211,153,${
              0.25 + flash * 0.5
            }))`,
          }}
        >
          <Odometer value={value} width={width} />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-200/45">
          {unit}
        </span>
      </span>
    </div>
  );
}

/** Hand-authored sapling/tree that scales-in from the ground as it grows. */
function TreeSVG({
  tree,
  growth,
  t,
}: {
  tree: Tree;
  growth: number; // 0..1 - this tree's own growth
  t: number; // global time (s) for sway
}) {
  if (growth <= 0.001) return null;
  const eased = easeOutBack(Math.min(1, growth));
  const sway = Math.sin(t * 0.9 + tree.sway) * (2.2 + tree.scale) * growth;
  const color = lerpColor(tree.hue);
  const h = 70 * tree.scale; // full trunk-to-tip height
  const cw = 26 * tree.scale; // canopy half-width at base
  const young = growth < 0.55;

  return (
    <g
      transform={`translate(${tree.x} ${tree.groundY})`}
      style={{ transformOrigin: "bottom" }}
    >
      <g
        transform={`scale(${eased}) rotate(${sway})`}
        style={{ transformBox: "fill-box" }}
      >
        {/* glow pool under the canopy */}
        <ellipse
          cx={0}
          cy={-h * 0.55}
          rx={cw * 1.3}
          ry={h * 0.55}
          fill={color}
          opacity={0.1 * growth}
          style={{ filter: "blur(7px)" }}
        />
        {/* trunk */}
        <path
          d={`M ${-1.4 * tree.trunk} 0
              Q ${-0.6} ${-h * 0.4} 0 ${-h * 0.62}
              Q ${0.6} ${-h * 0.4} ${1.4 * tree.trunk} 0 Z`}
          fill="url(#trunkGrad)"
          opacity={0.9}
        />
        {/* canopy: stacked triangles for a conifer, or a soft cluster for sapling */}
        {young ? (
          <>
            <path
              d={`M 0 ${-h * 0.5} L ${-cw * 0.5} ${-h * 0.18} L ${cw * 0.5} ${
                -h * 0.18
              } Z`}
              fill={color}
              opacity={0.92}
            />
            <circle cx={0} cy={-h * 0.5} r={cw * 0.22} fill={EMERALD_PALE} opacity={0.9} />
          </>
        ) : (
          Array.from({ length: tree.layers }, (_, k) => {
            const top = -h * (0.5 + k * 0.16);
            const base = -h * (0.16 + k * 0.16);
            const w = cw * (1 - k * 0.22);
            return (
              <path
                key={k}
                d={`M 0 ${top} L ${-w} ${base} Q 0 ${base - 4} ${w} ${base} Z`}
                fill={color}
                opacity={0.86 + k * 0.04}
              />
            );
          })
        )}
        {/* tip spark */}
        <circle
          cx={0}
          cy={-h * (young ? 0.5 : 0.5 + (tree.layers - 1) * 0.16)}
          r={1.7}
          fill="#ecfdf5"
          opacity={0.7 + 0.3 * Math.sin(t * 3 + tree.sway)}
        />
      </g>
    </g>
  );
}

export default function MeasuredImpactViz() {
  const trees = useMemo(makeTrees, []);
  const startRef = useRef<number | null>(null);

  const [tokens, setTokens] = useState(0);
  const [water, setWater] = useState(0);
  const [co2, setCo2] = useState(0);
  const [growths, setGrowths] = useState<number[]>(() => trees.map(() => 0));
  const [phaseFade, setPhaseFade] = useState(0); // 0..1 reset fade
  const [flash, setFlash] = useState(0);
  const [tSec, setTSec] = useState(0);

  // Track which trees have "popped" this cycle to fire a flash on sprout.
  const sproutedRef = useRef<boolean[]>(trees.map(() => false));
  const flashUntilRef = useRef(0);

  useAnimationFrame((now) => {
    if (startRef.current === null) startRef.current = now;
    const elapsed = (now - startRef.current) % LOOP_MS;
    setTSec(now / 1000);

    // Reset sprout tracking at the top of each cycle.
    if (elapsed < 40) {
      sproutedRef.current = trees.map(() => false);
    }

    // Phase progress.
    const growT = Math.min(1, elapsed / GROW_MS); // 0..1 over grow phase
    // Smooth, slightly eased so counting feels organic but steady.
    const counted = growT < 1 ? 1 - (1 - growT) ** 1.35 : 1;

    setTokens(TARGET_TOKENS * counted);
    setWater(TARGET_WATER * counted);
    setCo2(TARGET_CO2 * counted);

    // Per-tree growth: each tree grows over a window after its birth.
    const window = 0.42; // fraction of grow phase a single tree takes
    const next = trees.map((tr, i) => {
      const localStart = tr.birth * (1 - window);
      const g = (growT - localStart) / window;
      const clamped = Math.max(0, Math.min(1, g));
      // Fire a flash the moment a tree first crosses the sprout threshold.
      if (!sproutedRef.current[i] && clamped > 0.02) {
        sproutedRef.current[i] = true;
        flashUntilRef.current = now + 260;
      }
      return clamped;
    });
    setGrowths(next);

    // Odometer/sprout link flash.
    const f = flashUntilRef.current > now
      ? (flashUntilRef.current - now) / 260
      : 0;
    setFlash(f);

    // Fade-out reset after hold.
    if (elapsed > GROW_MS + HOLD_MS) {
      setPhaseFade((elapsed - GROW_MS - HOLD_MS) / FADE_MS);
    } else {
      setPhaseFade(0);
    }
  });

  const forestOpacity = 1 - phaseFade;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0a0a]">
      {/* atmospheric backdrop - soft ground glow, no hard edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 75% at 50% 112%, rgba(16,185,129,0.16), transparent 62%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            "radial-gradient(56% 42% at 50% 16%, rgba(52,211,153,0.07), transparent 72%)",
        }}
      />

      {/* The scene. meet (not slice) so the full forest fits inside, never clipped. */}
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="trunkGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0b3b2b" />
            <stop offset="100%" stopColor="#1f6b4d" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(52,211,153,0.0)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.12)" />
          </linearGradient>
        </defs>

        {/* ground plane + forest, all kept inside the padded region */}
        <g style={{ opacity: forestOpacity }}>
          {/* soft ground wash fading out before the bottom padding */}
          <rect
            x={PAD}
            y={GROUND_Y - 4}
            width={VB - PAD * 2}
            height={VB - PAD - (GROUND_Y - 4)}
            fill="url(#groundGrad)"
          />
          {/* horizon line, inset from the sides */}
          <line
            x1={FOREST_LEFT - 6}
            y1={GROUND_Y}
            x2={FOREST_RIGHT + 6}
            y2={GROUND_Y}
            stroke="rgba(110,231,183,0.18)"
            strokeWidth="1"
          />
          {/* perspective furrows, narrowing so they stay inside padding */}
          {Array.from({ length: 6 }, (_, i) => {
            const y = GROUND_Y + 5 + i * 11;
            const half = Math.min(
              (VB / 2) - PAD,
              (y - GROUND_Y) * 4.4,
            );
            return (
              <line
                key={i}
                x1={VB / 2 - half}
                y1={y}
                x2={VB / 2 + half}
                y2={y}
                stroke="rgba(52,211,153,0.07)"
                strokeWidth="1"
              />
            );
          })}

          {/* the forest */}
          {trees.map((tr, i) => (
            <TreeSVG key={i} tree={tr} growth={growths[i]} t={tSec} />
          ))}
        </g>

        {/* drifting motes that rise as the forest fills, clamped above padding */}
        {trees.map((tr, i) => {
          const g = growths[i];
          if (g < 0.3) return null;
          const drift = (tSec * 14 + i * 80) % 200;
          const cy = tr.groundY - 56 - drift;
          if (cy < PAD) return null;
          return (
            <circle
              key={`mote-${i}`}
              cx={tr.x + Math.sin(tSec * 0.6 + i) * 9}
              cy={cy}
              r={1.3}
              fill={EMERALD_LIGHT}
              opacity={(1 - drift / 200) * 0.5 * g * forestOpacity}
            />
          );
        })}
      </svg>

      {/* ODOMETER PANEL - blends in: soft radial glow base, no opaque box, hairline frame */}
      <div className="absolute left-1/2 top-[7%] w-[74%] max-w-[320px] -translate-x-1/2">
        <div
          className="relative px-5 py-4"
          style={{
            borderRadius: "16px",
            // Glow that fades to nothing at the edges instead of a hard square.
            background:
              "radial-gradient(120% 130% at 50% 0%, rgba(6,20,15,0.55), rgba(6,20,15,0.18) 58%, rgba(6,20,15,0) 100%)",
            boxShadow: `0 0 ${24 + flash * 28}px rgba(16,185,129,${
              0.1 + flash * 0.2
            })`,
          }}
        >
          {/* hairline frame as a separate soft layer so it reads as glow, not a box */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: "16px",
              boxShadow: "inset 0 0 0 1px rgba(110,231,183,0.1)",
              maskImage:
                "radial-gradient(130% 130% at 50% 30%, #000 55%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(130% 130% at 50% 30%, #000 55%, transparent 100%)",
            }}
          />

          <div className="relative mb-3 flex items-center justify-between">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.34em] text-emerald-200/50">
              Measured Impact
            </span>
            <motion.span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: EMERALD }}
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="relative space-y-2.5">
            <StatRow
              label="Tokens saved"
              unit="tok"
              value={tokens}
              width={7}
              flash={flash}
            />
            <div className="h-px bg-emerald-400/10" />
            <StatRow
              label="Water"
              unit="L"
              value={water}
              width={4}
              flash={flash}
            />
            <StatRow
              label="CO2 avoided"
              unit="kg"
              value={co2}
              width={3}
              flash={flash}
            />
          </div>

          <div className="relative mt-3 flex items-center gap-1.5">
            <span className="font-mono text-[7.5px] uppercase tracking-[0.28em] text-emerald-300/35">
              counted, not modeled · cited factors
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
