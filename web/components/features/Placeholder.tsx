"use client";

import { motion } from "motion/react";

/** Temporary stand-in until each feature's signature animation lands. */
export default function Placeholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.4),transparent_70%)]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute font-mono text-xs uppercase tracking-[0.3em] text-emerald-300/50">
        visual
      </span>
    </div>
  );
}
