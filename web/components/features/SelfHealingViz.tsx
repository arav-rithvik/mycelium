"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * "It heals on contact."
 *
 * A horizontal timeline of dependency versions. Early versions are lit green
 * (proven). The next version is unknown. An agent arrives, re-confirms the
 * skill, and on SUCCESS the proven range STRETCHES right to swallow it. On
 * FAILURE the skill node WILTS, drains to red, and is PRUNED from the network,
 * tagging the range "broken on vNN". No curator, no re-verification cron.
 */

const EMERALD = "#34d399";
const EMERALD_SOFT = "#6ee7b7";
const RED = "#f87171";

const VERSIONS = ["v17", "v18", "v19", "v20", "v21", "v22"];

// Everything lives inside a 100x100 viewBox. Keep a comfortable safe inset so
// nothing (bar, nodes, labels, captions, agent) ever touches the square edge.
const TRACK_X0 = 16;
const TRACK_X1 = 84;
const TRACK_Y = 52;

const SLOT_X = (i: number) =>
  TRACK_X0 + (i / (VERSIONS.length - 1)) * (TRACK_X1 - TRACK_X0);

type Phase =
  | "idle" // waiting at current boundary
  | "arrive" // agent drops onto target
  | "checking" // scan ring spins
  | "heal" // success: boundary glides
  | "settle" // brief hold post-heal
  | "wilt" // failure: node drains to red
  | "prune"; // node fades out, tagged broken

