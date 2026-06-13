"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/**
 * "Private by a keystroke": /mycelium off keeps a skill in your PRIVATE vault;
 * /mycelium on shares it to the public commons. You decide what leaves.
 *
 * Loop: a new skill node spawns inside a locked vault (left). When ON, the lock
 * pops, the node flies into the glowing commons network (right) and joins with a
 * pulse. Flips back OFF; the next node stays caged. Repeats forever.
 *
 * Layout note: everything lives in a 0..100 viewBox but is kept inside a padded
 * safe band (roughly x 8..92, y 20..72) so nothing clips against the square
 * edges or collides with the toggle row pinned near the bottom. The page applies
 * a global edge-fade mask, so this component stays transparent with no box.
 */

type Phase = "caged" | "unlocking" | "flying" | "joined" | "relocking";

// Public-commons node anchors (viewBox 0..100), clustered on the right but kept
// inside x<=88 / y in 24..64 so node radii + glow never reach the edges.
const COMMONS = [
  { x: 70, y: 28 },
  { x: 84, y: 40 },
  { x: 64, y: 46 },
  { x: 82, y: 58 },
  { x: 70, y: 64 },
];
const COMMONS_LINKS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 4],
];

// Where a freshly caged node sits inside the vault.
const VAULT = { x: 22, y: 46 };
// Landing slots in the commons each cycle (rotates through for variety),
// all kept well inside the safe band.
const LANDINGS = [
  { x: 74, y: 46 },
  { x: 76, y: 34 },
  { x: 68, y: 54 },
];

