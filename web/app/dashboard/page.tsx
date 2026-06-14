"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ImpactTicker from "@/components/dashboard/ImpactTicker";
import ScaledImpactPanel from "@/components/dashboard/ScaledImpactPanel";
import SkillNetworkGraph from "@/components/dashboard/SkillNetworkGraph";
import TryItBox from "@/components/dashboard/TryItBox";
import LiveImpactToast from "@/components/LiveImpactToast";

type Stats = {
  id: number;
  total_tokens_saved: number;
  total_energy_wh: number;
  total_water_ml: number;
  total_co2_g: number;
  total_reuses: number;
  updated_at: string;
};
type Skill = {
  id: string;
  name: string;
  category: string;
  trust_score: number;
  success_count?: number;
  tokens_to_create?: number;
};
type Trail = {
  id: string;
  skill_id: string;
  success: boolean;
  tokens_saved: number;
  timestamp: string;
};

// ── Demo fallback so the dashboard is alive before the backend is seeded ──────
const DEMO_STATS: Stats = {
  id: 1,
  total_tokens_saved: 2_400_000,
  total_energy_wh: 1_100_000, // 1.1 MWh
  total_water_ml: 18_200_000, // 18,200 L
  total_co2_g: 412_000, // 412 kg
  total_reuses: 1240,
  updated_at: "",
};
const DEMO_SKILLS: Skill[] = [
  { id: "d1", name: "nextjs-supabase-auth", category: "auth", trust_score: 0.93 },
  { id: "d2", name: "stripe-checkout-session", category: "payments", trust_score: 0.89 },
  { id: "d3", name: "node-docker-multistage", category: "devops", trust_score: 0.96 },
  { id: "d4", name: "prisma-postgres-setup", category: "database", trust_score: 0.91 },
  { id: "d5", name: "react-query-setup", category: "frontend", trust_score: 0.88 },
  { id: "d6", name: "fastapi-jwt-auth", category: "auth", trust_score: 0.9 },
  { id: "d7", name: "tailwind-shadcn-init", category: "frontend", trust_score: 0.94 },
  { id: "d8", name: "vitest-config", category: "testing", trust_score: 0.92 },
  { id: "d9", name: "openai-streaming-route", category: "api", trust_score: 0.87 },
  { id: "d10", name: "redis-rate-limit", category: "api", trust_score: 0.85 },
  { id: "d11", name: "github-actions-ci", category: "devops", trust_score: 0.9 },
  { id: "d12", name: "s3-presigned-upload", category: "api", trust_score: 0.86 },
];
const DEMO_TRAILS: Trail[] = DEMO_SKILLS.slice(0, 8).map((s, i) => ({
  id: `dt${i}`,
  skill_id: s.id,
  success: true,
  tokens_saved: 9000 + i * 1500,
  timestamp: "",
}));

const statsAreEmpty = (s: Stats | null) =>
  !s || (s.total_tokens_saved === 0 && s.total_reuses === 0);

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(DEMO_STATS);
  const [skills, setSkills] = useState<Skill[]>(DEMO_SKILLS);
  const [trails, setTrails] = useState<Trail[]>(DEMO_TRAILS);
  const [live, setLive] = useState(false);
  const liveRef = useRef(false);

  // Initial load from the API routes; fall back to demo data when empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, kRes, tRes] = await Promise.all([
          fetch("/api/stats").then((r) => r.json()).catch(() => null),
          fetch("/api/skills").then((r) => r.json()).catch(() => null),
          fetch("/api/trails?limit=50").then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        const realStats: Stats | null = sRes?.stats ?? null;
        const realSkills: Skill[] = kRes?.skills ?? [];
        const realTrails: Trail[] = tRes?.trails ?? [];
        const hasData = realSkills.length > 0 || !statsAreEmpty(realStats);
        if (hasData) {
          liveRef.current = true;
          setLive(true);
          if (realStats) setStats(realStats);
          if (realSkills.length) setSkills(realSkills);
          if (realTrails.length) setTrails(realTrails);
        }
      } catch {
        /* keep demo data */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime: stats bumps, new skills bloom, new reuse edges pulse.
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stats" },
        (p) => {
          goLive();
          setStats(p.new as Stats);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "skills" },
        (p) => {
          const row = p.new as Skill;
          if (!row?.id) return;
          goLive();
          setSkills((prev) => {
            const base = liveRef.current ? prev : [];
            if (base.some((s) => s.id === row.id)) {
              return base.map((s) => (s.id === row.id ? row : s));
            }
            return [...base, row];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trails" },
        (p) => {
          const row = p.new as Trail;
          goLive();
          setTrails((prev) => [row, ...(liveRef.current ? prev : [])].slice(0, 60));
        },
      )
      .subscribe();

    function goLive() {
      if (!liveRef.current) {
        liveRef.current = true;
        setLive(true);
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#070908] text-white">
      {/* vibrant dark backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0a0e0c_0%,#070908_55%,#0a0e0c_100%)]" />
        <div className="absolute -left-[10%] top-[2%] h-[60vh] w-[55vw] rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.10),transparent_60%)] blur-[130px]" />
        <div className="absolute right-[-10%] top-[45%] h-[60vh] w-[55vw] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.07),transparent_62%)] blur-[140px]" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-14 md:px-10 md:py-20">
        {/* header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-mono text-sm text-white/50 transition-colors hover:text-emerald-300">
              ← mycelium
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {live ? "live" : "demo data"}
            </span>
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-6xl">
            The commons,{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              live.
            </span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-white/55 md:text-lg">
            Every reuse is inference that never had to happen. This is the running
            total — tokens, energy, water, and carbon saved by agents reusing
            proven skills instead of re-solving from scratch.
          </p>
        </header>

        {/* 1 — impact ticker */}
        <ImpactTicker stats={stats} />

        {/* 3 + 4 — living graph + try it */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.55fr_1fr]">
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/70">
              the living commons
            </h2>
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-2 backdrop-blur-sm">
              <SkillNetworkGraph skills={skills} trails={trails} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/70">
              try it — find a skill
            </h2>
            <TryItBox />
          </div>
        </section>

        {/* 2 — the scaled-impact closer */}
        <ScaledImpactPanel stats={stats} />
      </div>

      {/* live "an agent just reused a skill" toasts */}
      <LiveImpactToast />
    </main>
  );
}
