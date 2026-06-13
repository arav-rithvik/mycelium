"use client";

import { useRef } from "react";
import { motion, useInView, type Variants } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease },
  },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

/* ──────────────────────────────────────────────────────────────────────────
 * CROSS-SECTION GEOMETRY  (viewBox 1200 x 800, xMidYMid slice)
 *
 * Above ground  : y  ~0 -> ~300   tree-line silhouettes fading down
 * Soil haze     : y ~300 -> ~360  soft gradient band (no hard edge)
 * Below ground  : y ~360 -> ~800  branching mycelium, denser near the soil
 * ────────────────────────────────────────────────────────────────────────── */
const SOIL_Y = 332;

/**
 * Dark organic tree silhouettes. Each is a soft, irregular canopy on a tapered
 * trunk, authored to read as a real tree at dusk (not a cartoon). Positioned
 * across the top and varied in height/width. Swapping these for a photo later
 * means replacing this array + its <g>.
 */
type Tree = { x: number; scale: number; sway: number };
const TREES: Tree[] = [
  { x: 90, scale: 0.86, sway: 0 },
  { x: 245, scale: 1.12, sway: 1 },
  { x: 415, scale: 0.74, sway: 2 },
  { x: 600, scale: 1.28, sway: 0 },
  { x: 790, scale: 0.8, sway: 1 },
  { x: 955, scale: 1.04, sway: 2 },
  { x: 1120, scale: 0.9, sway: 0 },
];

/**
 * A single hand-authored tree silhouette, drawn around a local origin at the
 * base of the trunk (0,0), growing upward in -y. Soft lobed canopy + tapered
 * trunk. Rendered dark with a faint emerald rim via the parent group.
 */
