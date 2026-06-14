"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { CATEGORY_COLOR } from "@/lib/impact";

// Loaded only on the client: react-force-graph-2d touches window/canvas at import
// time, so a static top-level import would crash SSR. We type the props loosely
// (the library's generic accessor signatures fight our custom node/link shapes),
// keeping all the meaningful typing on our own GraphNode/GraphLink instead.
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
) as ComponentType<Record<string, unknown>>;

// Types — defined locally (the @mycelium/shared/types path doesn't resolve here).
export type Skill = {
  id: string;
  name: string;
  category: string;
  trust_score: number;
  success_count?: number;
  [key: string]: unknown;
};

export type Trail = {
  id: string;
  skill_id: string;
  success: boolean;
  tokens_saved: number;
  timestamp: string;
};

type GraphNode = {
  id: string;
  name: string;
  category: string;
  trust: number;
  val: number;
  // populated by the force engine at runtime
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string;
  target: string;
  reuse?: boolean;
};

type GraphData = { nodes: GraphNode[]; links: GraphLink[] };

const FALLBACK_COLOR = "#34d399"; // emerald, for unknown categories
const HIGHLIGHT_MS = 2200;

function colorFor(category: string): string {
  return CATEGORY_COLOR[category] ?? FALLBACK_COLOR;
}

