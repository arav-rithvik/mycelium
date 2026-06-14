"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { equivalents } from "@/lib/impact";

/**
 * The hero "wow" panel of the live impact dashboard.
 *
 * Top: live, human-relatable equivalents of the running totals (count up on change).
 * Bottom: the planetary "closer" — a big, dramatic, cited block scaling the 10% floor
 * to a full year. This is meant to be the loudest thing on the page.
 */

// ── count-up number that animates whenever `value` changes ──────────────────
function CountUp({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = to;

    if (reduce || from === to) {
      setDisplay(to);
      return;
    }

    const controls = animate(from, to, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <span>{format(display)}</span>;
}

// ── formatters ──────────────────────────────────────────────────────────────
const compact = (n: number) =>
  n >= 1000
    ? n.toLocaleString(undefined, {
        notation: "compact",
        maximumFractionDigits: 1,
      })
    : Math.round(n).toLocaleString();

const oneDp = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 1 });

type EqCard = {
  label: string;
  value: number;
  suffix: string;
  format: (n: number) => string;
};

export default function ScaledImpactPanel({
  stats,
}: {
  stats: {
    total_energy_wh: number;
    total_water_ml: number;
    total_co2_g: number;
    total_tokens_saved: number;
    total_reuses: number;
  };
}) {
  const eq = equivalents(
    stats.total_energy_wh,
    stats.total_water_ml,
    stats.total_co2_g,
  );

  // Express home energy as the most legible unit: days, or homes·year when huge.
  const homesYear = eq.homeDays / 365;
  const homeEnergy: EqCard =
    eq.homeDays >= 730
      ? {
          label: "homes·year powered",
          value: homesYear,
          suffix: "homes·yr",
          format: oneDp,
        }
      : {
          label: "home-days powered",
          value: eq.homeDays,
          suffix: "home-days",
          format: compact,
        };

  const cards: EqCard[] = [
    homeEnergy,
    {
      label: "phone charges",
      value: eq.phoneCharges,
      suffix: "charges",
      format: compact,
    },
    {
      label: "miles not driven",
      value: eq.carMiles,
      suffix: "miles",
      format: compact,
    },
    {
      label: "trees·year of CO₂",
      value: eq.treesYear,
      suffix: "trees·yr",
      format: compact,
    },
    {
      label: "showers of water",
      value: eq.showers,
      suffix: "showers",
      format: compact,
    },
  ];

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-10">
      {/* ambient glow field */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] max-w-[120%] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-emerald-300/10 blur-[120px]"
      />

      {/* ── 1. equivalents ─────────────────────────────────────────────── */}
      <div className="relative">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-300/70">
          live · {compact(stats.total_reuses)} reuses ·{" "}
          {compact(stats.total_tokens_saved)} tokens saved
        </p>
        <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          What that{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            adds up to.
          </span>
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {cards.map((c) => (
            <div
              key={c.label}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition-colors hover:border-emerald-400/40 sm:p-5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/0 via-emerald-400/0 to-emerald-400/[0.08] opacity-0 transition-opacity group-hover:opacity-100"
              />
              <div className="relative">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold tabular-nums text-emerald-300 sm:text-4xl">
                    <CountUp value={c.value} format={c.format} />
                  </span>
                </div>
                <div className="mt-2 text-[0.7rem] font-medium leading-snug text-white/55 sm:text-xs">
                  ≈ {c.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. planetary closer ─────────────────────────────────────────── */}
      <div className="relative mt-10 overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-b from-emerald-500/[0.08] to-emerald-900/[0.05] p-6 shadow-[0_0_80px_-20px_rgba(52,211,153,0.45)] sm:mt-14 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[36rem] max-w-[110%] rounded-full bg-emerald-400/20 blur-[90px]"
        />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-300/80">
            The 10% floor
          </p>

          <p className="mt-4 text-xl font-semibold leading-snug text-white sm:text-3xl sm:leading-snug">
            <span className="font-mono text-emerald-300">~250M</span> redundant
            agent sessions{" "}
            <span className="text-white/60">every day</span> waste{" "}
            <Hi>~105 MWh</Hi> · <Hi>~6M L</Hi> water · <Hi>~40 t</Hi> CO₂ —{" "}
            <span className="text-emerald-300">daily.</span>
          </p>

          <div className="my-7 h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent sm:my-9" />

          <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/40">
            Over a year
          </p>
          <p className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-6xl sm:leading-[1.1]">
            <Big>~38 GWh</Big>
            <span className="mx-2 text-white/30">=</span>
            <Big>~3,650</Big>{" "}
            <span className="align-middle text-base font-semibold text-white/70 sm:text-2xl">
              homes powered for a year
            </span>
          </p>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <div className="font-mono text-2xl font-bold text-emerald-300 sm:text-4xl">
                ~876
              </div>
              <div className="mt-1.5 text-sm text-white/60">
                Olympic pools of water
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <div className="font-mono text-2xl font-bold text-emerald-300 sm:text-4xl">
                ~3,200
              </div>
              <div className="mt-1.5 text-sm text-white/60">
                cars off the road
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// inline emerald-gradient highlight for the daily-floor numbers
function Hi({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text font-mono font-bold text-transparent">
      {children}
    </span>
  );
}

// big gradient figure for the yearly climax
function Big({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-br from-emerald-200 via-emerald-400 to-teal-300 bg-clip-text font-mono text-transparent drop-shadow-[0_0_25px_rgba(52,211,153,0.35)]">
      {children}
    </span>
  );
}