export default function SelfHealingViz() {
  // provenIndex = highest version index currently inside the proven envelope.
  const [provenIndex, setProvenIndex] = useState(2); // v17..v19 proven
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetIndex, setTargetIndex] = useState(3); // the version under test
  const [outcome, setOutcome] = useState<"pass" | "fail">("pass");
  const [brokenIndex, setBrokenIndex] = useState<number | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const list = timers.current;
    const after = (ms: number, fn: () => void) => {
      list.push(setTimeout(fn, ms));
    };

    // Alternate heal / prune. Two heals, then a prune, then reset.
    let healsDone = 0;

    const reset = () => {
      setProvenIndex(2);
      setBrokenIndex(null);
      setTargetIndex(3);
      setOutcome("pass");
      setPhase("idle");
      after(900, () => runCycle(3, "pass"));
    };

    const runCycle = (target: number, result: "pass" | "fail") => {
      setTargetIndex(target);
      setOutcome(result);
      setPhase("arrive");
      after(950, () => setPhase("checking"));
      after(2350, () => {
        if (result === "pass") {
          setPhase("heal");
          after(1150, () => setProvenIndex(target));
          after(1500, () => setPhase("settle"));
          after(2700, () => {
            healsDone += 1;
            if (healsDone >= 2) {
              // Next beat is a prune on the version after the new boundary.
              runCycle(target + 1, "fail");
            } else {
              runCycle(target + 1, "pass");
            }
          });
        } else {
          setPhase("wilt");
          after(1200, () => {
            setPhase("prune");
            setBrokenIndex(target);
          });
          after(3100, () => reset());
        }
      });
    };

    after(900, () => runCycle(3, "pass"));
    return () => {
      list.forEach(clearTimeout);
      list.length = 0;
    };
  }, []);

  const provenRight = SLOT_X(provenIndex);
  const targetX = SLOT_X(targetIndex);
  const checking = phase === "checking";
  const healing = phase === "heal" || phase === "settle";
  const failing = phase === "wilt" || phase === "prune";
  const agentVisible =
    phase === "arrive" || phase === "checking" || phase === "wilt";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="sh-proven" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={EMERALD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={EMERALD_SOFT} stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="sh-edge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EMERALD_SOFT} stopOpacity="0.9" />
            <stop offset="100%" stopColor={EMERALD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sh-edge-red" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RED} stopOpacity="0.85" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sh-grid-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="62%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="sh-grid"
            width="9"
            height="9"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M9 0 H0 V9"
              fill="none"
              stroke="rgba(52,211,153,0.5)"
              strokeWidth="0.15"
            />
          </pattern>
          <mask id="sh-grid-mask">
            <rect x="0" y="0" width="100" height="100" fill="url(#sh-grid-fade)" />
          </mask>
        </defs>

        {/* faint grid atmosphere — radially faded, no hard rectangle */}
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="url(#sh-grid)"
          mask="url(#sh-grid-mask)"
          opacity={0.4}
        />

        {/* base track */}
        <rect
          x={TRACK_X0}
          y={TRACK_Y - 1.6}
          width={TRACK_X1 - TRACK_X0}
          height={3.2}
          rx={1.6}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.25}
        />

        {/* proven range fill — boundary glides on provenIndex change */}
        <motion.rect
          y={TRACK_Y - 1.6}
          height={3.2}
          rx={1.6}
          fill="url(#sh-proven)"
          x={TRACK_X0}
          initial={false}
          animate={{ width: provenRight - TRACK_X0 }}
          transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* glow that rides the moving boundary */}
        <motion.circle
          cy={TRACK_Y}
          fill="url(#sh-edge)"
          initial={false}
          animate={{
            cx: provenRight,
            r: healing ? 4.2 : 2.4,
            opacity: healing ? 1 : 0.55,
          }}
          transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* version slots */}
        {VERSIONS.map((label, i) => {
          const x = SLOT_X(i);
          const isProven = i <= provenIndex;
          const isBroken = brokenIndex === i;
          const isTarget = i === targetIndex && phase !== "idle";
          const nodeColor = isBroken
            ? RED
            : isProven
            ? EMERALD
            : "rgba(255,255,255,0.28)";
          return (
            <g key={label}>
              {/* tick */}
              <line
                x1={x}
                y1={TRACK_Y - 4}
                x2={x}
                y2={TRACK_Y + 4}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={0.18}
              />
              {isProven && !isBroken && (
                <circle
                  cx={x}
                  cy={TRACK_Y}
                  r={3.4}
                  fill="url(#sh-edge)"
                  opacity={0.5}
                />
              )}
              {/* node dot */}
              <motion.circle
                cx={x}
                cy={TRACK_Y}
                initial={false}
                animate={{
                  r: isTarget ? 2.6 : 1.7,
                  fill: nodeColor,
                  opacity: isBroken && phase === "prune" ? 0.25 : 1,
                }}
                transition={{ duration: 0.5 }}
              />
              {/* version label */}
              <motion.text
                x={x}
                y={TRACK_Y + 9}
                textAnchor="middle"
                className="font-mono"
                style={{ fontSize: "3.4px", letterSpacing: "-0.05px" }}
                initial={false}
                animate={{
                  fill: isBroken
                    ? RED
                    : isProven
                    ? EMERALD_SOFT
                    : "rgba(255,255,255,0.32)",
                  opacity: isBroken && phase === "prune" ? 0.55 : 1,
                }}
                transition={{ duration: 0.5 }}
              >
                {label}
              </motion.text>
            </g>
          );
        })}

        {/* checking scan ring at target */}
        <AnimatePresence>
          {checking && (
            <motion.circle
              key="scan"
              cx={targetX}
              cy={TRACK_Y}
              r={5}
              fill="none"
              stroke={EMERALD_SOFT}
              strokeWidth={0.6}
              strokeDasharray="6 24"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.3 },
                rotate: { duration: 1.1, repeat: Infinity, ease: "linear" },
              }}
              style={{
                originX: "50%",
                originY: "50%",
                transformBox: "fill-box",
              }}
            />
          )}
        </AnimatePresence>

        {/* agent token that drops onto the target */}
        <AnimatePresence>
          {agentVisible && (
            <motion.g
              key={`agent-${targetIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.g
                initial={{ y: -22 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <rect
                  x={targetX - 0.18}
                  y={TRACK_Y - 13}
                  width={0.36}
                  height={7}
                  fill={`url(${failing ? "#sh-edge-red" : "#sh-edge"})`}
                  opacity={0.6}
                />
                <circle
                  cx={targetX}
                  cy={TRACK_Y - 13}
                  r={2.6}
                  fill="url(#sh-edge)"
                  opacity={failing ? 0 : 0.5}
                />
                <circle
                  cx={targetX}
                  cy={TRACK_Y - 13}
                  r={1.1}
                  fill={failing ? RED : EMERALD_SOFT}
                />
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* failure prune scatter */}
        <AnimatePresence>
          {phase === "prune" && brokenIndex !== null && (
            <motion.g
              key="prune"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[0, 1, 2, 3, 4].map((k) => {
                const ang = (k / 5) * Math.PI * 2;
                return (
                  <motion.circle
                    key={k}
                    cx={SLOT_X(brokenIndex)}
                    cy={TRACK_Y}
                    r={0.7}
                    fill={RED}
                    initial={{ opacity: 0.9 }}
                    animate={{
                      cx: SLOT_X(brokenIndex) + Math.cos(ang) * 6,
                      cy: TRACK_Y + Math.sin(ang) * 6,
                      opacity: 0,
                    }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* status caption (above track) */}
        <AnimatePresence mode="wait">
          <motion.g
            key={phase + targetIndex}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.4 }}
          >
            <StatusLine phase={phase} target={VERSIONS[targetIndex]} />
          </motion.g>
        </AnimatePresence>

        {/* range tag (below track) */}
        <AnimatePresence mode="wait">
          <motion.g
            key={
              brokenIndex !== null
                ? `broken-${brokenIndex}`
                : `proven-${provenIndex}`
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <RangeTag
              broken={brokenIndex !== null}
              text={
                brokenIndex !== null
                  ? `broken on ${VERSIONS[brokenIndex]}`
                  : `proven ${VERSIONS[0]} to ${VERSIONS[provenIndex]}`
              }
            />
          </motion.g>
        </AnimatePresence>
      </svg>
    </div>
  );
}

function StatusLine({ phase, target }: { phase: Phase; target: string }) {
  let text = "";
  let tone: "neutral" | "good" | "bad" = "neutral";
  switch (phase) {
    case "arrive":
      text = `AGENT ON ${target.toUpperCase()}`;
      tone = "neutral";
      break;
    case "checking":
      text = "UNPROVEN, RE-CONFIRM";
      tone = "neutral";
      break;
    case "heal":
    case "settle":
      text = "SKILL CONFIRMED, ENVELOPE WIDENED";
      tone = "good";
      break;
    case "wilt":
      text = "SKILL FAILED, PRUNING";
      tone = "bad";
      break;
    case "prune":
      text = "REMOVED FROM NETWORK";
      tone = "bad";
      break;
    default:
      text = "ENVELOPE HOLDING";
      tone = "good";
  }
  const color =
    tone === "good"
      ? EMERALD_SOFT
      : tone === "bad"
      ? RED
      : "rgba(255,255,255,0.55)";
  // Dot + text centered at the top of the safe area.
  const cx = 50;
  const cy = 26;
  return (
    <g>
      <circle cx={cx - text.length * 0.92 - 2.4} cy={cy - 1.05} r={0.85} fill={color} />
      <text
        x={cx + 1.2}
        y={cy}
        textAnchor="middle"
        className="font-mono"
        style={{
          fontSize: "3.4px",
          letterSpacing: "0.7px",
          fill: color,
        }}
      >
        {text}
      </text>
    </g>
  );
}

function RangeTag({ broken, text }: { broken: boolean; text: string }) {
  const stroke = broken ? "rgba(248,113,113,0.4)" : "rgba(52,211,153,0.35)";
  const bg = broken ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)";
  const color = broken ? RED : EMERALD_SOFT;
  const cy = 74;
  const w = Math.min(64, text.length * 2.05 + 8);
  return (
    <g>
      <rect
        x={50 - w / 2}
        y={cy - 3.2}
        width={w}
        height={6.4}
        rx={3.2}
        fill={bg}
        stroke={stroke}
        strokeWidth={0.25}
      />
      <text
        x={50}
        y={cy + 1.15}
        textAnchor="middle"
        className="font-mono"
        style={{ fontSize: "3.2px", letterSpacing: "0.4px", fill: color }}
      >
        {text}
      </text>
    </g>
  );
}