export default function PrivacyToggleViz() {
  const [phase, setPhase] = useState<Phase>("caged");
  const [cycle, setCycle] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        timers.current.push(setTimeout(res, ms));
      });

    let alive = true;

    async function run() {
      // Sequence one full loop, then bump the cycle to spawn the next node.
      while (alive) {
        setPhase("caged");
        await wait(1400);
        if (!alive) return;
        setPhase("unlocking");
        await wait(650);
        if (!alive) return;
        setPhase("flying");
        await wait(1000);
        if (!alive) return;
        setPhase("joined");
        await wait(1700);
        if (!alive) return;
        setPhase("relocking");
        await wait(650);
        if (!alive) return;
        setCycle((c) => c + 1);
        await wait(200);
      }
    }

    run();
    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const isOn = phase === "unlocking" || phase === "flying" || phase === "joined";
  const flown = phase === "flying" || phase === "joined";
  const landing = LANDINGS[cycle % LANDINGS.length];
  const accent = "#34d399";
  const accentSoft = "#6ee7b7";
  const vaultTone = "#64748b"; // cool slate for the private vault

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="pt-commons-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pt-link" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accentSoft} stopOpacity="0.7" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.25" />
          </linearGradient>
          <filter id="pt-soft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>

        {/* Commons glow halo (radius kept so it never reaches the square edge) */}
        <motion.circle
          cx="74"
          cy="46"
          r="20"
          fill="url(#pt-commons-glow)"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: flown ? [0.5, 0.9, 0.65] : [0.3, 0.45, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Commons links */}
        {COMMONS_LINKS.map(([a, b], i) => (
          <motion.line
            key={`l-${i}`}
            x1={COMMONS[a].x}
            y1={COMMONS[a].y}
            x2={COMMONS[b].x}
            y2={COMMONS[b].y}
            stroke="url(#pt-link)"
            strokeWidth={0.5}
            strokeLinecap="round"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.35,
            }}
          />
        ))}

        {/* New link drawn from the joined node into the web */}
        <AnimatePresence>
          {phase === "joined" && (
            <motion.line
              key={`join-${cycle}`}
              x1={landing.x}
              y1={landing.y}
              x2={COMMONS[2].x}
              y2={COMMONS[2].y}
              stroke={accentSoft}
              strokeWidth={0.7}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.85 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Commons nodes */}
        {COMMONS.map((n, i) => (
          <motion.circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r={1.9}
            fill={accent}
            initial={{ opacity: 0.7 }}
            animate={{
              opacity: [0.7, 1, 0.7],
              r: [1.7, 2.1, 1.7],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          />
        ))}

        {/* Join pulse ring when the node lands */}
        <AnimatePresence>
          {phase === "joined" && (
            <motion.circle
              key={`pulse-${cycle}`}
              cx={landing.x}
              cy={landing.y}
              fill="none"
              stroke={accentSoft}
              strokeWidth={0.8}
              initial={{ r: 2, opacity: 0.9 }}
              animate={{ r: 9, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* ---- Private vault (modest bordered slate box, part of the concept) ---- */}
        <g>
          {/* Vault body */}
          <motion.rect
            x="11"
            y="32"
            width="22"
            height="28"
            rx="3"
            fill="rgba(100,116,139,0.06)"
            stroke={vaultTone}
            strokeWidth={0.7}
            initial={{ opacity: 0.9 }}
            animate={{
              opacity: isOn ? 0.5 : 0.9,
              stroke: isOn ? accent : vaultTone,
            }}
            transition={{ duration: 0.5 }}
          />
          {/* Inner cage bars */}
          {[16, 20, 24, 28].map((gx) => (
            <motion.line
              key={`bar-${gx}`}
              x1={gx}
              y1="36"
              x2={gx}
              y2="56"
              stroke={vaultTone}
              strokeWidth={0.35}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: phase === "caged" ? 0.5 : 0.12 }}
              transition={{ duration: 0.5 }}
            />
          ))}

          {/* Lock icon centered on the vault's top edge */}
          <g>
            {/* Shackle: swings open when unlocking/on */}
            <motion.path
              d="M 19.5 31 a 2.5 2.5 0 0 1 5 0 v 2"
              fill="none"
              stroke={isOn ? accent : vaultTone}
              strokeWidth={0.8}
              strokeLinecap="round"
              style={{ originX: "19.5px", originY: "33px" }}
              animate={{ rotate: isOn ? -38 : 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            />
            {/* Lock body */}
            <motion.rect
              x="19"
              y="32.5"
              width="6"
              height="5"
              rx="1"
              initial={{ fill: "rgba(100,116,139,0.85)" }}
              animate={{
                fill: isOn ? "rgba(52,211,153,0.85)" : "rgba(100,116,139,0.85)",
              }}
              transition={{ duration: 0.4 }}
            />
            <rect x="21.6" y="34.2" width="0.8" height="1.8" rx="0.4" fill="#0a0a0a" />
          </g>
        </g>

        {/* ---- The skill node on its journey ---- */}
        <motion.g
          key={`skill-${cycle}`}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{
            x: flown ? landing.x - VAULT.x : 0,
            y: flown ? landing.y - VAULT.y : 0,
            opacity: 1,
          }}
          transition={{
            x: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.4 },
          }}
        >
          {/* Trailing glow as it flies */}
          <motion.circle
            cx={VAULT.x}
            cy={VAULT.y}
            r={3.2}
            fill={accent}
            filter="url(#pt-soft)"
            initial={{ opacity: 0.18 }}
            animate={{ opacity: flown ? 0.7 : phase === "caged" ? 0.18 : 0.4 }}
            transition={{ duration: 0.5 }}
          />
          <motion.circle
            cx={VAULT.x}
            cy={VAULT.y}
            r={2.1}
            initial={{ fill: "#94a3b8", opacity: 0.65 }}
            animate={{
              fill: flown ? accent : "#94a3b8",
              opacity: phase === "caged" ? 0.65 : 1,
            }}
            transition={{ duration: 0.5 }}
          />
          <circle cx={VAULT.x} cy={VAULT.y} r={0.8} fill="#0a0a0a" opacity={0.35} />
        </motion.g>
      </svg>

      {/* ---- Toggle switch + command labels ---- */}
      <div className="absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.18em]">
          <motion.span
            initial={{ opacity: 1, color: "#94a3b8" }}
            animate={{ opacity: isOn ? 0.35 : 1, color: isOn ? "#64748b" : "#94a3b8" }}
            transition={{ duration: 0.4 }}
          >
            /mycelium off
          </motion.span>

          {/* The switch */}
          <motion.div
            className="relative h-[18px] w-[40px] rounded-full border"
            initial={{
              backgroundColor: "rgba(100,116,139,0.12)",
              borderColor: "rgba(100,116,139,0.5)",
            }}
            animate={{
              backgroundColor: isOn ? "rgba(52,211,153,0.22)" : "rgba(100,116,139,0.12)",
              borderColor: isOn ? "rgba(52,211,153,0.7)" : "rgba(100,116,139,0.5)",
            }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="absolute top-1/2 h-[12px] w-[12px] -translate-y-1/2 rounded-full"
              initial={{
                left: "3px",
                backgroundColor: "#94a3b8",
                boxShadow: "0 0 0 rgba(0,0,0,0)",
              }}
              animate={{
                left: isOn ? "24px" : "3px",
                backgroundColor: isOn ? "#6ee7b7" : "#94a3b8",
                boxShadow: isOn
                  ? "0 0 8px rgba(110,231,183,0.9)"
                  : "0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.div>

          <motion.span
            initial={{ opacity: 0.35, color: "#64748b" }}
            animate={{ opacity: isOn ? 1 : 0.35, color: isOn ? "#6ee7b7" : "#64748b" }}
            transition={{ duration: 0.4 }}
          >
            /mycelium on
          </motion.span>
        </div>

        <motion.span
          key={isOn ? "on-cap" : "off-cap"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-mono text-[9px] uppercase tracking-[0.3em] text-emerald-300/60"
        >
          {isOn ? "shared to commons" : "private library"}
        </motion.span>
      </div>
    </div>
  );
}
