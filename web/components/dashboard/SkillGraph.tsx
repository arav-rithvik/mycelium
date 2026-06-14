"use client";

import { motion, useAnimationFrame } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * SkillGraph — the living "underground network."
 *
 * A breathing constellation of the skill commons. Each skill is a glowing
 * emerald node; nodes are grouped into loose clusters by category (each
 * category owns a fixed angle around the center, so the layout reads as
 * distinct lobes of a single organism). Nodes drift on slow sines and are
 * gently pulled back toward their cluster center, so the whole web inhales
 * and exhales. Faint "mycelium threads" connect nearby nodes in the same
 * category. When a reuse arrives (`pulse`), the matching node flashes with an
 * expanding ring and a bright particle travels to it along a thread.
 *
 * Everything is drawn on a single <canvas> (no graph libs), with the layout
 * computed deterministically from a seeded PRNG so SSR and CSR agree — we
 * never call Math.random during render. Sits transparently over the page's
 * near-black background.
 */

// ---- props -----------------------------------------------------------------

type Skill = {
  id: string;
  name: string;
  category: string;
  trust_score: number;
};

type Trail = {
  id: string;
  skill_id: string;
  success: boolean;
  timestamp: string;
};

type Pulse = { skillId: string; nonce: number } | null;

interface SkillGraphProps {
  skills: Skill[];
  trails: Trail[];
  pulse?: Pulse;
}

// ---- palette + constants ---------------------------------------------------

const EMERALD = "52, 211, 153"; // #34d399 — base
const EMERALD_LIGHT = "110, 231, 183"; // #6ee7b7 — light
const EMERALD_PALE = "167, 243, 208"; // #a7f3d0 — pale

const EASE = [0.22, 1, 0.36, 1] as const;

// Same LCG used elsewhere in the app — deterministic so SSR/CSR layout match.
function makeRand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Cheap stable hash so a category always maps to the same seed/angle.
function hashStr(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A node lives in a unit-ish space centered on (0,0); we scale to pixels at
// draw time so the layout is resolution-independent and resizes for free.
type Node = {
  id: string;
  name: string;
  category: string;
  trust: number; // 0..1
  // cluster center (the lobe this node belongs to), in unit space
  cx: number;
  cy: number;
  // resting offset from the cluster center
  ox: number;
  oy: number;
  // per-node wobble parameters (phase + speed + amplitude)
  wphX: number;
  wphY: number;
  wspX: number;
  wspY: number;
  wampX: number;
  wampY: number;
  // live position (unit space), eased by the sim each frame
  x: number;
  y: number;
  // transient flash energy 0..1 driven by `pulse`
  flash: number;
  radiusBase: number; // px-ish base radius before trust scaling
};

// A traveling particle fired on a pulse: lerps from -> to along a thread.
type Particle = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number; // 0..1 progress
  speed: number; // progress per second
  hue: string; // rgb triple
};

// An expanding ring emitted at a node on pulse.
type Ring = {
  x: number;
  y: number;
  t: number; // 0..1 life
  speed: number;
};

// Edge between two same-category nodes that sit close together.
type Edge = { a: number; b: number };

