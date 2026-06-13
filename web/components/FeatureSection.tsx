"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";

/**
 * Shared shell for the feature beats. Supports three distinct layouts so each
 * feature reads as its own design while staying cohesive and page-locked:
 *   panel    - text + square visual side by side, details stacked under text.
 *   showcase - large dominant visual, compact text, details stacked.
 *   row      - text + visual on top, details as a full-width card row below.
 */
const SPORES = [
  { top: "18%", left: "12%", d: 9, delay: 0 },
  { top: "70%", left: "20%", d: 12, delay: 1.5 },
  { top: "32%", left: "84%", d: 10, delay: 0.8 },
  { top: "78%", left: "72%", d: 14, delay: 2.2 },
  { top: "50%", left: "50%", d: 11, delay: 1.1 },
];

type Layout = "panel" | "showcase" | "row";

const CFG: Record<Layout, { grid: string; viz: string; title: string }> = {
  panel: { grid: "md:grid-cols-[0.9fr_1.1fr]", viz: "max-w-[clamp(360px,42vw,600px)]", title: "md:text-[2.6rem]" },
  showcase: { grid: "md:grid-cols-[0.66fr_1.34fr]", viz: "max-w-[clamp(420px,50vw,720px)]", title: "md:text-[2.3rem]" },
  row: { grid: "md:grid-cols-[1.05fr_0.95fr]", viz: "max-w-[clamp(320px,34vw,500px)]", title: "md:text-[3rem]" },
};

const MASK =
  "linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent)";

function DetailCard({
  d,
  commandStyle,
}: {
  d: { heading: string; text: string };
  commandStyle?: boolean;
}) {
  return (
    <button
      type="button"
      className="group rounded-xl border border-white/[0.07] bg-white/[0.015] px-4 py-3 text-left transition-colors duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/[0.04]"
    >
      {commandStyle ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/[0.14] px-3 py-1 font-mono text-[12px] tracking-[0.06em] text-white shadow-[0_0_18px_rgba(52,211,153,0.18)] transition-colors group-hover:bg-emerald-400/25">
          <span className="text-emerald-300/80">/</span>
          {d.heading}
        </span>
      ) : (
        <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-emerald-300/90">
          {d.heading}
        </div>
      )}
      <div className="mt-1.5 text-sm leading-relaxed text-white/45 transition-colors group-hover:text-white/65">
        {d.text}
      </div>
    </button>
  );
}

export default function FeatureSection({
  index,
  total,
  title,
  description,
  details,
  commandStyle,
  side,
  layout = "panel",
  children,
}: {
  index: number;
  total: number;
  title: string;
  description: string;
  details?: { heading: string; text: string }[];
  commandStyle?: boolean;
  side: "left" | "right";
  layout?: Layout;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const num = String(index).padStart(2, "0");
  const left = side === "left";
  const cfg = CFG[layout];
  const stacked = layout !== "row";

  return (
    <section
      data-snap
      ref={ref}
      className="relative isolate flex h-screen w-full items-center overflow-hidden bg-transparent"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(rgba(52,211,153,0.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -z-20 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.08),transparent_60%)] blur-[120px]"
        style={{ [left ? "right" : "left"]: "-6rem" } as React.CSSProperties}
      />
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
        <div className={`grid w-full items-center gap-10 md:gap-14 ${cfg.grid}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={`flex flex-col gap-5 ${left ? "md:order-1" : "md:order-2"}`}
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-2xl font-medium leading-none text-emerald-300">{num}</span>
              <span className="h-px w-12 flex-none bg-gradient-to-r from-emerald-400/50 to-transparent" />
              <span className="font-mono text-[11px] tracking-wider text-white/25">
                / {String(total).padStart(2, "0")}
              </span>
            </div>
            <h3 className={`text-3xl font-medium leading-[1.1] tracking-tight text-white ${cfg.title}`}>
              {title}
            </h3>
            <p className="max-w-md text-base leading-relaxed text-white/60 md:text-lg">{description}</p>

            {stacked && details && details.length > 0 && (
              <div className="mt-2 flex max-w-md flex-col gap-2.5">
                {details.map((d) => (
                  <DetailCard key={d.heading} d={d} commandStyle={commandStyle} />
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`relative mx-auto aspect-square w-full ${cfg.viz} ${left ? "md:order-2" : "md:order-1"}`}
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
              {children}
            </div>
          </motion.div>
        </div>

        {!stacked && details && details.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
          >
            {details.map((d) => (
              <DetailCard key={d.heading} d={d} commandStyle={commandStyle} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
