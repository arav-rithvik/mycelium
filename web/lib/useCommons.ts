"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// Live state of the public commons: seeded from the /api routes, then kept live by Supabase
// realtime. Every report_apply from the MCP terminal lands here as a stats UPDATE + a trails INSERT,
// which is what makes the dashboard move on stage.

export type Stats = {
  total_tokens_saved: number;
  total_energy_wh: number;
  total_water_ml: number;
  total_co2_g: number;
  total_reuses: number;
};
export type GraphSkill = { id: string; name: string; category: string; trust_score: number };
export type TrailEvent = { id: string; skill_id: string; success: boolean; timestamp: string };

const toNode = (k: { id: string; name: string; category: string; trust_score: number }): GraphSkill => ({
  id: k.id,
  name: k.name,
  category: k.category,
  trust_score: k.trust_score,
});

export function useCommons() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [skills, setSkills] = useState<GraphSkill[]>([]);
  const [trails, setTrails] = useState<TrailEvent[]>([]);
  const [pulse, setPulse] = useState<{ skillId: string; nonce: number } | null>(null);
  const nonce = useRef(0);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [s, st, tr] = await Promise.all([
          fetch("/api/skills").then((r) => r.json()),
          fetch("/api/stats").then((r) => r.json()),
          fetch("/api/trails?limit=60").then((r) => r.json()),
        ]);
        if (!active) return;
        if (Array.isArray(s?.skills)) setSkills(s.skills.map(toNode));
        if (st?.stats) setStats(st.stats);
        if (Array.isArray(tr?.trails)) setTrails(tr.trails);
      } catch {
        /* keep skeleton state */
      }
    })();

    const channel = supabase
      .channel("commons-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stats" }, (p) => {
        if (p.new) setStats(p.new as Stats);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "skills" }, (p) => {
        const k = p.new as GraphSkill | undefined;
        if (k) setSkills((prev) => [toNode(k), ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "skills" }, (p) => {
        const k = p.new as GraphSkill | undefined;
        if (k) setSkills((prev) => prev.map((x) => (x.id === k.id ? { ...x, trust_score: k.trust_score } : x)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trails" }, (p) => {
        const t = p.new as TrailEvent | undefined;
        if (!t) return;
        setTrails((prev) => [t, ...prev].slice(0, 80));
        nonce.current += 1;
        setPulse({ skillId: t.skill_id, nonce: nonce.current });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, skills, trails, pulse };
}
