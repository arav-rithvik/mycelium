"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

// The shared package only exposes the "." subpath export, so importing
// `@mycelium/shared/types` doesn't resolve under bundler resolution. Inline
// the contract here to stay self-contained.
type Stats = {
  id: number;
  total_tokens_saved: number;
  total_energy_wh: number;
  total_water_ml: number;
  total_co2_g: number;
  total_reuses: number;
  updated_at: string;
};

type Metric = {
  key: string;
  label: string;
  unit: string;
  value: number;
  format: (n: number) => string;
};

const COMMA = new Intl.NumberFormat("en-US");
const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function fmtTokens(n: number): string {
  // Use compact notation once numbers get large enough to be unwieldy.
  return n >= 100_000 ? COMPACT.format(n) : COMMA.format(Math.round(n));
}

function fmtFixed(decimals: number) {
  return (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
}

function Counter({ metric }: { metric: Metric }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? metric.value : 0);
  const prevRef = useRef(reduceMotion ? metric.value : 0);

  useEffect(() => {
    const from = prevRef.current;
    const to = metric.value;
    prevRef.current = to;

    if (reduceMotion || from === to) {
      setDisplay(to);
      return;
    }

    const controls = animate(from, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [metric.value, reduceMotion]);

  return (
    <div className="group relative flex flex-col items-center justify-center rounded-3xl border border-emerald-400/10 bg-white/[0.02] px-6 py-8 text-center transition-all duration-500 hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-emerald-400/[0.04]">
      {/* soft glow halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(52,211,153,0.18), transparent 70%)",
        }}
      />
      <span
        className="relative bg-gradient-to-b from-[#a7f3d0] via-[#6ee7b7] to-[#34d399] bg-clip-text font-mono text-5xl font-extrabold leading-none tracking-tight tabular-nums text-transparent drop-shadow-[0_0_25px_rgba(52,211,153,0.35)] sm:text-6xl lg:text-7xl"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {metric.format(display)}
      </span>
      <span className="relative mt-3 font-mono text-sm font-semibold text-emerald-200/80">
        {metric.unit}
      </span>
      <span className="relative mt-1 font-mono text-[0.7rem] font-medium uppercase tracking-[0.25em] text-emerald-100/40">
        {metric.label}
      </span>
    </div>
  );
}

export default function ImpactTicker({ stats }: { stats: Stats }) {
  const metrics: Metric[] = [
    {
      key: "tokens",
      label: "Tokens Saved",
      unit: "tokens",
      value: stats.total_tokens_saved,
      format: fmtTokens,
    },
    {
      key: "energy",
      label: "Energy Saved",
      unit: "kWh",
      value: stats.total_energy_wh / 1000,
      format: fmtFixed(1),
    },
    {
      key: "water",
      label: "Water Saved",
      unit: "liters",
      value: stats.total_water_ml / 1000,
      format: fmtFixed(1),
    },
    {
      key: "co2",
      label: "CO₂ Avoided",
      unit: "kg",
      value: stats.total_co2_g / 1000,
      format: fmtFixed(1),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-6">
      {metrics.map((metric) => (
        <Counter key={metric.key} metric={metric} />
      ))}
    </div>
  );
}
