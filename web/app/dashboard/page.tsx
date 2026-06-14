"use client";

import { useCommons } from "@/lib/useCommons";
import ImpactGauges from "@/components/dashboard/ImpactGauges";
import ScaledImpact from "@/components/dashboard/ScaledImpact";
import SkillGraph from "@/components/dashboard/SkillGraph";
import TryItBox from "@/components/dashboard/TryItBox";

// The live commons. Wired to /api/{skills,stats,trails,search} + Supabase realtime (useCommons),
// so it updates on stage the instant report_apply fires from the MCP terminal.
export default function DashboardPage() {
  const { stats, skills, trails, pulse } = useCommons();

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#0a0a0a] text-[#e8efe9]">
      {/* ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(120% 80% at 50% -8%, rgba(16,185,129,0.10), transparent 60%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(52,211,153,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 85% 70% at 50% 25%, black, transparent 82%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 50% 25%, black, transparent 82%)",
        }}
      />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🍄</span>
          <span className="font-mono text-sm tracking-wide text-emerald-200/90">mycelium</span>
          <span className="text-white/15">·</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">live commons</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300/70">live</span>
        </div>
      </header>

      {/* impact gauges — the hero */}
      <section className="mx-auto max-w-7xl px-6 pb-12 pt-2 md:px-10">
        <ImpactGauges stats={stats} />
      </section>

      {/* the living network */}
      <section className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="relative h-[62vh] min-h-[440px] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0c0d0c] to-[#0a0b0a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <SkillGraph skills={skills} trails={trails} pulse={pulse} />
        </div>
      </section>

      {/* judge-usable: try it */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:px-10">
        <TryItBox />
      </section>

      {/* the closer */}
      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10">
        <ScaledImpact stats={stats} />
      </section>
    </main>
  );
}
