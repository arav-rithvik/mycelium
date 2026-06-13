# Mycelium — PRD (Product Requirements)

> **Read this first. Both people read this whole file.** It says WHAT we're building and WHY.
> Contracts (the exact shapes) live in `mycelium_contracts.md`. Who-builds-what + schedule live in `mycelium_split.md`.
> The deep narrative / pitch / judge-deflection bible is `mycelium.md`.

---

## One-sentence pitch

**Mycelium is an MCP server that auto-generates executable skills from successful agent sessions, shares them across a living commons, and lets each skill *earn* a live trust score by actually working — so every agent stops re-solving solved problems, and every reuse is inference that never had to happen (energy, water, and carbon saved, measured and shown live).**

It's **npm for agent knowledge**, built on the metaphor of a **mycelium network** — the underground fungal web through which a whole forest secretly shares what it learns.

---

## The problem (why a judge should care)

- 2.5B AI queries/day. On a deliberately conservative **10% floor** of skill-reusable, already-solved work, that's **250M redundant task-sessions/day** — ~105 MWh, ~6M L water, ~40 tonnes CO₂ wasted daily on re-solving solved problems.
- Inference is the crisis, not training (121 days of GPT-4 inference = its entire training carbon).
- Existing caches (GPTCache, prompt caching, LangCache) cache **text**, are single-tenant, unverified, and have no skill-level granularity. **Nobody auto-generates verified, environment-scoped, trust-earning skills shared across agents.**

This is a **sustainability-track** project where the *infrastructure itself is the sustainability angle* — we cut AI's own footprint, and we **measure** the cut instead of estimating it.

---

## What we're building (MVP — what's in the 5-minute demo)

### 1. MCP server — the discovery layer (`mcp/`)
Tools Claude Code calls:
- `search_skills` — **real pgvector semantic search** (cosine similarity on skill-description embeddings), NOT keyword matching. Returns ranked matches with trust + environment compatibility.
- `get_skill` — returns full skill content + a **ready-to-print savings footer** (see feature 5).
- `publish_skill` — distills a solved task into a named, versioned, dependency-tagged, check-backed skill.
- `report_apply` — records the `success_check` pass/fail outcome of applying a skill; this is what moves trust and updates the impact stats.
- `set_sharing` — flips the user's privacy toggle (`/mycelium on|off`); when off, new skills stay in the private library. (3 discovery tools + trust + privacy toggle = 5.)

### 2. Success-gated, environment-scoped trust (`shared/trust.ts`, `shared/fingerprint.ts`)
- Trust = **Bayesian pass-rate** `(successes + 1) / (successes + failures + 2)`. Usage moves nothing; only `success_check` outcomes do.
- Trust is **scoped to environment fingerprints** (framework / version / OS / runtime). A skill proven on `react@19` is surfaced as "unproven, re-confirm" to an agent on `react@20`. Coverage widens one environment at a time.
- A failure drops trust immediately and narrows the proven envelope. **The commons self-heals on contact — no curator, no cron.**

### 3. Live network visualization + the scroll experience (`web/`)
A single scrolling narrative page (the **hero** — see Frontend section) that explains the product, shows it working live, and ends on the savings. Plus a live force-directed graph: nodes = skills (brighten with trust, red-pulse on failure), edges = reuse events.

### 4. The impact ticker (`shared/env-math.ts` + `web/`)
Live counters — **tokens saved, energy (Wh), water (mL/L), CO₂ (g)** — driven by real reuse events, converted through cited per-query factors. **We don't model our impact; we observe it.**

### 5. ⭐ Per-message savings footer (the tangible "wow" — NEW, must-build)
Every time Claude uses a Mycelium skill, its reply ends with a small footer showing **what that single message saved**, by abstracting **baseline tokens (what solving from scratch would have cost) vs. actual tokens used**:

```
---
🍄 Mycelium saved ~14,720 tokens this turn → 12.4 Wh · 295 mL water · 4.7 g CO₂ not emitted
   (skill: nextjs-supabase-auth · trust 0.93 · proven on your env)
```

This makes the abstract planetary number **personal and visible on every single message**. The MCP tool responses return this footer string pre-formatted; Claude appends it. (Contract: `mycelium_contracts.md` → "Savings footer".)

### 6. ⭐ Privacy toggle — `/mycelium on` & `/mycelium off` (single-player vs commons)

Not everyone wants their work in a public commons. A one-keystroke toggle lets a user keep their skills **private**:
- **`/mycelium off`** → new skills publish to your **private library only** — fully usable by you (your own self-building cache, the single-player value), but never enter the public commons, the live graph, the "try it" box, or anyone else's search.
- **`/mycelium on`** → new skills join the public commons and earn trust through real reuse.

