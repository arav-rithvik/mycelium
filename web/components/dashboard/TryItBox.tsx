"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CATEGORY_COLOR } from "@/lib/impact";

type SkillMatch = {
  id: string;
  name: string;
  description: string;
  category: string;
  trust_score: number;
  similarity: number;
  compatibility: number;
  projected_savings: {
    tokens: number;
    energyWh: number;
    waterMl: number;
    co2g: number;
  };
};

type Status = "idle" | "loading" | "done" | "error";

const EXAMPLE_CHIPS = [
  "set up Supabase auth in a Next.js app",
  "add Stripe checkout",
  "containerize with Docker",
  "write Playwright e2e tests",
];

function categoryColor(category: string): string {
  return CATEGORY_COLOR[category] ?? CATEGORY_COLOR.other;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}

export default function TryItBox() {
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [matches, setMatches] = useState<SkillMatch[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function runSearch(rawQuery: string) {
    const q = rawQuery.trim();
    if (!q || status === "loading") return;

    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        throw new Error(`Search returned ${res.status}`);
      }

      const data: { matches?: SkillMatch[] } = await res.json();
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setStatus("done");
    } catch {
      setMatches([]);
      setErrorMsg(
        "Couldn't reach the commons right now. The index may still be filling up — try again in a moment."
      );
      setStatus("error");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  function handleChip(chip: string) {
    setQuery(chip);
    void runSearch(chip);
  }

  return (
    <section className="w-full max-w-3xl mx-auto">
      {/* Input card */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(52,211,153,0.25)] focus-within:border-emerald-400/50 focus-within:shadow-[0_8px_50px_-10px_rgba(52,211,153,0.45)] transition-all">
          <div className="flex flex-col sm:flex-row items-stretch gap-2 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="set up Supabase auth in a Next.js app"
              aria-label="Describe a task to search the commons"
              className="flex-1 bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 outline-none rounded-xl focus:ring-2 focus:ring-emerald-400/40"
            />
            <button
              type="submit"
              disabled={status === "loading" || !query.trim()}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-medium text-emerald-950 transition-all hover:bg-emerald-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <>
                  <span className="size-2 rounded-full bg-emerald-900/70 animate-pulse" />
                  Searching…
                </>
              ) : (
                "Search the commons"
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Example chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-white/40 self-center mr-1">Try:</span>
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChip(chip)}
            disabled={status === "loading"}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-200 disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-6" aria-live="polite">
        {status === "loading" && <LoadingState reduceMotion={!!reduceMotion} />}

        {status === "error" && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-6 text-center">
            <p className="text-sm text-amber-200/90">{errorMsg}</p>
          </div>
        )}

        {status === "done" && matches.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
            <p className="font-mono text-sm text-emerald-200/90">
              No skill yet — this is what publishing fills in.
            </p>
            <p className="mt-2 text-xs text-white/40">
              Be the first to teach the commons how to do this.
            </p>
          </div>
        )}

        {status === "done" && matches.length > 0 && (
          <ul className="flex flex-col gap-3">
            <AnimatePresence>
              {matches.map((m, i) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  index={i}
                  reduceMotion={!!reduceMotion}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}

function LoadingState({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-emerald-200/70 font-mono">
        searching the commons…
      </p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-24 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.02] via-emerald-400/[0.06] to-white/[0.02] ${
            reduceMotion ? "" : "animate-pulse"
          }`}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function MatchCard({
  match,
  index,
  reduceMotion,
}: {
  match: SkillMatch;
  index: number;
  reduceMotion: boolean;
}) {
  const color = categoryColor(match.category);
  const trustPct = clampPct(match.trust_score);
  const similarityPct = clampPct(match.similarity);

  return (
    <motion.li
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }
      }
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-colors hover:border-emerald-400/30"
    >
      {/* accent edge */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: color }}
      />

      <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-base font-semibold text-white truncate">
              {match.name}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                color,
                background: `${color}1a`,
                border: `1px solid ${color}40`,
              }}
            >
              {match.category}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-white/55 line-clamp-2">
            {match.description}
          </p>
        </div>

        {/* headline win */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-semibold text-emerald-300">
            saves ~{match.projected_savings.tokens.toLocaleString()} tokens
          </p>
          <p className="mt-0.5 font-mono text-xs text-white/40">
            {similarityPct}% match
          </p>
        </div>
      </div>

      {/* trust bar */}
      <div className="mt-3 flex items-center gap-3 pl-2">
        <span className="font-mono text-xs text-white/45 w-24 shrink-0">
          {match.trust_score.toFixed(2)} trust
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${trustPct}%` }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.6, delay: index * 0.07 + 0.15, ease: "easeOut" }
            }
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200"
          />
        </div>
        <span className="font-mono text-xs text-emerald-200/70 w-9 text-right shrink-0">
          {trustPct}%
        </span>
      </div>
    </motion.li>
  );
}
