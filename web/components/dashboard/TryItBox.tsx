"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";

/* ──────────────────────────────────────────────────────────────────────────
 * TryItBox — the judge-usable beat.
 *
 * Type a task → the commons finds a proven skill *by meaning* (real pgvector
 * semantic search via POST /api/search), and shows its trust + the savings a
 * reuse would unlock. Self-contained: does its own fetch, owns its own state.
 *
 * Aesthetic: matches the rest of the app exactly — near-black, emerald-only
 * accent at low opacity, mono/tabular numbers, glow-as-frame (inset hairline
 * box-shadow on a radial-masked layer, never a hard border), dotted texture,
 * and motion/react springs (stiffness 140 / damping 18) for scale/number
 * changes with a stagger-in reveal (opacity + y + blur → 0).
 * ────────────────────────────────────────────────────────────────────────── */

const ease = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 140, damping: 18, mass: 0.6 };

const EMERALD = "#34d399";
const EMERALD_LIGHT = "#6ee7b7";
const EMERALD_PALE = "#a7f3d0";

/* The exact response contract from /api/search. */
type Savings = { tokens: number; energyWh: number; waterMl: number; co2g: number };
type Match = {
  id: string;
  name: string;
  description: string;
  category: string;
  trust_score: number;
  similarity: number;
  projected_savings: Savings;
};
type SearchResponse = { matches: Match[] };

type Status = "idle" | "loading" | "results" | "empty" | "error";

const SUGGESTIONS = [
  "set up stripe webhooks in next.js",
  "supabase auth with the app router",
  "stream openai tokens to the ui",
  "dockerize a next.js app",
];

const ENVIRONMENT = {
  framework: "nextjs",
  frameworkVersion: "15",
  os: "darwin",
} as const;

/* trust → tone. >=0.9 emerald, else amber — same split the dashboard uses, so
   a glance at colour already tells you "proven" vs "still earning trust". */
function trustTone(t: number) {
  return t >= 0.9
    ? {
        text: "text-emerald-300",
        bar: "linear-gradient(90deg, rgba(52,211,153,0.9), rgba(110,231,183,0.95))",
        glow: "rgba(52,211,153,0.55)",
      }
    : {
        text: "text-amber-300",
        bar: "linear-gradient(90deg, rgba(251,191,36,0.85), rgba(252,211,77,0.95))",
        glow: "rgba(251,191,36,0.5)",
      };
}

/* compact human numbers for the savings line ("18.4k") */
function fmtTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

/* ── icons (inline SVG — no icon libraries) ─────────────────────────────── */
function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function SparkIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function LeafIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z" fill="currentColor" opacity={0.22} />
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M6 18C9 14 12 11 16 9" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