This is the **land-and-expand** story made real: value at N=1 with zero sharing, sharing as opt-in upside. It's also our clean answer to the privacy question — *you* decide what leaves your machine. Backed by the `set_sharing` MCP tool + per-skill `owner_id` + `visibility` (see contracts). The toggle affects future publishes only; a per-skill public override exists. Private applies show ` · 🔒 private` in the footer.

### 7. Web "try it" box (judge-usable — rubric Functionality)
On the Network page: a judge types a task ("set up Stripe webhooks in Next.js") → hits the **real** search → sees the matched skill, its trust, proven envs, and **projected** tokens/water/CO₂ saved → the live ticker bumps. Judges *use* it, they don't just watch.

---

## ⭐ The scroll IS the demo (READ — this defines both the frontend AND the presentation)

**New demo model:** we do not do a separate live two-terminal demo on stage. **The demo is us scrolling through the website**, narrating as we go — the page walks the judges through problem → solution → every feature → the technical → and ends on a live visualization of how it all connects. The scroll is scripted and animated, so **nothing can crash live** — but the *ending stays genuinely live* so it reads as a working product, not a marketing page (see "Keeping it real" below).

**Rithvik (Person 2, creator + demo lead) owns the look and directs it live as we build.** This PRD and the contracts give the frontend its **content spine and its data**, never a pixel layout.

### The scroll narrative spine (content order — design is the creator's call)
A single continuous scroll. Each beat is a stop we narrate during the demo:

1. **Hero — above ground (forest):** "Mycelium" + one-line tagline. Trees = lonely agents growing alone. Live impact counters ticking.
2. **The Problem:** redundant inference. The numbers (2.5B queries/day → conservative 10% floor → 250M redundant sessions → ~105 MWh, ~6M L water, ~40 t CO₂ wasted daily). Felt in the forest (compute burning for already-solved work).
3. **The scroll-dive (the reveal):** camera races below the soil into the glowing mycelium network — *"you thought these were separate agents; watch what's underneath."* The showstopper transition.
4. **The Solution:** what Mycelium is — a stigmergic skill commons, "npm for agent knowledge." One clear sentence + the metaphor.
5. **The Features (each its own scroll beat, explained while the network behaves):**
   - Skill synthesis — auto-distilled executable skills (not cached text)
   - Digital stigmergy — pheromone trails, strengthen on success, decay when stale
   - Claude discovers & chooses — the MCP tools (search/get/publish)
   - Earned trust — Bayesian pass-rate from real `success_check` outcomes; the climb-and-drop
   - Environment-scoped trust — proven envelope widens one environment at a time
   - Privacy toggle — `/mycelium on|off`, private library vs public commons
   - Per-message savings footer — tokens/water/CO₂ shown on every reply
6. **The Technical ("all the technical"):** how it actually works — MCP server + Supabase (Postgres + pgvector semantic search) + realtime; the Bayesian trust formula; the environmental math with cited factors. This is where we show it's real engineering, not vibes.
7. **The connection preview + handoff (the ending — "how everything connects"):** a taste of the live network — skills as nodes (trust = brightness), reuse as edges, clusters forming — plus the **GPTCache-vs-Mycelium comparison** and the **impact totals**. Ends with a clear **"explore the live commons →"** handoff to the **Dashboard**, which holds the full force-graph, the searchable skill list, the "how it works" backend panel, and the working "try it" box.