// "#34d399" -> "52, 211, 153"
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r}, ${g}, ${b}`;
}

export default function SkillNetworkGraph({
  skills,
  trails,
}: {
  skills: Skill[];
  trails: Trail[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<unknown>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Track which skill ids / trail ids we've already seen so we can detect
  // additions and briefly highlight them.
  const seenSkillIds = useRef<Set<string>>(new Set());
  const seenTrailIds = useRef<Set<string>>(new Set());
  const firstRun = useRef(true);

  // id -> expiry timestamp (ms). Nodes/edges fade their highlight over time.
  const [highlights, setHighlights] = useState<Record<string, number>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ---- responsive sizing via ResizeObserver ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- detect newly added skills (bloom) ----
  useEffect(() => {
    const newlyAdded: string[] = [];
    for (const s of skills) {
      if (!seenSkillIds.current.has(s.id)) {
        seenSkillIds.current.add(s.id);
        if (!firstRun.current) newlyAdded.push(s.id);
      }
    }
    if (newlyAdded.length) addHighlights(newlyAdded);
    firstRun.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills]);

  // ---- detect newly added trails (pulse the reused skill) ----
  useEffect(() => {
    const pulsed: string[] = [];
    for (const t of trails) {
      if (!seenTrailIds.current.has(t.id)) {
        seenTrailIds.current.add(t.id);
        pulsed.push(t.skill_id);
      }
    }
    if (pulsed.length) addHighlights(pulsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trails]);

  function addHighlights(ids: string[]) {
    const expiry = Date.now() + HIGHLIGHT_MS;
    setHighlights((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = expiry;
      return next;
    });
    const t = setTimeout(() => {
      const now = Date.now();
      setHighlights((prev) => {
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(prev)) if (v > now) next[k] = v;
        return next;
      });
    }, HIGHLIGHT_MS + 50);
    timers.current.push(t);
  }

  // clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  // ---- build graph data ----
  const graphData: GraphData = useMemo(() => {
    const nodes: GraphNode[] = skills.map((s) => {
      const trust = Math.max(0, Math.min(1, s.trust_score ?? 0));
      // scale node volume by trust so high-trust skills read bigger
      const val = 1 + trust * 8;
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        trust,
        val,
      };
    });

    const links: GraphLink[] = [];
    const present = new Set(nodes.map((n) => n.id));

    // 1) connect skills that share a category — chain them so each category
    // forms an organic strand rather than a dense clique.
    const byCategory = new Map<string, string[]>();
    for (const n of nodes) {
      const arr = byCategory.get(n.category) ?? [];
      arr.push(n.id);
      byCategory.set(n.category, arr);
    }
    const categoryAnchors: string[] = [];
    for (const [, ids] of byCategory) {
      categoryAnchors.push(ids[0]);
      for (let i = 1; i < ids.length; i++) {
        links.push({ source: ids[i - 1], target: ids[i] });
      }
    }

    // 2) weave the category strands together via their anchors, so the whole
    // commons reads as one connected mesh instead of floating islands.
    for (let i = 1; i < categoryAnchors.length; i++) {
      links.push({ source: categoryAnchors[i - 1], target: categoryAnchors[i] });
    }

    // 3) recent reuse edges: connect consecutively-reused skills from the
    // trail log (most recent ~24) so live activity threads through the graph.
    const recent = [...trails]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 24)
      .reverse();
    const seenLink = new Set<string>();
    for (let i = 1; i < recent.length; i++) {
      const a = recent[i - 1].skill_id;
      const b = recent[i].skill_id;
      if (a === b || !present.has(a) || !present.has(b)) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seenLink.has(key)) continue;
      seenLink.add(key);
      links.push({ source: a, target: b, reuse: true });
    }

    return { nodes, links };
  }, [skills, trails]);

  const hasHighlights = Object.keys(highlights).length > 0;

  // Keep a soft re-render going while highlights are active so the pulse
  // animates smoothly even though the force engine paints continuously.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!hasHighlights) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(interval);
  }, [hasHighlights]);

  const empty = skills.length === 0;

  return (
    <div
      ref={containerRef}
      className="relative h-[clamp(360px,52vh,620px)] w-full overflow-hidden rounded-2xl border border-emerald-500/10 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent"
    >
      {empty ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            <p className="text-sm text-emerald-200/60">
              commons is warming up…
            </p>
          </div>
        </div>
      ) : (
        size.w > 0 &&
        size.h > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={size.w}
            height={size.h}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            cooldownTicks={120}
            onEngineStop={() => {
              const fg = fgRef.current as
                | { zoomToFit?: (ms: number, pad: number) => void }
                | null;
              fg?.zoomToFit?.(500, 50);
            }}
            d3VelocityDecay={0.32}
            d3AlphaDecay={0.018}
            enableNodeDrag={false}
            nodeRelSize={4}
            nodeLabel={(node: GraphNode) =>
              `${node.name} · ${Math.round(node.trust * 100)}% trust`
            }
            linkColor={(link: GraphLink) =>
              link.reuse
                ? "rgba(52, 211, 153, 0.55)"
                : "rgba(110, 231, 183, 0.12)"
            }
            linkWidth={(link: GraphLink) => (link.reuse ? 1.6 : 0.6)}
            linkDirectionalParticles={(link: GraphLink) => (link.reuse ? 2 : 0)}
            linkDirectionalParticleWidth={1.8}
            linkDirectionalParticleColor={() => "rgba(110, 231, 183, 0.9)"}
            nodeCanvasObject={(
              node: GraphNode,
              ctx: CanvasRenderingContext2D,
              globalScale: number
            ) => {
              const x = node.x ?? 0;
              const y = node.y ?? 0;
              const trust = node.trust;
              const baseR = 2.4 + Math.sqrt(node.val) * 1.6;

              // highlight (bloom / pulse) factor 0..1, decaying over time
              const exp = highlights[node.id];
              let hi = 0;
              if (exp) {
                hi = Math.max(0, Math.min(1, (exp - Date.now()) / HIGHLIGHT_MS));
              }
              const pulse = hi > 0 ? 1 + Math.sin(Date.now() / 90) * 0.18 * hi : 1;
              const r = baseR * (1 + hi * 0.6) * pulse;

              const hex = colorFor(node.category);
              const rgb = hexToRgb(hex);
              // brightness rises with trust score
              const coreAlpha = 0.55 + trust * 0.45;

              // outer glow
              const glowR = r * (3 + hi * 2.5);
              const grad = ctx.createRadialGradient(x, y, r * 0.4, x, y, glowR);
              grad.addColorStop(0, `rgba(${rgb}, ${0.4 + hi * 0.45})`);
              grad.addColorStop(0.5, `rgba(${rgb}, ${0.12 + hi * 0.2})`);
              grad.addColorStop(1, `rgba(${rgb}, 0)`);
              ctx.beginPath();
              ctx.fillStyle = grad;
              ctx.arc(x, y, glowR, 0, Math.PI * 2);
              ctx.fill();

              // solid core
              ctx.beginPath();
              ctx.fillStyle = `rgba(${rgb}, ${coreAlpha})`;
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.fill();

              // bright rim
              ctx.beginPath();
              ctx.lineWidth = 0.6;
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + trust * 0.35 + hi * 0.3})`;
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.stroke();

              // label for prominent or highlighted nodes
              const showLabel = node.val > 5 || hi > 0;
              if (showLabel) {
                const fontSize = Math.max(10, 12 / globalScale);
                ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = `rgba(226, 255, 240, ${0.65 + hi * 0.35})`;
                ctx.fillText(node.name, x, y + r + fontSize * 0.9);
              }
            }}
            nodePointerAreaPaint={(
              node: GraphNode,
              color: string,
              ctx: CanvasRenderingContext2D
            ) => {
              const r = 2.4 + Math.sqrt(node.val) * 1.6 + 4;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, Math.PI * 2);
              ctx.fill();
            }}
          />
        )
      )}
    </div>
  );
}