/* ── trust pill: number + tiny fill bar ─────────────────────────────────── */
function TrustPill({ trust }: { trust: number }) {
  const tone = trustTone(trust);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300/45">trust</span>
      <span className={`font-mono text-[12px] tabular-nums ${tone.text}`}>{trust.toFixed(2)}</span>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: tone.bar, boxShadow: `0 0 8px ${tone.glow}` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(trust * 100)}%` }}
          transition={{ ...SPRING, delay: 0.12 }}
        />
      </span>
    </span>
  );
}

/* ── one result card ────────────────────────────────────────────────────── */
const cardRise: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease } },
};

function MatchCard({ match, top }: { match: Match; top: boolean }) {
  const pct = Math.round(match.similarity * 100);
  const { projected_savings: s } = match;

  return (
    <motion.div variants={cardRise} className="relative">
      {/* #1 gets a brighter ambient bloom behind it */}
      {top && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[24px] blur-2xl"
          style={{ background: "radial-gradient(60% 80% at 30% 30%, rgba(52,211,153,0.16), transparent 70%)" }}
        />
      )}

      <div
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-[#0e0f0e] to-[#0a0b0a] px-4 py-3.5 backdrop-blur-sm"
        style={{
          borderColor: top ? "rgba(52,211,153,0.28)" : "rgba(255,255,255,0.08)",
          boxShadow: top
            ? "0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(110,231,183,0.16), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 30px 80px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* glow-as-frame: a hairline emerald inset, radially masked so it reads
            as light catching the edge rather than a drawn border. */}
        {top && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(110,231,183,0.18)",
              maskImage: "radial-gradient(120% 130% at 50% 0%, #000 45%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(120% 130% at 50% 0%, #000 45%, transparent 100%)",
            }}
          />
        )}

        <div className="relative">
          {/* header: rank · name · category · % match */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {top && (
                <span
                  className="flex-none rounded-md px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    color: "#06281c",
                    background: `linear-gradient(135deg, ${EMERALD}, ${EMERALD_PALE})`,
                    boxShadow: "0 0 14px rgba(52,211,153,0.45)",
                  }}
                >
                  best
                </span>
              )}
              <span
                className="truncate font-mono text-[13.5px] font-medium"
                style={top ? { color: EMERALD_PALE, textShadow: "0 0 12px rgba(110,231,183,0.4)" } : { color: "rgba(255,255,255,0.9)" }}
              >
                {match.name}
              </span>
              <span className="flex-none rounded border border-emerald-400/15 bg-emerald-400/[0.06] px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-emerald-200/80">
                {match.category}
              </span>
            </div>

            {/* % match — the headline number, glowing */}
            <span className="flex flex-none items-baseline gap-0.5">
              <span
                className="font-mono text-[16px] font-semibold tabular-nums leading-none"
                style={{ color: EMERALD_PALE, textShadow: "0 0 12px rgba(110,231,183,0.55)" }}
              >
                {pct}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300/45">% match</span>
            </span>
          </div>

          {/* one-line description */}
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-white/55">{match.description}</p>

          {/* footer: trust pill + savings */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.06] pt-2.5">
            <TrustPill trust={match.trust_score} />

            <div className="flex items-center gap-1.5">
              <span style={{ color: EMERALD_LIGHT }}>
                <LeafIcon />
              </span>
              <span className="font-mono text-[11.5px] tabular-nums text-emerald-200/85">
                saves ~{fmtTokens(s.tokens)} tokens
              </span>
              <span className="font-mono text-[10px] tabular-nums text-white/30">
                · {s.energyWh.toFixed(1)} Wh · {s.co2g.toFixed(1)} g CO2
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── loading skeleton: pulsing emerald hairlines, no spinner ─────────────── */
function SkeletonCard({ i }: { i: number }) {
  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0e0f0e] to-[#0a0b0a] px-4 py-3.5"
      animate={{ opacity: [0.45, 0.85, 0.45] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.14 }}
    >
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-40 rounded-full bg-emerald-400/[0.10]" />
        <div className="h-3.5 w-12 rounded-full bg-emerald-400/[0.10]" />
      </div>
      <div className="mt-3 h-2.5 w-[88%] rounded-full bg-white/[0.05]" />
      <div className="mt-2 h-2.5 w-[64%] rounded-full bg-white/[0.05]" />
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5">
        <div className="h-2.5 w-24 rounded-full bg-emerald-400/[0.08]" />
        <div className="h-2.5 w-28 rounded-full bg-emerald-400/[0.08]" />
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
export default function TryItBox() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [matches, setMatches] = useState<Match[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // abort an in-flight request if the user submits again — prevents a slow
  // earlier search from clobbering the fresher one (classic race condition).
  const inflight = useRef<AbortController | null>(null);

  const run = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;

    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;

    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, environment: ENVIRONMENT }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? `request failed (${res.status})`);
      }
      const data = (await res.json()) as SearchResponse;
      const top = (data.matches ?? []).slice(0, 4);
      setMatches(top);
      setStatus(top.length ? "results" : "empty");
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // superseded — ignore
      setErrorMsg((err as Error).message || "something went wrong");
      setStatus("error");
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(query);
  };

  const pickSuggestion = (s: string) => {
    setQuery(s);
    run(s);
  };

  const loading = status === "loading";

  return (
    <div className="relative isolate w-full max-w-2xl">
      {/* ambient radial bloom behind the whole box */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[26rem] w-[34rem] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.10), transparent 65%)" }}
      />
      {/* dotted texture, masked to an ellipse so it fades at the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgba(52,211,153,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 85% 70% at 50% 30%, black, transparent 84%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 50% 30%, black, transparent 84%)",
        }}
      />

      {/* ── search bar ───────────────────────────────────────────────────── */}
      <form onSubmit={onSubmit} className="relative">
        <div
          className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e0f0e] to-[#0a0b0a] px-4 py-3 backdrop-blur-sm transition-colors focus-within:border-emerald-400/40"
          style={{ boxShadow: "0 30px 80px -28px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <span className="text-emerald-300/45 transition-colors group-focus-within:text-emerald-300/80">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='try "set up stripe webhooks in next.js"…'
            spellCheck={false}
            autoComplete="off"
            aria-label="Search the skill commons by meaning"
            className="w-full bg-transparent font-mono text-[13px] text-white/85 placeholder:text-white/25 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex flex-none items-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-200 transition-all hover:border-emerald-400/45 hover:bg-emerald-400/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ boxShadow: "0 0 18px -6px rgba(52,211,153,0.5)" }}
          >
            <SparkIcon />
            search
          </button>
        </div>
      </form>

      {/* ── body: state machine ──────────────────────────────────────────── */}
      <div className="relative mt-4 min-h-[120px]">
        <AnimatePresence mode="wait">
          {/* IDLE — suggested chips + a hint */}
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="rounded-full border border-emerald-400/12 bg-emerald-400/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/55 transition-colors hover:border-emerald-400/30 hover:text-emerald-200/85"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-4 max-w-md text-[12px] leading-relaxed text-white/35">
                Describe a task in plain English. The commons matches it by{" "}
                <span className="text-emerald-200/75">meaning</span>, not keywords — then shows the
                proven skill and what reusing it would save.
              </p>
            </motion.div>
          )}

          {/* LOADING — pulsing skeletons */}
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2.5"
            >
              <div className="mb-1 flex items-center gap-2">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: EMERALD, boxShadow: `0 0 8px ${EMERALD}` }}
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-emerald-300/55">
                  searching the commons…
                </span>
              </div>
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} i={i} />
              ))}
            </motion.div>
          )}

          {/* RESULTS — staggered cards */}
          {status === "results" && (
            <motion.div
              key="results"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } }}
              className="space-y-2.5"
            >
              {matches.map((m, i) => (
                <MatchCard key={m.id} match={m} top={i === 0} />
              ))}
            </motion.div>
          )}

          {/* EMPTY — novel */}
          {status === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease }}
              className="rounded-2xl border border-dashed border-emerald-400/15 bg-emerald-400/[0.015] px-5 py-8 text-center"
            >
              <div className="font-mono text-[13px] text-emerald-200/80">nothing matched — this looks novel</div>
              <p className="mx-auto mt-2 max-w-sm text-[12px] leading-relaxed text-white/40">
                No proven skill is close enough in meaning yet. The first agent to solve this
                publishes it — and the next one reuses it for free.
              </p>
            </motion.div>
          )}

          {/* ERROR — graceful */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease }}
              className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.02] px-5 py-6 text-center"
            >
              <div className="font-mono text-[12.5px] text-amber-300/90">the search didn&apos;t go through</div>
              <p className="mx-auto mt-1.5 max-w-sm font-mono text-[11px] text-white/35">{errorMsg}</p>
              <button
                type="button"
                onClick={() => run(query)}
                className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-1.5 font-mono text-[11px] tracking-wide text-amber-200 transition-colors hover:border-amber-400/45"
              >
                try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* caption */}
      <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.2em] text-emerald-300/40">
        real pgvector semantic search · every reuse bumps the live counters above
      </p>
    </div>
  );
}
