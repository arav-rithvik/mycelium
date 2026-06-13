"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "motion/react";

/**
 * HowItWorksSection — the mechanism beat of the Mycelium page.
 *
 * The previous section drew a straight vertical thread. Here the thread closes
 * into a LOOP: four steps arranged around a continuous glowing root-path whose
 * end (Earn trust) feeds back into its start (Discover). A pulse of light
 * circulates the loop forever, so "Knowledge that compounds." is literal —
 * the cycle never stops, it gets brighter with every pass.
 *
 * Desktop: a 2×2 constellation joined by an organic closed SVG path.
 * Mobile: the same loop reflows to a vertical thread that curls back on itself.
 *
 * Matches the ForestDive / Problem / WhatItIs system: #0a0a0a underground,
 * faint emerald radial glows, Geist, feathered edges, pulsing emerald nodes,
 * self-drawing thread on scroll-into-view.
 */

const ease = [0.22, 1, 0.36, 1] as const;

type Step = {
  n: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Discover",
    body: "Before starting, an agent searches the commons for a skill that already solves its task.",
  },
  {
    n: "02",
    title: "Apply",
    body: "It reuses the proven skill instead of reasoning from scratch, using a fraction of the tokens.",
  },
  {
    n: "03",
    title: "Verify",
    body: "The skill runs its own success-check in the real environment. It either worked, or it didn't.",
  },
  {
    n: "04",
    title: "Earn trust",
    body: "That real outcome updates the skill's live trust score, so good knowledge rises and broken knowledge fades, with no curator.",
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease },
  },
};