export default function SkillGraph({ skills, trails, pulse = null }: SkillGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Canvas pixel size in CSS px (not device px). Kept in a ref so the RAF loop
  // reads the freshest value without re-subscribing.
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  // -- derive trust + reuse counts per skill from trails --------------------
  // Trust per skill: prefer the explicit trust_score, but let observed success
  // nudge it so the graph reflects live signal. Reuse count drives nothing
  // visual here directly but is handy for the caption.
  const { nodes, edges, categoryAngles } = useMemo(
    () => buildLayout(skills, trails),
    [skills, trails],
  );

  // Keep a live, mutable copy of nodes for the sim (we mutate x/y/flash every
  // frame; React state would thrash). We rebuild it whenever the layout memo
  // changes identity.
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const particlesRef = useRef<Particle[]>([]);
  const ringsRef = useRef<Ring[]>([]);

  // index from skill id -> node index, for O(1) pulse lookup
  const idIndex = useMemo(() => {
    const m = new Map<string, number>();
    nodes.forEach((n, i) => m.set(n.id, i));
    return m;
  }, [nodes]);

  // small mono caption state — total nodes + a "live" heartbeat dot
  const [, force] = useState(0);

  // -- respond to a pulse: flash node + launch ring + particle --------------
  const lastNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!pulse) return;
    if (lastNonce.current === pulse.nonce) return;
    lastNonce.current = pulse.nonce;

    const idx = idIndex.get(pulse.skillId);
    if (idx == null) return;
    const target = nodesRef.current[idx];
    if (!target) return;

    target.flash = 1;
    ringsRef.current.push({ x: target.x, y: target.y, t: 0, speed: 0.9 });

    // Pick an origin for the traveling particle: a random same-category
    // neighbor if one exists, else the graph center. The rand here is seeded
    // by the nonce so it stays deterministic per pulse (and never in render).
    const rand = makeRand(hashStr(pulse.skillId) ^ (pulse.nonce * 2654435761));
    const sameCat = nodesRef.current.filter(
      (n) => n.category === target.category && n.id !== target.id,
    );
    let fromX = 0;
    let fromY = 0;
    if (sameCat.length > 0) {
      const origin = sameCat[Math.floor(rand() * sameCat.length)];
      fromX = origin.x;
      fromY = origin.y;
    }
    particlesRef.current.push({
      fromX,
      fromY,
      toX: target.x,
      toY: target.y,
      t: 0,
      speed: 1.6,
      hue: EMERALD_PALE,
    });
  }, [pulse, idIndex]);

  // -- size + DPR handling via ResizeObserver -------------------------------
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const apply = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // -- the animation loop ---------------------------------------------------
  // We mutate node positions toward (clusterCenter + wobble), draw threads,
  // glow nodes (radius/brightness ∝ trust), then particles and rings. A clock
  // accumulator gives time-based motion that's frame-rate independent.
  const clockRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  useAnimationFrame((t) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    if (w === 0 || h === 0) return;

    // delta time in seconds, clamped so a tab-switch doesn't teleport things
    const last = lastTsRef.current;
    const dt = last == null ? 0.016 : Math.min(0.05, (t - last) / 1000);
    lastTsRef.current = t;
    clockRef.current += dt;
    const now = clockRef.current;

    const nodeArr = nodesRef.current;
    const edgeArr = edgesRef.current;

    // The unit space is roughly [-1, 1]; map it into the canvas with a margin
    // so glow halos never clip at the edges. Scale is the smaller half-extent.
    const cxPx = w / 2;
    const cyPx = h / 2;
    const scale = Math.min(w, h) * 0.46;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // ---- advance the sim: drift + breathe -------------------------------
    // Each node eases toward (clusterCenter + slow sine wobble). The easing is
    // a critically-damped-ish lerp; the wobble supplies the "alive" motion and
    // the pull toward the cluster center supplies the "breathing."
    const breathe = 1 + Math.sin(now * 0.35) * 0.045; // whole-web inhale/exhale
    for (let i = 0; i < nodeArr.length; i++) {
      const n = nodeArr[i];
      const targetX =
        (n.cx + n.ox + Math.sin(now * n.wspX + n.wphX) * n.wampX) * breathe;
      const targetY =
        (n.cy + n.oy + Math.cos(now * n.wspY + n.wphY) * n.wampY) * breathe;
      // ease (the 6 controls stiffness; higher = snappier)
      n.x += (targetX - n.x) * Math.min(1, dt * 1.8);
      n.y += (targetY - n.y) * Math.min(1, dt * 1.8);
      // decay flash energy
      if (n.flash > 0) n.flash = Math.max(0, n.flash - dt * 1.6);
    }

    // helper: unit-space -> device-css px
    const px = (ux: number) => cxPx + ux * scale;
    const py = (uy: number) => cyPx + uy * scale;

    // ---- mycelium threads (faint same-category edges) -------------------
    ctx.lineWidth = 1;
    for (let e = 0; e < edgeArr.length; e++) {
      const a = nodeArr[edgeArr[e].a];
      const b = nodeArr[edgeArr[e].b];
      const ax = px(a.x);
      const ay = py(a.y);
      const bx = px(b.x);
      const by = py(b.y);
      const dxp = ax - bx;
      const dyp = ay - by;
      const dist = Math.hypot(dxp, dyp);
      // fade the thread out as nodes drift apart; only draw while reasonably near
      const fade = Math.max(0, 1 - dist / (scale * 0.42));
      if (fade <= 0.01) continue;
      const alpha = 0.03 + fade * 0.11 + (a.flash + b.flash) * 0.06;
      ctx.strokeStyle = `rgba(${EMERALD}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // ---- nodes: glowing dots, radius/brightness ∝ trust -----------------
    for (let i = 0; i < nodeArr.length; i++) {
      const n = nodeArr[i];
      const x = px(n.x);
      const y = py(n.y);

      // trust drives size + brightness; flash spikes both transiently
      const flash = n.flash;
      const trust = n.trust;
      const core = n.radiusBase * (0.5 + trust * 1.35) * (1 + flash * 0.9);
      const glowR = core * (5 + trust * 4 + flash * 6);

      // soft radial glow
      const g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      const glowHue = flash > 0.05 ? EMERALD_PALE : EMERALD_LIGHT;
      const glowA = 0.10 + trust * 0.18 + flash * 0.5;
      g.addColorStop(0, `rgba(${glowHue}, ${glowA})`);
      g.addColorStop(0.4, `rgba(${EMERALD}, ${glowA * 0.4})`);
      g.addColorStop(1, `rgba(${EMERALD}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // bright core dot — paler/brighter for high trust + during flash
      const coreHue =
        flash > 0.05 ? EMERALD_PALE : trust > 0.66 ? EMERALD_LIGHT : EMERALD;
      ctx.fillStyle = `rgba(${coreHue}, ${0.55 + trust * 0.4 + flash * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, core, 0, Math.PI * 2);
      ctx.fill();

      // a tiny hot center on the brightest nodes
      if (trust > 0.55 || flash > 0.1) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.18 + flash * 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, core * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---- expanding flash rings ------------------------------------------
    const rings = ringsRef.current;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt * r.speed;
      if (r.t >= 1) {
        rings.splice(i, 1);
        continue;
      }
      const x = px(r.x);
      const y = py(r.y);
      const eased = 1 - Math.pow(1 - r.t, 3); // easeOutCubic
      const radius = 6 + eased * (scale * 0.18);
      const alpha = (1 - r.t) * 0.5;
      ctx.strokeStyle = `rgba(${EMERALD_PALE}, ${alpha})`;
      ctx.lineWidth = 1.5 * (1 - r.t) + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---- traveling particles --------------------------------------------
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt * p.speed;
      if (p.t >= 1) {
        particles.splice(i, 1);
        continue;
      }
      // easeInOut for a satisfying glide
      const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
      const ux = p.fromX + (p.toX - p.fromX) * e;
      const uy = p.fromY + (p.toY - p.fromY) * e;
      const x = px(ux);
      const y = py(uy);

      // a short comet trail
      const tailE =
        Math.max(0, p.t - 0.06) < 0.5
          ? 2 * Math.max(0, p.t - 0.06) ** 2
          : 1 - Math.pow(-2 * Math.max(0, p.t - 0.06) + 2, 2) / 2;
      const tx = px(p.fromX + (p.toX - p.fromX) * tailE);
      const ty = py(p.fromY + (p.toY - p.fromY) * tailE);
      const tg = ctx.createLinearGradient(tx, ty, x, y);
      tg.addColorStop(0, `rgba(${p.hue}, 0)`);
      tg.addColorStop(1, `rgba(${p.hue}, 0.6)`);
      ctx.strokeStyle = tg;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();

      // particle head glow
      const headR = 7;
      const pg = ctx.createRadialGradient(x, y, 0, x, y, headR);
      pg.addColorStop(0, `rgba(${p.hue}, 0.95)`);
      pg.addColorStop(0.5, `rgba(${EMERALD_LIGHT}, 0.4)`);
      pg.addColorStop(1, `rgba(${EMERALD}, 0)`);
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(x, y, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Repaint the caption heartbeat ~every second (cheap, decoupled from RAF).
  // liveOn starts false on both SSR and first client render (no Date.now() in render → no
  // hydration mismatch), then toggles on the interval.
  const [liveOn, setLiveOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      force((n) => (n + 1) % 1000);
      setLiveOn((v) => !v);
    }, 1100);
    return () => clearInterval(id);
  }, []);

  void categoryAngles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: EASE }}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0e0f0e] to-[#0a0b0a] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
    >
      {/* ambient emerald blobs behind the web */}
      <div
        className="pointer-events-none absolute -inset-[20%]"
        style={{
          background:
            "radial-gradient(38% 38% at 32% 30%, rgba(52,211,153,0.10), transparent 70%), radial-gradient(42% 42% at 72% 70%, rgba(110,231,183,0.07), transparent 72%)",
          filter: "blur(120px)",
        }}
      />

      {/* dotted texture, masked to a soft ellipse */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(rgba(52,211,153,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 78%)",
        }}
      />

      {/* "frame as glow" — a hairline drawn as an inset shadow on a masked layer */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(110,231,183,0.10)",
          maskImage:
            "radial-gradient(ellipse 90% 90% at 50% 40%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 90% at 50% 40%, #000 40%, transparent 100%)",
        }}
      />

      {/* the network */}
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden />
      </div>

      {/* subtle vignette so the web sits in a pool of dark */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* tiny mono legend */}
      <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-2">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: `rgba(${EMERALD_PALE}, ${liveOn ? 0.95 : 0.35})`,
            boxShadow: liveOn
              ? "0 0 8px rgba(110,231,183,0.8)"
              : "0 0 0 rgba(0,0,0,0)",
            transition: "all 300ms ease",
          }}
        />
        <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-emerald-300/55">
          live skill commons
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-4 text-right">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] tabular-nums text-emerald-300/45">
          {nodes.length} nodes · brightness = trust
        </span>
      </div>
    </motion.div>
  );
}

// ---- layout construction ----------------------------------------------------

/**
 * Build the deterministic node + edge layout from the skill set.
 *
 * Clustering strategy: every distinct category is assigned a fixed angle
 * around the center (sorted alphabetically, then spread evenly — stable
 * regardless of skill order). Each category's nodes are scattered near a
 * cluster center that lives out along that angle, with seeded jitter so the
 * lobe looks organic. Because all randomness comes from a seeded PRNG keyed
 * on stable strings, the server and client produce byte-identical layouts.
 */
function buildLayout(skills: Skill[], trails: Trail[]) {
  // ---- normalize trust + count reuses per skill from trails ---------------
  const reuseCount = new Map<string, number>();
  const successCount = new Map<string, number>();
  for (const tr of trails) {
    reuseCount.set(tr.skill_id, (reuseCount.get(tr.skill_id) ?? 0) + 1);
    if (tr.success)
      successCount.set(tr.skill_id, (successCount.get(tr.skill_id) ?? 0) + 1);
  }

  // ---- category -> fixed angle -------------------------------------------
  const categories = Array.from(new Set(skills.map((s) => s.category))).sort();
  const catCount = Math.max(1, categories.length);
  const catAngle = new Map<string, number>();
  const catCenter = new Map<string, { x: number; y: number }>();
  categories.forEach((cat, i) => {
    const angle = (i / catCount) * Math.PI * 2 - Math.PI / 2;
    catAngle.set(cat, angle);
    // cluster centers sit on a ring; a touch of seeded radial variation so
    // the lobes aren't a perfect circle.
    const rand = makeRand(hashStr(cat) ^ 0x9e3779b9);
    const ringR = 0.52 + (rand() - 0.5) * 0.16;
    catCenter.set(cat, {
      x: Math.cos(angle) * ringR,
      y: Math.sin(angle) * ringR,
    });
  });

  // ---- build nodes --------------------------------------------------------
  const nodes: Node[] = skills.map((s) => {
    const center = catCenter.get(s.category) ?? { x: 0, y: 0 };
    const rand = makeRand(hashStr(s.id));

    // scatter within the lobe — gaussian-ish via summed uniforms
    const spread = 0.26;
    const gx = (rand() + rand() + rand()) / 3 - 0.5;
    const gy = (rand() + rand() + rand()) / 3 - 0.5;
    const ox = gx * spread * 2;
    const oy = gy * spread * 2;

    // trust normalized to 0..1 (trust_score may arrive on a 0..1 or 0..100
    // scale; normalize robustly), nudged by observed success rate.
    const raw = s.trust_score;
    let trust = raw > 1.0001 ? raw / 100 : raw;
    const reuses = reuseCount.get(s.id) ?? 0;
    if (reuses > 0) {
      const successRate = (successCount.get(s.id) ?? 0) / reuses;
      trust = trust * 0.8 + successRate * 0.2;
    }
    trust = Math.max(0.04, Math.min(1, trust));

    return {
      id: s.id,
      name: s.name,
      category: s.category,
      trust,
      cx: center.x,
      cy: center.y,
      ox,
      oy,
      wphX: rand() * Math.PI * 2,
      wphY: rand() * Math.PI * 2,
      wspX: 0.18 + rand() * 0.32,
      wspY: 0.18 + rand() * 0.32,
      wampX: 0.012 + rand() * 0.03,
      wampY: 0.012 + rand() * 0.03,
      x: center.x + ox,
      y: center.y + oy,
      flash: 0,
      radiusBase: 2.2,
    };
  });

  // ---- build edges: connect nearby same-category nodes --------------------
  // O(n^2) within categories only, which is fine for ~100 nodes split into a
  // handful of lobes. We threshold on resting distance so threads stay local.
  const byCat = new Map<string, number[]>();
  nodes.forEach((n, i) => {
    const list = byCat.get(n.category);
    if (list) list.push(i);
    else byCat.set(n.category, [i]);
  });

  const edges: Edge[] = [];
  const threshold = 0.2; // unit-space resting distance
  for (const list of byCat.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = nodes[list[i]];
        const b = nodes[list[j]];
        const d = Math.hypot(
          a.cx + a.ox - (b.cx + b.ox),
          a.cy + a.oy - (b.cy + b.oy),
        );
        if (d < threshold) edges.push({ a: list[i], b: list[j] });
      }
    }
  }

  return {
    nodes,
    edges,
    categoryAngles: catAngle,
  };
}
