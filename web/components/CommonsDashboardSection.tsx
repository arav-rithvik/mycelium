"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useInView, type Variants } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease },
  },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

/* ──────────────────────────────────────────────────────────────────────────
 * The public skill commons. Self-contained for the demo (no live backend in
 * this branch) — these are the seeded "hero" skills, the ones every agent can
 * already reach. The catalog grows each time an agent publishes a new one.
 * ────────────────────────────────────────────────────────────────────────── */
type Skill = {
  name: string;
  category: string;
  framework: string;
  description: string;
  successCheck: string;
  trust: number;
  successCount: number;
  failureCount: number;
  reuses: number;
  envs: string[];
  savedPerReuse: string;
};

const SKILLS: Skill[] = [
  {
    name: "nextjs-supabase-auth",
    category: "Auth",
    framework: "Next.js",
    description:
      "Wire Supabase auth into a Next.js App Router app — @supabase/ssr, a PKCE callback route, and middleware that refreshes the session.",
    successCheck: "GET /auth/callback → 302  (session set)",
    trust: 0.93,
    successCount: 142,
    failureCount: 9,
    reuses: 1240,
    envs: ["Next.js 15", "Node 20", "Supabase JS 2"],
    savedPerReuse: "18.4k tokens",
  },
  {
    name: "stripe-webhooks-verify",
    category: "Payments",
    framework: "Node",
    description:
      "Verify Stripe webhook signatures correctly and process events idempotently, so retries can never double-charge.",
    successCheck: "constructEvent verifies sig · bad sig → 400",
    trust: 0.88,
    successCount: 96,
    failureCount: 13,
    reuses: 870,
    envs: ["Node 20", "stripe 14"],
    savedPerReuse: "22.1k tokens",
  },
  {
    name: "tailwind-dark-mode",
    category: "UI",
    framework: "Tailwind",
    description:
      "Add class-based dark mode with a persisted toggle and zero flash-of-wrong-theme on the first paint.",
    successCheck: "html.dark toggles · no FOUC on reload",
    trust: 0.96,
    successCount: 231,
    failureCount: 8,
    reuses: 2010,
    envs: ["Tailwind 4", "Next.js 15", "React 19"],
    savedPerReuse: "6.2k tokens",
  },
  {
    name: "dockerize-nextjs-standalone",
    category: "DevOps",
    framework: "Docker",
    description:
      "Multi-stage Dockerfile for Next.js standalone output — small final image, non-root user, built-in health check.",
    successCheck: "image builds · container responds 200",
    trust: 0.91,
    successCount: 88,
    failureCount: 8,
    reuses: 760,
    envs: ["Next.js 15", "Docker 27"],
    savedPerReuse: "9.8k tokens",
  },
  {
    name: "openai-streaming-responses",
    category: "AI",
    framework: "AI SDK",
    description:
      "Stream model tokens to the UI over SSE with backpressure and clean abort handling, no dropped chunks.",
    successCheck: "tokens stream incrementally · abort cancels",
    trust: 0.79,
    successCount: 51,
    failureCount: 14,
    reuses: 430,
    envs: ["Next.js 15", "ai-sdk 4"],
    savedPerReuse: "14.0k tokens",
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(SKILLS.map((s) => s.category)))];

/* trust → tailwind text/bar colours (a low score leans amber, echoing
   "trust can fall" from the features above). */
function trustTone(t: number) {
  if (t >= 0.9) return { text: "text-emerald-300", bar: "bg-emerald-400/80" };
  if (t >= 0.85) return { text: "text-emerald-200", bar: "bg-emerald-400/60" };
  return { text: "text-amber-300", bar: "bg-amber-400/70" };
}

