"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "@/lib/supabase";

/**
 * LiveImpactToast — the live "someone just reused a skill" notifier.
 *
 * When an agent finishes a task by reusing a commons skill, the MCP
 * `report_apply` tool inserts a row into the `trails` table. Realtime is enabled
 * on `trails`, so Supabase pushes that INSERT to the browser; we pop a
 * dismissible toast: "prompt went through · {skill} · saved N tokens".
 *
 * If Supabase isn't configured (no env) we fall back to a simulated feed so the
 * notifier still demos live.
 */

const CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

type Toast = { id: number; skill: string; actor?: string; tokensSaved: number };

const DEMO_EVENTS: Omit<Toast, "id">[] = [
  { actor: "Arav", skill: "nextjs-supabase-auth", tokensSaved: 18400 },
  { actor: "Arav", skill: "stripe-checkout-session", tokensSaved: 22100 },
  { actor: "Arav", skill: "node-docker-multistage", tokensSaved: 9800 },
];

export default function LiveImpactToast({ demo }: { demo?: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = (t: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 8000);
  };
  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((x) => x.id !== id));

  useEffect(() => {
    const useDemo = demo ?? !CONFIGURED;
    if (useDemo) {
      let i = 0;
      const kick = window.setTimeout(() => push(DEMO_EVENTS[i++ % DEMO_EVENTS.length]), 2500);
      const id = window.setInterval(() => push(DEMO_EVENTS[i++ % DEMO_EVENTS.length]), 9000);
      return () => {
        window.clearTimeout(kick);
        window.clearInterval(id);
      };
    }
    const channel = supabase
      .channel("trails-impact-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trails" },
        async (payload) => {
          const row = payload.new as {
            skill_id: string;
            tokens_saved: number;
            success: boolean;
            owner_id?: string | null;
          };
          if (row.success === false) return;
          let skill = "a skill";
          const { data } = await supabase
            .from("skills")
            .select("name")
            .eq("id", row.skill_id)
            .single();
          if (data?.name) skill = data.name;
          push({ skill, tokensSaved: row.tokens_saved ?? 0, actor: row.owner_id ?? undefined });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [demo]);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(92vw,360px)] flex-col gap-3">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-[#0a0d0c]/85 px-4 py-3.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          >
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-emerald-300 to-emerald-500" />
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md text-white/35 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
            <div className="pr-5">
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">prompt went through</span>
              </div>
              <div className="mt-1.5 text-sm leading-snug text-white/85">
                {t.actor ? <span className="text-white">{t.actor}&apos;s agent</span> : "An agent"} reused{" "}
                <span className="font-mono text-emerald-200">{t.skill}</span>
              </div>
              <div className="mt-1 text-[13px] font-medium text-emerald-300">
                saved {t.tokensSaved.toLocaleString("en-US")} tokens
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