function TreeShape() {
  return (
    <>
      {/* trunk */}
      <path
        d="M-6 0 C -7 -36 -5 -64 -3 -96 C -2 -108 2 -108 3 -96 C 5 -64 7 -36 6 0 Z"
        fill="url(#tree-fill)"
      />
      {/* canopy: layered soft lobes for an organic, slightly irregular crown */}
      <path
        d="M0 -86
           C -44 -86 -78 -108 -84 -146
           C -110 -150 -120 -190 -96 -212
           C -104 -250 -64 -286 -22 -276
           C 2 -300 40 -300 64 -276
           C 104 -286 142 -252 132 -212
           C 156 -192 150 -150 122 -146
           C 116 -110 80 -86 36 -86
           C 24 -78 12 -78 0 -86 Z"
        fill="url(#tree-fill)"
      />
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * MYCELIUM: organic branching filaments.
 *
 * Authored as families of curved hyphae that fan out from anchor points near
 * the soil line, split, drift, and reconnect. Many thin strands, denser at the
 * top, trailing off lower down. A handful are tagged as "carrier" paths so
 * glowing nodes can travel along them.
 * ────────────────────────────────────────────────────────────────────────── */
type Filament = { d: string; carrier?: boolean; reverse?: boolean; w?: number };

const FILAMENTS: Filament[] = [
  // ── primary trunk-lines spanning the width, just under the soil ──
  { d: "M-30 372 C 140 360, 230 392, 360 384 C 470 378, 560 408, 690 398 C 820 388, 900 412, 1230 404", carrier: true, w: 1.15 },
  { d: "M1230 430 C 1040 420, 940 450, 800 440 C 660 430, 560 458, 420 448 C 280 438, 160 462, -30 452", carrier: true, reverse: true, w: 1.15 },
  { d: "M-30 506 C 180 492, 300 524, 470 512 C 640 500, 760 528, 1230 516", carrier: true, w: 1 },

  // ── branching hyphae fanning DOWN from the trunk-lines ──
  { d: "M250 388 C 240 430, 270 470, 250 520 C 236 556, 262 596, 244 648", w: 0.7 },
  { d: "M250 470 C 300 486, 352 478, 392 510 C 430 540, 488 534, 520 568", carrier: true, w: 0.8 },
  { d: "M392 510 C 384 556, 410 592, 388 636 C 372 668, 398 704, 380 748", w: 0.6 },
  { d: "M690 398 C 700 440, 672 478, 700 522 C 722 556, 694 596, 716 642", w: 0.7 },
  { d: "M700 522 C 652 540, 600 532, 558 566 C 520 596, 460 590, 426 624", carrier: true, reverse: true, w: 0.8 },
  { d: "M558 566 C 566 612, 540 648, 562 692 C 578 724, 552 758, 572 792", w: 0.55 },
  { d: "M900 412 C 906 452, 884 492, 912 532 C 936 566, 910 604, 932 648", w: 0.7 },
  { d: "M912 532 C 960 548, 1012 540, 1052 574 C 1090 604, 1148 598, 1182 632", carrier: true, w: 0.8 },
  { d: "M470 512 C 462 552, 486 588, 466 628 C 450 660, 474 694, 458 736", w: 0.55 },
  { d: "M800 440 C 808 478, 786 512, 812 548 C 834 578, 810 612, 830 652", w: 0.6 },

  // ── fine secondary tendrils (texture, denser near soil) ──
  { d: "M150 366 C 160 392, 138 414, 156 442", w: 0.45 },
  { d: "M360 384 C 372 408, 350 428, 366 456", w: 0.45 },
  { d: "M560 408 C 572 432, 548 452, 566 482", w: 0.45 },
  { d: "M1040 422 C 1052 446, 1028 466, 1046 496", w: 0.45 },
  { d: "M330 470 C 366 478, 396 466, 430 482", w: 0.4 },
  { d: "M620 446 C 654 454, 684 442, 718 458", w: 0.4 },
  { d: "M1052 574 C 1044 612, 1066 646, 1046 686", w: 0.45 },
  { d: "M244 648 C 280 656, 312 644, 348 660", w: 0.4 },
  { d: "M716 642 C 752 650, 784 638, 820 654", w: 0.4 },
  { d: "M120 540 C 156 548, 188 536, 224 552", w: 0.4 },
  { d: "M460 624 C 496 632, 528 620, 564 636", w: 0.4 },
  { d: "M860 560 C 896 568, 928 556, 964 572", w: 0.4 },

  // ── deep reconnection arcs (interweaving feel) ──
  { d: "M250 520 C 320 560, 420 540, 466 628", w: 0.5 },
  { d: "M700 600 C 760 640, 860 612, 912 648", w: 0.5 },
  { d: "M466 700 C 520 730, 600 712, 660 744", w: 0.45 },
];

/** Roots descending from a couple of trees into the network, tying the halves. */
const ROOTS: Filament[] = [
  { d: `M600 ${SOIL_Y - 8} C 596 380, 612 410, 600 440 C 590 466, 604 492, 596 524`, carrier: true, w: 0.7 },
  { d: `M245 ${SOIL_Y - 6} C 248 366, 236 392, 250 418 C 260 440, 246 466, 252 494`, w: 0.6 },
  { d: `M955 ${SOIL_Y - 6} C 952 366, 964 392, 950 418 C 940 440, 956 466, 948 498`, carrier: true, reverse: true, w: 0.6 },
];

const CARRIERS = FILAMENTS.filter((f) => f.carrier);

/** A glowing node travelling along one filament path via animateMotion. */
function Carrier({
  pathId,
  dur,
  begin,
  reverse,
}: {
  pathId: string;
  dur: number;
  begin: number;
  reverse?: boolean;
}) {
  const keyPoints = reverse ? "1;0" : "0;1";
  const motionProps = {
    dur: `${dur}s`,
    begin: `${begin}s`,
    repeatCount: "indefinite" as const,
    keyPoints,
    keyTimes: "0;1",
    calcMode: "linear" as const,
  };
  const fade = {
    attributeName: "opacity",
    values: "0;1;1;0",
    keyTimes: "0;0.1;0.88;1",
    dur: `${dur}s`,
    begin: `${begin}s`,
    repeatCount: "indefinite" as const,
  };
  return (
    <g filter="url(#node-glow)">
      <circle r="4.5" fill="#34d399" opacity="0.22">
        <animateMotion {...motionProps}>
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
      <circle r="2" fill="#6ee7b7">
        <animateMotion {...motionProps}>
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <animate {...fade} />
      </circle>
      <circle r="1" fill="#ecfdf5">
        <animateMotion {...motionProps}>
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <animate {...fade} />
      </circle>
    </g>
  );
}

export default function WhatItIsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  return (
    <section
      ref={ref}
      className="relative isolate flex h-screen w-full items-center justify-center overflow-hidden bg-[#0a0a0a]"
    >
      {/* ── Ambient depth glows ─────────────────────────────────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[62%] -z-10 h-[46rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]"
        animate={{
          background: [
            "radial-gradient(circle, rgba(52,211,153,0.15), transparent 62%)",
            "radial-gradient(circle, rgba(45,212,191,0.15), transparent 62%)",
            "radial-gradient(circle, rgba(34,211,238,0.12), transparent 62%)",
            "radial-gradient(circle, rgba(52,211,153,0.15), transparent 62%)",
          ],
          scale: [1, 1.06, 1.02, 1],
        }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── The cross-section: trees + soil + mycelium ──────────────────── */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
        fill="none"
      >
        <defs>
          {/* tree silhouette: near-black with a barely-there cool tint */}
          <linearGradient id="tree-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1512" />
            <stop offset="65%" stopColor="#0b0f0d" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          {/* faint emerald backlight behind the tree-line */}
          <radialGradient id="dusk-glow" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.14" />
            <stop offset="55%" stopColor="#0f766e" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
          </radialGradient>
          {/* soil haze: soft transition, no hard line */}
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0" />
            <stop offset="45%" stopColor="#0c1411" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#0c1411" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
          </linearGradient>
          {/* mycelium stroke gradient: glows mid-strand, fades at edges */}
          <linearGradient id="hypha" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="root" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
          </linearGradient>
          <filter id="node-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* dusk backlight behind tree-line */}
        <rect x="0" y="0" width="1200" height={SOIL_Y + 40} fill="url(#dusk-glow)" />

        {/* ── ABOVE GROUND: tree-line silhouettes ── */}
        <g filter="url(#soft)">
          {TREES.map((t, i) => (
            <motion.g
              key={`tree-${i}`}
              transform={`translate(${t.x} ${SOIL_Y + 6}) scale(${t.scale})`}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 1.3, delay: 0.1 + i * 0.07, ease }}
              style={{ originX: 0.5, originY: 1 }}
            >
              <motion.g
                animate={{ rotate: [0, t.sway % 2 === 0 ? 0.7 : -0.7, 0] }}
                transition={{
                  duration: 9 + t.sway,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ originX: 0.5, originY: 1 }}
              >
                <TreeShape />
                {/* faint emerald rim along the canopy crown */}
                <path
                  d="M-22 -276 C 2 -300 40 -300 64 -276 C 104 -286 142 -252 132 -212"
                  stroke="#34d399"
                  strokeOpacity="0.2"
                  strokeWidth="1"
                  fill="none"
                />
              </motion.g>
            </motion.g>
          ))}
        </g>

        {/* soil haze band over the trunks' base */}
        <rect x="0" y={SOIL_Y - 60} width="1200" height="140" fill="url(#soil)" />

        {/* ── BELOW GROUND: roots descending from trees ── */}
        {ROOTS.map((r, i) => (
          <motion.path
            key={`root-${i}`}
            id={`root-${i}`}
            d={r.d}
            stroke="url(#root)"
            strokeWidth={r.w ?? 0.6}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.8, delay: 0.4 + i * 0.15, ease }}
          />
        ))}

        {/* ── BELOW GROUND: mycelium filaments (drawn on scroll-in) ── */}
        {FILAMENTS.map((f, i) => (
          <motion.path
            key={`fil-${i}`}
            id={`fil-${i}`}
            d={f.d}
            stroke="url(#hypha)"
            strokeWidth={f.w ?? 0.7}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 2.4, delay: 0.45 + i * 0.04, ease }}
          />
        ))}

        {/* glowing junction nodes at filament anchor points */}
        {[
          [250, 388], [392, 510], [700, 522], [558, 566], [912, 532],
          [470, 512], [690, 398], [900, 412], [800, 440], [466, 628],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={`node-${i}`}
            cx={cx}
            cy={cy}
            r="1.8"
            fill="#6ee7b7"
            filter="url(#node-glow)"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: [0.35, 0.85, 0.35] } : { opacity: 0 }}
            transition={{
              duration: 4 + (i % 4),
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1 + i * 0.2,
            }}
          />
        ))}

        {/* ── DATA TRANSFER: nodes travelling across the network ── */}
        {CARRIERS.map((f, i) => {
          const id = `fil-${FILAMENTS.indexOf(f)}`;
          return (
            <g key={`carrier-${i}`}>
              <Carrier pathId={id} dur={7 + (i % 3) * 1.4} begin={i * 0.9} reverse={f.reverse} />
              <Carrier pathId={id} dur={9 + (i % 3) * 1.2} begin={3 + i * 1.1} reverse={!f.reverse} />
            </g>
          );
        })}

        {/* ── DATA TRANSFER: nodes climbing UP through roots to the trees ── */}
        {ROOTS.filter((r) => r.carrier).map((r, i) => (
          <Carrier
            key={`rootcar-${i}`}
            pathId={`root-${ROOTS.indexOf(r)}`}
            dur={6 + i}
            begin={2 + i * 1.5}
            reverse={!r.reverse}
          />
        ))}
      </svg>

      {/* Feather top & bottom into #0a0a0a so it blends with neighbors */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#0a0a0a] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent"
      />

      {/* ── Content: seated in the clear band near the soil line ───────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center"
      >
        {/* dark scrim so copy stays readable over the network */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgba(10,10,10,0.92),rgba(10,10,10,0.7)_55%,transparent_80%)] blur-md"
        />

        <motion.div variants={rise}>
          <span className="inline-flex items-center rounded-full border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.32em] text-emerald-200/80 backdrop-blur-sm">
            What it is
          </span>
        </motion.div>

        <motion.h2
          variants={rise}
          className="mt-6 text-balance text-4xl font-medium leading-[1.05] tracking-tight text-white sm:text-5xl md:text-[3.4rem]"
        >
          A living shared memory
          <br className="hidden sm:block" /> for AI agents.
        </motion.h2>

        <motion.p
          variants={rise}
          className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-white/60 md:text-base"
        >
          In a forest, no tree grows alone. Underground, a mycelium network lets
          every tree share what it learns. Today, every AI agent grows by
          itself, re-solving what other agents already solved.{" "}
          <span className="text-white/80">Mycelium lets them grow together.</span>
        </motion.p>

        <motion.div variants={rise} className="mt-7 flex flex-col items-center">
          <span
            aria-hidden
            className="mb-5 h-px w-20 bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent"
          />
          <p className="max-w-xl text-pretty text-[14px] leading-relaxed text-white/75 md:text-[15px]">
            An{" "}
            <span className="font-medium text-emerald-200/90">MCP server</span>{" "}
            you install anywhere, so every agent can publish what it learns and
            reuse what others already have.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