/* ── icons ─────────────────────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── trust pill with a tiny fill bar ───────────────────────────────────── */
function TrustBadge({ trust, compact }: { trust: number; compact?: boolean }) {
  const tone = trustTone(trust);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-mono text-[12px] tabular-nums ${tone.text}`}>
        {trust.toFixed(2)}
      </span>
      <span className={`relative ${compact ? "h-1 w-10" : "h-1.5 w-16"} overflow-hidden rounded-full bg-white/10`}>
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${tone.bar}`}
          style={{ width: `${Math.round(trust * 100)}%` }}
        />
      </span>
    </span>
  );
}

/* ── the inspector card (right column) ─────────────────────────────────── */
function Inspector({ skill }: { skill: Skill }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmd = `get_skill("${skill.name}")`;
  const copy = () => {
    navigator.clipboard?.writeText(cmd).catch(() => {});
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] bg-emerald-400/[0.06] blur-3xl"
      />
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e0f0e] to-[#0a0b0a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
        {/* title bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.015] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]/90" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]/90" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]/90" />
          </div>
          <div className="flex flex-1 items-center justify-center gap-2">
            <span className="font-mono text-[11px] tracking-wide text-emerald-300/60">mycelium</span>
            <span className="text-white/15">·</span>
            <span className="font-mono text-[11px] tracking-wide text-white/35">get_skill</span>
          </div>
          <div className="h-3 w-[52px]" />
        </div>

        <div className="px-5 py-4">
          {/* name + category */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[15px] font-medium text-white">{skill.name}</span>
            <span className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.07] px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-emerald-200/90">
              {skill.category}
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-px font-mono text-[10px] text-white/45">
              {skill.framework}
            </span>
          </div>

          <p className="mt-3 text-[13.5px] leading-relaxed text-white/65">{skill.description}</p>

          {/* trust + reuses */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">Trust</div>
              <div className="mt-1.5">
                <TrustBadge trust={skill.trust} />
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] text-white/30">
                {skill.successCount}✓ · {skill.failureCount}✕ checks
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">Reuses</div>
              <div className="mt-1.5 font-mono text-[14px] tabular-nums text-emerald-200/90">
                {skill.reuses.toLocaleString()}
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] text-white/30">
                ~{skill.savedPerReuse} saved each
              </div>
            </div>
          </div>

          {/* success_check */}
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">success_check</div>
            <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-[12px] text-white/70">
              <span className="select-none text-emerald-400/80">✓</span>
              <span className="text-pretty">{skill.successCheck}</span>
            </div>
          </div>

          {/* proven envs */}
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">Proven on</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {skill.envs.map((e) => (
                <span
                  key={e}
                  className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-0.5 font-mono text-[11px] text-emerald-100/80"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* copy the tool call */}
          <button
            type="button"
            onClick={copy}
            className="group mt-4 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-emerald-400/30"
          >
            <span className="font-mono text-[12px] text-white/70">
              <span className="text-emerald-400/70">›</span> {cmd}
            </span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10px] tracking-wide ${
                copied ? "text-emerald-300" : "text-white/40 group-hover:text-emerald-200/80"
              }`}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
export default function CommonsDashboardSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(SKILLS[0].name);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILLS.filter((s) => {
      const inCat = category === "All" || s.category === category;
      const inQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.framework.toLowerCase().includes(q);
      return inCat && inQ;
    });
  }, [query, category]);

  // the inspector follows the selection, falling back to the first visible row.
  const selectedSkill =
    SKILLS.find((s) => s.name === selected && filtered.includes(s)) ?? filtered[0] ?? null;

  const avgTrust = SKILLS.reduce((a, s) => a + s.trust, 0) / SKILLS.length;
  const totalReuses = SKILLS.reduce((a, s) => a + s.reuses, 0);

  return (
    <section
      data-snap
      ref={ref}
      className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-transparent py-20"
    >
      {/* ambient glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[44rem] w-[58rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
        animate={{ opacity: [0.5, 0.72, 0.5], scale: [1, 1.04, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.11), transparent 64%)" }}
      />
      {/* dotted texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(rgba(52,211,153,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 80% 72% at 50% 50%, black, transparent 82%)",
        }}
      />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-10 px-6 md:grid-cols-[1.2fr_0.8fr] md:gap-12">
        {/* ── LEFT: catalog ──────────────────────────────────────────────── */}
        <motion.div variants={container} initial="hidden" animate={inView ? "show" : "hidden"} className="flex flex-col">
          <motion.h2
            variants={rise}
            className="text-balance text-3xl font-medium leading-[1.05] tracking-tight text-white sm:text-4xl"
          >
            Every skill Claude can reach.
          </motion.h2>

          <motion.p variants={rise} className="mt-4 max-w-lg text-pretty text-[14px] leading-relaxed text-white/55">
            The public skill database. Search it, see each skill&apos;s trust and where it&apos;s proven — and watch it grow every time an agent solves something new.
          </motion.p>

          {/* stats */}
          <motion.div variants={rise} className="mt-5 flex flex-wrap gap-2">
            {[
              { k: `${SKILLS.length} skills`, sub: "live now" },
              { k: avgTrust.toFixed(2), sub: "avg trust" },
              { k: totalReuses.toLocaleString(), sub: "reuses" },
            ].map((s) => (
              <div key={s.sub} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-1.5">
                <span className="font-mono text-[13px] font-medium tabular-nums text-emerald-200/90">{s.k}</span>{" "}
                <span className="font-mono text-[10.5px] uppercase tracking-wide text-white/35">{s.sub}</span>
              </div>
            ))}
          </motion.div>

          {/* search */}
          <motion.div variants={rise} className="mt-5">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.02] px-3 py-2.5 transition-colors focus-within:border-emerald-400/40">
              <span className="text-white/35">
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skills — try “auth”, “stripe”, “dark mode”…"
                className="w-full bg-transparent font-mono text-[13px] text-white/85 placeholder:text-white/25 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="font-mono text-[11px] text-white/30 hover:text-white/60"
                >
                  clear
                </button>
              )}
            </div>

            {/* category pills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide transition-colors ${
                      active
                        ? "border-emerald-400/40 bg-emerald-400/[0.12] text-emerald-200"
                        : "border-white/10 bg-white/[0.02] text-white/45 hover:border-emerald-400/25 hover:text-emerald-200/80"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* skill list — native-scrolls without triggering the page snap */}
          <motion.div
            variants={rise}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="mt-4 max-h-[38vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
          >
            {filtered.map((s) => {
              const active = selectedSkill?.name === s.name;
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSelected(s.name)}
                  className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    active
                      ? "border-emerald-400/35 bg-emerald-400/[0.06]"
                      : "border-white/[0.07] bg-white/[0.015] hover:border-emerald-400/25 hover:bg-emerald-400/[0.03]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-[13px] font-medium text-white/90">{s.name}</span>
                      <span className="flex-none rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9.5px] uppercase tracking-wide text-white/40">
                        {s.category}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[12px] text-white/45">{s.description}</div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <TrustBadge trust={s.trust} compact />
                    <span className="font-mono text-[10px] text-white/30">{s.reuses.toLocaleString()} reuses</span>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-white/40">
                No skills match “{query}” yet — but the commons is always growing.
              </div>
            )}

            {/* growth hint */}
            {filtered.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-emerald-400/15 bg-emerald-400/[0.015] px-3.5 py-2.5 text-[12px] text-white/40">
                <span className="font-mono text-emerald-300/70">+</span>
                New skills appear here the moment an agent publishes one to the commons.
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* ── RIGHT: inspector ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 22 }}
          animate={inView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.96, y: 22 }}
          transition={{ duration: 0.9, ease, delay: 0.2 }}
          className="w-full md:sticky md:top-24"
        >
          {selectedSkill ? (
            <Inspector skill={selectedSkill} />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center text-[13px] text-white/40">
              Select a skill to inspect it.
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