export default function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px -12% 0px" });
  const reduce = useReducedMotion();

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative isolate flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 py-28 md:px-10 md:py-36"
    >
      {/* ── Underground atmosphere ─────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(52,211,153,0.10),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(110,231,183,0.06),transparent_62%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_50%_at_85%_88%,rgba(16,185,129,0.06),transparent_62%)]"
      />
      {/* Feather into the page above and below */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]"
      />
      {/* Fine grain to kill gradient banding */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="relative z-10 mx-auto w-full max-w-5xl"
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            variants={rise}
            className="text-[11px] font-medium uppercase tracking-[0.34em] text-emerald-300/70"
          >
            <span className="mr-3 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-emerald-300/80 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]" />
            How it works
          </motion.p>

          <motion.h2
            variants={rise}
            className="mt-6 text-balance text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl"
          >
            Knowledge that compounds.
          </motion.h2>

          <motion.p
            variants={rise}
            className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-white/60 md:text-xl"
          >
            Not a library that grows. A loop that learns. Every task an agent
            runs feeds the next one,{" "}
            <span className="text-white/80">and the commons gets sharper with use.</span>
          </motion.p>
        </div>

        {/* ── The loop ─────────────────────────────────────────────────── */}
        <div className="relative mx-auto mt-20 max-w-4xl md:mt-28">
          {/* Glowing closed-loop thread (desktop) — draws itself, then a pulse
              of light circulates it forever. Hidden on small screens, where the
              vertical thread below takes over. */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0 hidden h-full w-full md:block"
            viewBox="0 0 1000 560"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="hiw-loop"
                x1="0"
                y1="0"
                x2="1000"
                y2="560"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#6ee7b7" stopOpacity="0.55" />
                <stop offset="0.5" stopColor="#34d399" stopOpacity="0.8" />
                <stop offset="1" stopColor="#6ee7b7" stopOpacity="0.55" />
              </linearGradient>
              <radialGradient id="hiw-spark" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#d1fae5" stopOpacity="1" />
                <stop offset="45%" stopColor="#34d399" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Faint full loop underlay so the closed circuit always reads */}
            <path
              d="M 250 130 C 470 70, 530 70, 750 130 C 920 175, 920 385, 750 430 C 530 490, 470 490, 250 430 C 80 385, 80 175, 250 130 Z"
              stroke="url(#hiw-loop)"
              strokeWidth="1.25"
              strokeLinecap="round"
              opacity="0.18"
            />

            {/* The drawn loop — traces itself once on scroll-in */}
            <motion.path
              d="M 250 130 C 470 70, 530 70, 750 130 C 920 175, 920 385, 750 430 C 530 490, 470 490, 250 430 C 80 385, 80 175, 250 130 Z"
              stroke="url(#hiw-loop)"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                inView
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 2.6, ease, delay: 0.7 }}
              style={{ filter: "drop-shadow(0 0 7px rgba(52,211,153,0.5))" }}
            />

            {/* Circulating pulse — a bright dash that travels the closed loop,
                making the cycle literal. Starts after the loop has drawn. */}
            {!reduce && (
              <motion.path
                d="M 250 130 C 470 70, 530 70, 750 130 C 920 175, 920 385, 750 430 C 530 490, 470 490, 250 430 C 80 385, 80 175, 250 130 Z"
                stroke="url(#hiw-loop)"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="0.14 0.86"
                initial={{ strokeDashoffset: 0, opacity: 0 }}
                animate={
                  inView
                    ? { strokeDashoffset: [0, -1], opacity: [0, 1, 1] }
                    : { opacity: 0 }
                }
                transition={{
                  strokeDashoffset: {
                    duration: 6,
                    ease: "linear",
                    repeat: Infinity,
                    delay: 2.8,
                  },
                  opacity: { duration: 1.2, delay: 2.8 },
                }}
                style={{ filter: "drop-shadow(0 0 6px rgba(110,231,183,0.85))" }}
              />
            )}
          </svg>

          {/* Vertical thread for mobile — a root that loops back on itself */}
          <svg
            aria-hidden
            className="pointer-events-none absolute left-[1.4375rem] top-4 -z-0 block h-[calc(100%-2rem)] w-12 -translate-x-1/2 md:hidden"
            viewBox="0 0 40 700"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="hiw-thread-m"
                x1="20"
                y1="0"
                x2="20"
                y2="700"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#6ee7b7" stopOpacity="0.08" />
                <stop offset="0.5" stopColor="#34d399" stopOpacity="0.8" />
                <stop offset="1" stopColor="#6ee7b7" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <motion.path
              d="M20 0 C 8 120, 32 230, 20 350 C 8 470, 32 580, 20 690"
              stroke="url(#hiw-thread-m)"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                inView
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 2.2, ease, delay: 0.5 }}
              style={{ filter: "drop-shadow(0 0 6px rgba(52,211,153,0.55))" }}
            />
            {/* curl-back arrow hint at the bottom: loop closes */}
            <motion.path
              d="M20 690 C 20 712, 6 712, 6 690"
              stroke="url(#hiw-thread-m)"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView ? { pathLength: 1, opacity: 0.6 } : { opacity: 0 }}
              transition={{ duration: 1, ease, delay: 2.5 }}
            />
          </svg>

          {/* ── Step cards ─────────────────────────────────────────────── */}
          {/* Desktop: 2×2 grid sitting on the loop corners.
              Mobile: single column threaded vertically. */}
          <div className="relative z-10 grid grid-cols-1 gap-12 sm:gap-14 md:grid-cols-2 md:gap-x-40 md:gap-y-44 md:px-2">
            {STEPS.map((step, i) => {
              // On desktop, push BR/BL cards down so they hug the loop's lower arc,
              // and nudge text alignment so each card faces the loop's interior.
              const isRightCol = i === 1 || i === 2;
              return (
                <motion.div
                  key={step.n}
                  variants={rise}
                  className={[
                    "group relative flex items-start gap-5 md:gap-6",
                    isRightCol ? "md:flex-row-reverse md:text-right" : "",
                  ].join(" ")}
                >
                  {/* Pulsing node */}
                  <div className="relative mt-0.5 flex-none">
                    <span className="absolute inset-0 -m-2 rounded-full bg-emerald-400/15 blur-md transition-opacity duration-700 group-hover:bg-emerald-400/30" />
                    {!reduce && (
                      <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-emerald-300/20 [animation-duration:3s]" />
                    )}
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/25 bg-[#0c100e]/80 backdrop-blur-sm">
                      <span className="absolute inset-0 rounded-full shadow-[inset_0_0_14px_rgba(52,211,153,0.25)]" />
                      <span className="font-mono text-xs tracking-widest text-emerald-300/80">
                        {step.n}
                      </span>
                    </span>
                  </div>

                  {/* Copy */}
                  <div className="pt-0.5">
                    <h3 className="text-xl font-medium tracking-tight text-white md:text-2xl">
                      {step.title}
                    </h3>
                    <p
                      className={[
                        "mt-2 max-w-sm text-[15px] leading-relaxed text-white/55 md:text-base",
                        isRightCol ? "md:ml-auto" : "",
                      ].join(" ")}
                    >
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Loop label at the dead center of the desktop circuit */}
          <motion.div
            variants={rise}
            className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center md:flex"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.36em] text-emerald-200/45">
              the loop
            </span>
            <span className="mt-2 text-sm text-white/30">no curator</span>
          </motion.div>
        </div>

        {/* ── Closing line ─────────────────────────────────────────────── */}
        <motion.div
          variants={rise}
          className="mx-auto mt-24 max-w-2xl text-center md:mt-32"
        >
          <div className="mx-auto mb-8 h-px w-24 bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />
          <p className="text-balance text-lg leading-relaxed text-white/70 md:text-xl">
            Every reuse is inference that never had to happen,{" "}
            <span className="text-white/40">
              energy not burned, water not evaporated, carbon not emitted.
            </span>
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