### Keeping it real (so it's a product, not a pitch site)
- The **Dashboard** (and the homepage's section-7 preview) run on **real backend data** — real skills, real trust, real pgvector search, realtime updates. Not mocked.
- Embed a short **screen-recording of the two terminals** (publish → reuse → trust climbs → wrong-env failure → trust drops) inside section 5's trust beat — the "it actually runs" evidence, with zero live risk.
- The **live code review** (separate, ~1 min) is where the backend gets shown directly.

Everything the frontend renders is delivered as a **stable data contract** (skills, trails, stats, search results, realtime events) so visuals can change freely without breaking the backend. **Backend never dictates UI; UI never assumes shapes not in the contract.**

Demo-safety: the scroll-dive (and any heavy animation) can fall back to a pre-rendered video that lands into the live section-7 graph. The graph and "try it" box stay real.

---

## Scope discipline

### In scope (must exist for the demo)
- 5 MCP tools (`search`, `get`, `publish`, `report_apply`, `set_sharing`) with real pgvector search
- Privacy toggle (`/mycelium on|off`) — private vs public skills via `owner_id` + `visibility`
- Supabase schema + realtime; ~20 pre-seeded skills with varied trust/envs
- Bayesian trust + environment fingerprint compatibility
- Env-math pure functions (cited factors) + the per-message footer + unit tests
- Live force-graph, impact ticker, the scroll experience, the "try it" box
- Trust-climb (brighten) + failure (red-pulse, trust drops) animations — the proof beat

### Cut / simplified
- Verification sandbox → **cut** (trust is earned at apply-time in the real env)
- Dependency-aware graph search → cut, BUT keep real pgvector semantic search (don't downgrade to tags)
- Skill decay → numeric only (trust value drops in DB), optional fade animation
- Anti-poisoning / prompt-injection defense → **out of scope**, mentioned only if asked

### Non-goals (prevent scope creep)
- Not a mature network — we built the **primitive + flywheel** and seeded it
- Not auth/accounts, not billing, not multi-org
- Not a general chat UI — the only "chat" is the two demo terminals (real Claude Code)

### Fallback scope (if badly behind)
Ship, in this priority order: (1) the **Homepage scroll** through the narrative spine + working ticker — this alone is the full pitch, (2) the **Dashboard** with the live graph on seeded data + impact totals, (3) the **"try it" box** (real `search_skills` + savings), (4) the embedded recorded **terminal clip** for the "it runs" proof. Protect the homepage scroll above all — it *is* the demo.

---

## Rubric alignment (Milpitas Hacks 2 — 7 categories, 1-10)

| Category | How we win it |
|---|---|
| Innovation & Creativity | Stigmergic skill commons + environment-scoped earned trust — genuinely novel; sticky metaphor. |
| Technical Complexity | MCP + Supabase realtime + **real pgvector** + Bayesian trust + executing `success_check`. Name the efficiency choices in code review. |
| Functionality & Usability | The **"try it" box** + interactive graph = judges use it, ticker reacts. |
| Design & Presentation | The scroll-dive forest→underground. Rithvik directs; rehearse to the 5-min cap. |
| Impact & Practicality | Cuts AI's own footprint; scalable; measured savings; "would survive as a product." |
| Relevance to track | Sustainability *is* the infra — making AI itself sustainable. Dead-on theme. |
| Quality of Code | **Open-source repo + README + linter + green `npm test` + you can explain the core files.** This is the existential category for an agent-built project — see split doc. |

Two Q&A traps to rehearse (answers in `mycelium.md` → Judge Deflection): **Jevons/rebound** ("doesn't cheaper AI just mean more AI?") and **net overhead** ("what does Mycelium itself cost?" → ~1000× less than it saves).

---

## The two surfaces

The product is **two pages**, and the demo walks through both:

1. **Homepage (`/`) — the scroll story.** The narrative spine above: problem → scroll-dive reveal → solution → features → technical → a taste of the network, with a clear "explore the live commons →" handoff to the dashboard. This is the *pitch made visual*.
2. **Dashboard (`/dashboard`) — the live commons + how the backend works.** Shows **every skill in the commons** as a living system: the big force-graph (trust = brightness, reuse = edges, clusters), a searchable/inspectable skill list, the impact totals, the working **"try it" box**, and a **"how it works" panel** that surfaces the backend live — the MCP tools, the pgvector search, the Bayesian trust updating in realtime as events arrive. The dashboard is *the product running*, and it tells its own story: watch the network think.

Homepage = "why this matters + what it is." Dashboard = "here it is, alive, and here's how it works under the hood."

## Demo (5-minute hard cap incl. Q&A + live code review) — **the scroll IS the demo**

No separate live terminal demo on stage. We drive the two pages and narrate.

- **0:00–2:45 — Scroll the Homepage.** Hero/forest → the Problem (the numbers) → scroll-dive reveal → Solution → each Feature beat (skill synthesis, stigmergy, MCP discovery, earned trust + the embedded terminal clip showing climb-then-drop, environment-scoped trust, privacy toggle, per-message footer) → the Technical beat. Narrate as we go.
- **2:45–3:45 — Land on the Dashboard.** The live commons graph on real data; point out trust brightness and reuse edges; open the "how it works" panel (MCP + pgvector + Bayesian trust); **hand a judge the keyboard → they use the "try it" box → real search + savings, ticker bumps.**
- **3:45–4:30 — Live code review.** Open README → `npm test` green → walk `shared/src/trust.ts` + one MCP tool file.
- **4:30–5:00 — Q&A** (Jevons, net-overhead, "isn't this GPTCache", privacy).

Closing line: *"We're not building another sustainability app. We're building the infrastructure that makes AI itself sustainable."*

> Timing is tight — the homepage scroll must be **rehearsed to ~2:45**. Pre-mark the scroll stops. If you run long, the Technical beat compresses (it's also covered in code review).

---

## Tech stack

- **Monorepo:** npm workspaces — `shared/`, `mcp/`, `web/`, `supabase/`
- **Backend:** TypeScript, `@modelcontextprotocol/sdk`, Supabase (Postgres + pgvector + Realtime)
- **Embeddings:** OpenAI `text-embedding-3-small` (1536-dim). Fallback if key fails: Postgres full-text / trigram search (documented in contracts).
- **Frontend:** Next.js (App Router) + `react-force-graph-2d` + `@supabase/supabase-js` (realtime). Rithvik's choice of styling/animation libs.
- **Shared contract code:** `@mycelium/shared` (types, env-math, trust, fingerprint, constants) — imported by both `mcp` and `web`.
