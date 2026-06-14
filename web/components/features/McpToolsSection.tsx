"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import McpDiscoveryViz from "@/components/features/McpDiscoveryViz";

/**
 * Feature 02 takeover: "The 5 MCP Tools".
 * Full-page section mirroring FeatureSection's design language (editorial index
 * header, ambient dot grid, drifting spores, emerald glow, mono command pills,
 * masked viz wrapper). Left region lists the five MCP tools as command pills;
 * the set_sharing tool carries an animated on/off privacy toggle. Right region
 * reuses the existing McpDiscoveryViz scanner inside a feathered square.
 */

const SPORES = [
  { top: "18%", left: "12%", d: 9, delay: 0 },
  { top: "70%", left: "20%", d: 12, delay: 1.5 },
  { top: "32%", left: "84%", d: 10, delay: 0.8 },
  { top: "78%", left: "72%", d: 14, delay: 2.2 },
  { top: "50%", left: "50%", d: 11, delay: 1.1 },
];

const MASK =
  "linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, transparent, #000 9%, #000 91%, transparent)";

type Tool = {
  name: string;
  text: string;
  toggle?: boolean;
};

const TOOLS: Tool[] = [
  {
    name: "search_skills",
    text: "Semantic search over the commons, ranked by trust.",
  },
  {
    name: "get_skill",
    text: "Read a skill's record, proven envs, and live trust.",
  },
  {
    name: "publish_skill",
    text: "Distill a solved session into a versioned skill.",
  },
  {
    name: "set_sharing",
    text: "/mycelium on | off — public commons or private.",
    toggle: true,
  },
  {
    name: "report_apply",
    text: "Report each outcome; trust climbs or falls.",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

function CommandPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/[0.14] px-3 py-1 font-mono text-[12px] tracking-[0.06em] text-white shadow-[0_0_18px_rgba(52,211,153,0.18)]">
      <span className="text-emerald-300/80">/</span>
      {name}
    </span>
  );
}

function SharingToggle() {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);

  // Gentle auto-loop between private/public unless reduced motion is requested.
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setOn((v) => !v), 2600);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      aria-label={on ? "Sharing on, public commons" : "Sharing off, private library"}
      className="group inline-flex flex-none items-center gap-2 rounded-full border px-1.5 py-1 font-mono text-[10px] tracking-[0.04em] transition-colors duration-300"
      style={{
        borderColor: on ? "rgba(52,211,153,0.55)" : "rgba(255,255,255,0.12)",
        background: on ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.02)",
        boxShadow: on ? "0 0 16px rgba(52,211,153,0.2)" : "none",
      }}
    >
      <span
        className="relative inline-flex h-4 w-7 flex-none items-center rounded-full transition-colors duration-300"
        style={{ background: on ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.10)" }}
      >
        <motion.span
          className="absolute left-0.5 h-3 w-3 rounded-full"
          style={{ background: on ? "#6ee7b7" : "rgba(255,255,255,0.55)" }}
          animate={{ x: on ? 12 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 30 }
          }
        />
      </span>
      <span
        className="whitespace-nowrap transition-colors duration-300"
        style={{ color: on ? "#a7f3d0" : "rgba(255,255,255,0.5)" }}
      >
        {on ? "public" : "private"}
      </span>
    </button>
  );
}

export default function McpToolsSection({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const num = String(index).padStart(2, "0");

  return (
    <section
      data-snap
      ref={ref}
      className="relative isolate flex h-screen w-full items-center overflow-hidden bg-transparent"
    >
      {/* ambient dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(rgba(52,211,153,0.06) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 80%)",
        }}
      />
      {/* emerald glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -z-20 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.08),transparent_60%)] blur-[120px]"
        style={{ right: "-6rem" }}
      />
      {/* drifting spores */}
      {SPORES.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute -z-10 h-1 w-1 rounded-full bg-emerald-300/40 blur-[1px]"
          style={{ top: s.top, left: s.left }}
          initial={{ opacity: 0.2 }}
          animate={reduce ? { opacity: 0.4 } : { y: [0, -18, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: s.d, repeat: Infinity, ease: "easeInOut", delay: s.delay }
          }
        />
      ))}

      <div className="relative z-[5] mx-auto grid w-full max-w-7xl items-center gap-10 px-8 py-10 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:px-14">
        {/* LEFT — header sits directly on top of the tools, grouped as one block */}
        <div className="flex flex-col gap-7 md:order-1">
          {/* HEADER */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="relative flex flex-col gap-3.5"
          >
            {/* soft dark scrim so the heading + copy stay readable over the canopy */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-7 -inset-y-6 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(5,8,7,0.94),rgba(5,8,7,0.5)_60%,transparent_82%)] blur-md"
            />
            <div className="flex items-center gap-4">
              <span className="font-mono text-2xl font-medium leading-none text-emerald-300">{num}</span>
              <span className="h-px w-12 flex-none bg-gradient-to-r from-emerald-400/50 to-transparent" />
              <span className="font-mono text-[11px] tracking-wider text-white/25">
                / {String(total).padStart(2, "0")}
              </span>
            </div>
            <h2 className="text-3xl font-medium leading-[1.08] tracking-tight text-white md:text-[2.8rem]">
              The 5 MCP Tools
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-white/60 md:text-[1.05rem]">
              Mycelium speaks to Claude through five MCP tools. The agent searches the commons, reads
              a skill&apos;s track record, contributes what it solves, controls what it shares, and reports
              every outcome — augmenting the agent&apos;s reasoning instead of bypassing it.
            </p>
          </motion.div>

          {/* tools list — compact 2-col card grid, directly under the header */}
          <motion.ol
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {TOOLS.map((tool, i) => (
              <motion.li
                key={tool.name}
                initial={{ opacity: 0, x: -14 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
                transition={{ duration: 0.5, delay: 0.28 + i * 0.06, ease: EASE }}
                className="flex flex-col gap-2 rounded-xl border border-emerald-400/10 bg-[#070b09]/85 px-4 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <CommandPill name={tool.name} />
                  {tool.toggle && <SharingToggle />}
                </div>
                <p className="text-[13px] leading-snug text-white/55">{tool.text}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>

        {/* RIGHT — scanner, vertically centered between top and bottom */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          className="relative mx-auto aspect-square w-full max-w-[clamp(380px,42vw,620px)] md:order-2"
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
            <McpDiscoveryViz />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
