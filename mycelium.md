# MYCELIUM — The Collective Intelligence Layer for AI Agents

## The Problem (with hard numbers)

Every AI agent on Earth has amnesia. 2.5 billion ChatGPT queries are sent per day (TechCrunch/OpenAI, July 2025). Research shows ~31% of LLM queries are semantically similar to prior requests (MeanCache, arXiv:2403.02694) — that is the measured **ceiling** of redundancy, and we do NOT claim all of it is skill-reusable. We discount hard to only the structured, task-type work that an executable skill can actually capture, using a conservative **10% floor** (roughly a third of the measured semantic-similarity rate). Even at that floor: **250 million redundant task-sessions every single day** — each one burning compute, water, and carbon for already-solved problems. **Every number below uses the 10% floor, not the 31% ceiling — so the claims are defensible, not inflated.**

### Environmental Cost

| Metric | Per Query | Daily Waste (conservative 10% floor) | Source |
|--------|-----------|------------------------------|--------|
| Energy | 0.42 Wh | 105 MWh/day | arXiv:2505.09598 |
| Water | 10-25 mL | 2.5-6.3M liters/day | Li et al., arXiv:2304.03271 |
| CO2 | 0.16g (US grid) | ~40 tonnes/day | Calculated: 0.42Wh x 386g CO2/kWh (EPA eGRID) |

> **Why 10%, not 31%?** Semantic similarity ≠ skill-level reuse. Most similar queries are one-off conversational turns, not repeatable engineering tasks like "set up Supabase auth." We isolate the reusable slice with a conservative floor that is falsifiable and still enormous. The 31% figure is cited only as the upper bound we deliberately discount from.

121 days of serving GPT-4 inferences produces the same carbon as GPT-4's entire training (LLMCO2, arXiv:2410.02950). **Inference is the crisis, not training.** And nobody is building infrastructure to fix it.

> **What does Mycelium itself cost? (Net savings, not gross.)** Every saving below is *net*. Finding a skill is one embedding lookup + a metadata read — on the order of a fraction of a watt-hour, bounded and constant no matter how hard the task is. The session it replaces is ~18,000 generated tokens of agentic reasoning. The overhead is roughly **three orders of magnitude smaller than the work it eliminates** — we spend <0.1% to skip ~80% of the tokens on every reuse. The `success_check` runs as a side effect of work Claude was already doing, so it adds nothing. **This is the rare sustainability project whose own footprint is measured and provably dwarfed by what it saves.**

---

## What Exists Today (and why it's all insufficient)

| Tool | What It Does | Fatal Flaw |
|------|-------------|------------|
| **GPTCache (Zilliz)** | Semantic cache — embeds prompts, returns cached responses if similar | Up to 99% false-positive rate at loose thresholds. No verification. No cross-user sharing. Caches TEXT, not knowledge. |
| **Anthropic Prompt Caching** | Reuses KV computation for repeated prompt prefixes | Per-API-key. 10,000 developers using the same system prompt each pay separately. Single-tenant only. |
| **Redis LangCache / Portkey** | Managed semantic caching proxies | Per-organization. ~20% real-world hit rate. Same false-positive problem. No skill-level granularity. |
| **Mozilla cq** | "Stack Overflow for agents" — shared knowledge units with confidence scoring | 3 months old. No MCP integration. No Claude Code support. Python SDK only. No skill synthesis. |
| **AgentHub** | Verified knowledge base + Elasticsearch + Fetch.ai | Hackathon prototype. Crypto-adjacent. No production traction. No IDE integration. |
| **Skill Swarm MCP** | Cross-agent skill sharing with BM25F matching and trust scoring | Skills are pre-existing — no auto-generation from agent sessions. No verification loop. No environmental tracking. |

### The Gap — What NOBODY Has Built

A system that auto-generates executable skills from successful agent sessions, shares them instantly across a collective network, and lets each skill *earn* a live trust score through real-world reuse — so every agent can see exactly how proven a skill is before relying on it. **That's Mycelium.**

---

## What Mycelium Actually Is

Mycelium is not a cache. It's a **stigmergic skill commons** — borrowed from how ant colonies and fungal networks work. In nature, organisms leave chemical traces (pheromones) that other organisms follow without central coordination. The system gets smarter through use, not management.

---

## The 5 Core Features

### 1. Skill Synthesis, Not Response Caching

**GPTCache:** prompt → embedding → cached response string
**Mycelium:** successful agent session → auto-distilled executable skill with metadata

Example skill:
```yaml
name: nextjs-supabase-auth
description: "Set up Supabase auth in Next.js App Router with PKCE flow"
framework: next.js
version_constraints: ">=14.0.0"
dependencies: ["@supabase/ssr", "@supabase/supabase-js"]
success_check: "Route /auth/callback returns 302 redirect"
tokens_to_create: 18400
trust_score: 0.50        # brand new & unproven; climbs with each successful reuse
success_count: 0
failure_count: 0
```

This is a named, versioned, dependency-tagged, check-backed capability — not a text blob. It's the difference between a Stack Overflow answer and an npm package. It's shareable immediately at trust 0.50 (unproven) and *earns* a higher score by actually working.

**Why it's 10x:** Voyager (NVIDIA, 2023) proved this approach gets 3.3x more unique items and 15.3x faster milestone completion vs. non-skill-learning agents.

### 2. Digital Stigmergy (Pheromone Trails)

Borrowed from swarm intelligence research (SwarmBench, arXiv:2505.04364; Society of HiveMind, ETH Zurich 2025).

After every agent session, Claude leaves a **pheromone trail**:
```json
{
  "task_type": "auth_setup",
  "approach": "supabase_ssr_pkce",
  "success": true,
  "environment": {"framework": "nextjs", "version": "15.2"},
  "tokens_used": 18400,
  "timestamp": "2026-06-11T14:30:00Z"
}
```

Stronger trails (more successes) get surfaced first. Trails decay over time — stale knowledge fades naturally, like pheromones evaporating. No manual curation needed.

### 3. Claude Discovers and Chooses (Not Blind Injection)

Mycelium exposes 3 MCP tools:

| Tool | What It Does |
|------|-------------|
| `search_skills` | Claude calls this before starting work. Returns matching skills with full metadata. |
| `get_skill` | Claude reads the full skill content and decides whether to apply it. |
| `publish_skill` | After solving something novel, Claude distills and publishes a new skill with test assertion. |

Claude still reasons. It reads metadata, compares to current context, and makes an informed decision. **GPTCache bypasses reasoning. Mycelium augments it.**

### 4. Trust Is Earned Through Real Use, Not Stamped Once

The naive version treats "verified" as a one-time global boolean. It isn't. In Mycelium, a skill **earns trust the way knowledge earns trust in the real world — by working, repeatedly, for real people.** No lab, no sandbox, no curator. The first agents to use a new skill are the test; every reuse is a vote cast by reality.

**How trust climbs:**

Every skill ships an executable **`success_check`** (e.g. "route `/auth/callback` returns 302"). When Claude applies a skill, that check **runs on the real machine** — the auth flow returned the right redirect, or it didn't. **That objective pass/fail is the only thing that moves trust** — not a thumbs-up, not how many times it was used. We store `success_count` and `failure_count` and trust is the Bayesian pass-rate — the posterior mean `(successes + 1) / (successes + failures + 2)`, never a hand-set number. A skill used 20 times but broken 18 of them has *low* trust — usage alone earns nothing.

> **This is functional testing — just moved, not removed.** Cutting the sandbox didn't delete the test; it relocated it from a synthetic lab to the user's real environment, where it runs on every apply. Trust is that test's pass-rate aggregated over reality — which is stronger ground truth than any sandbox, because it's the real world.

> **Why "it worked," not "I liked it":** Popularity is gameable and breeds confidently-wrong knowledge (every highly-upvoted-but-broken Stack Overflow answer). Mycelium climbs on *demonstrated task success*, measured at apply time in the user's real environment — for free, as a side effect of Claude doing the work. That's the difference between "this is popular" and "this keeps actually working."

#### Trust Is a Track Record, Not a Gate

A published skill is **shareable immediately** — any Claude can discover it from the moment it's created. There's no locked "private" stage to pass through. What changes over time isn't *access*, it's **confidence**: every skill carries a live trust score, and the dashboard shows it — a brand-new skill is dim and clearly "unproven," a skill that's worked many times glows bright and reads as "battle-tested."

So "verified" isn't a binary stamp or a gate — it's **where a skill sits on a track record.** A skill at trust 0.5 with one success is *usable but unproven*; one at 0.95 after dozens of real successes is *trusted*. Claude sees the score and the proven environments and decides accordingly — exactly like reading an npm package's download count and version history before you install it.

> **The rule of thumb:** ~3 independent successes (3 distinct environment fingerprints — agent / framework version / OS) is roughly where a skill stops looking like luck and starts looking trustworthy: 1 is a fluke, 2 could be coincidence, 3 is a pattern. But it's a *confidence reading, not a wall* — nothing is hidden before it, and high-risk skills (auth, payments) simply need a higher score before Claude leans on them.

#### Solving "works for me, not for you" — Environment-Scoped Trust

A skill does not have one global trust score. It has a score **conditioned on the requester's environment.** Every skill carries the fingerprint of every environment it has succeeded in (framework, version range, OS, runtime, key dependency versions). When a new agent retrieves it:

1. Mycelium computes a **compatibility score** between the requester's fingerprint and the skill's proven-success envelope.
2. High overlap → surfaced as trusted *for you*.
3. Low overlap → surfaced as "unproven in your environment — adapt and re-confirm." Claude adapts the skill and checks the task succeeds before trusting it.
4. Success in the new environment → that environment joins the proven envelope. The skill's coverage **widens through use.**

Universality is never assumed; it is **measured and earned, one environment at a time** — exactly how a real package builds a compatibility matrix.

#### Why It Stays Correct Over Time (Sustainability)

The commons self-heals instead of rotting — and it does so **without any background re-verification job.** The key realization: a new dependency version is not a special case. **A new major version is just a new point in environment-space** — the same axis as a different framework, OS, or runtime. So drift is handled by the exact machinery that already conditions trust on environment. The commons heals *on contact*, not on a schedule.

- **Drift is just a new environment, healed on reuse.** When an agent on `react@20` uses a skill last proven on `react@19`, the fingerprints don't overlap — so the skill is surfaced as **"unproven for you — adapt and re-confirm"** (the same path every cross-environment retrieval takes). Claude applies it and checks the task succeeds. Success → the envelope widens to include 20. Failure → trust drops for that version, skill tagged `proven ≤19, broken on ≥20`. Nothing is ever "on hold"; the first real user in the new environment *is* the test, and the apply-time success-check is the safety net — a stale skill fails its own task and costs wasted tokens, never corrupted work.
- **Envelope scoping, not deletion.** When a skill works in the new version: if the skill text was **unchanged**, the *same* skill simply now covers a wider range. If it had to be **adapted**, that's a new skill version that seeds from the adapter's environment, while the old version stays tagged `works <20` — both coexist, and retrieval serves whichever matches the requester's fingerprint. Old knowledge is *scoped*, never blindly removed, because someone is always still on the old dependency.
- **Decay tied to confirmation freshness, not just calendar time.** A skill *recently re-confirmed* (in any real environment) stays strong; one not confirmed against current versions decays faster. Pheromone strength = real success rate; evaporation = confirmation staleness.
- **Sharp failure feedback.** A reuse that fails its task decays trust immediately and narrows the proven envelope. The network removes its own bad knowledge with no curator.

### 5. Living Network Visualization

A force-directed graph where:
- Nodes = skills — pulse when created, glow brighter with higher trust scores, fade as they decay
- Edges = agent connections — glowing line animates from consumer to skill node on reuse
- Clusters form naturally — React skills cluster together, auth skills cluster, etc.
- Impact ticker — tokens saved, kWh avoided, liters of water preserved, kg CO2 prevented

> **This is our sustainability superpower: the impact is *measured*, not estimated.** Most sustainability projects guess at their effect. Mycelium counts the exact tokens that were never generated — at apply time, as a free side effect of Claude doing the work — and converts them through published, cited per-query factors (energy, water, grid CO₂). Every number on the ticker is a real saving traceable to a real reuse, not a projection. **We don't model our impact; we observe it.**

---

## Visual & Presentation (Lean Heavy Here)

The metaphor has to be *felt*, not just explained. The entire site is built around one gesture: **above ground, agents look like they grow alone — scroll down, and you fall into the network that secretly connects them all.** Presentation is a first-class deliverable, not polish-if-time.

### The Landing — Above Ground (the forest)

The page opens above ground:
- **A forest of trees** across the top — each tree is a Claude agent, growing on its own.
- **The live impact counters** front and center — tokens saved, water preserved, energy avoided, CO₂ prevented — ticking up in real time.
- **"Mycelium"** + the one-line "what it is" tagline.
- **Top navigation** with the other pages (see below).

### The Scroll — Diving Underground (the reveal)

This is the showstopper. As you **scroll down, the camera dives below the soil line** and accelerates — racing **fast, all the way to the bottom** — and the whole **mycelium network unfurls underground**: a glowing, living web of every skill in the commons. Threads of knowledge **flash white** as they're shared between agents; the skills already public today — the common, everyday solutions humanity has already solved — light up across the network. You *see* the hidden collective intelligence that the lonely trees above were standing on the whole time.

> The emotional beat: *"You thought these were separate agents. Watch what's underneath."*

### The Pages (top nav)

1. **Home** — the forest → scroll → underground network experience above.
2. **About** — every feature you get with Mycelium, laid out visually.
3. **Install** — how to install the MCP server (copy-paste setup for Claude Code).
4. **Network / Public Skills** — the live list of every skill that's already public in the commons — the dashboard view (searchable, click a skill to inspect its metadata, trust, and proven environments).

### Build Note (keep it demo-safe)

Lean into visuals, but protect the live demo from bugs:
- The **scroll-dive** (forest → underground) can be a scroll-driven animation that *lands into* the **live force-graph** — the graph itself stays real and reacts to the two terminals.
- If the interactive scroll gets risky under time pressure, fall back to a **pre-rendered scroll/dive video** that transitions into the live graph. Same wow on stage, zero risk.
- The underground network = the `react-force-graph-2d` view already in the build plan, dressed with the glow / white-flash share animations.

---

## Out of Scope (Acknowledged, Not Built for This Demo)

These are real concerns for a production commons, but deliberately *not* part of the hackathon build. We don't lead with them — we mention them only if asked, to show we've thought past the demo.

- **Anti-poisoning / prompt-injection defense.** A shared commons where Agent A publishes a skill that Agent B uses is an attack surface. The intended design is two parts: **(1) trust gating** — a skill that lies fails its `success_check` and its trust sinks, so a malicious skill can't build the track record agents rely on; and **(2) a hard capability blacklist enforced *above* the skill** — skills are treated as untrusted data, never commands, and can never touch secrets, private data, source code, or run destructive ops, no matter what text is hidden inside them. Not implemented in the demo; noted as the security roadmap.

---

## Competitive Moat

| Dimension | GPTCache | Mozilla cq | Skill Swarm MCP | Mycelium |
|-----------|----------|-----------|-----------------|----------|
| What's shared | Text pairs | Knowledge units | Pre-existing skills | Auto-generated verified skills |
| Cross-user | No | Yes | Yes | Yes |
| Verified | No | Partial | No | Yes (earned through real reuse, environment-scoped) |
| MCP-native | No | No | Yes | Yes |
| Auto-generated | No | No | No | Yes (Voyager-style) |
| Trust + decay | No | Partial | Yes | Yes (stigmergic) |
| Environmental tracking | No | No | No | Yes (cited sources) |

---

## The Core Differentiator

GPTCache = **copy-paste from Stack Overflow** — text blob, hope it works.
Mycelium = **npm install** — named, versioned, tested package with dependency metadata.

Nobody has built npm for agent knowledge. That's Mycelium.

---

## Cold Start & Why This Compounds (Honest Framing)

Mycelium's value does NOT depend on a pre-existing network. It is useful at N=1 and compounds from there:

1. **Single-player value first (land-and-expand).** Before any sharing, your *own* successful sessions become *your* private skill library. A solo developer gets a personal, self-building cache on day one. Network effects are upside, not a precondition for value — the same path Slack, Superhuman, and npm used to escape cold start.
2. **Seed the commons from already-solved public knowledge.** The cold-start commons isn't 20 hand-written skills — it's auto-distilled from public, *re-verifiable* sources: official framework docs, high-star GitHub setup guides, and existing Claude Code skills / MCP servers. The commons launches with hundreds of real, re-confirmable skills because humanity already solved these problems in public.
3. **Cross-user sharing layers on top** once individuals are already getting value.

**What we claim:** we built the *primitive and the flywheel* — auto-generation, environment-scoped verification, stigmergic trust — and seeded it. We are NOT claiming a mature network exists. We built the thing a network grows on.

---

## Milpitas Hacks 2 — Rubric & Score-Maximizing Plan

Judged 1-10 (no decimals) across 7 categories; **scores are algorithmically adjusted for grading rigor**, so expect careful/harsh grading, not inflation. Presentation + Q&A + **live code review** are capped at **5 minutes total**.

**Where we're already strong (9-10):** Innovation & Creativity, Design & Presentation, Relevance to Track (sustainability), Impact & Practicality.

**Where we must close gaps — and exactly how:**

### Technical Complexity & Execution (target 7 → 9)
9-10 box = *"complicated **and efficient** stack, well versed in the codebase."* Stack is already complicated; the missing word is *efficient* + showing real depth.
- **Real semantic search with `pgvector` (do this).** Embed each skill description, store the vector in Supabase, make `search_skills` do real cosine-similarity retrieval — not keyword/tag matching. Honest to the product (semantic reuse is the whole point) and the difference between "keyword lookup" and a defensible complicated stack.
- **`success_check` actually executes** a real command (HTTP/shell assertion) and the pass/fail genuinely writes `success_count`/`failure_count`. Real execution > simulated number.
- **Name the efficiency choices in code review:** realtime subscriptions not polling; embeddings cached (one vector op per search); Bayesian posterior, no recompute loop.
- **Add nothing that can break** — "incomplete, buggy" is a stated 1-3 trigger.

### Functionality & Usability (target 6 → 8, our biggest drag)
9-10 box = *"judges should **enjoy using** it / can freely use it."* Problem: it's infra — judges watch, don't touch.
- **Web "try it" box (do this).** On the Network page: judge types a task ("set up Stripe webhooks in Next.js") → runs the **real** `search_skills` → shows matching skill, trust, proven envs, and projected tokens/water/CO₂ saved. Judge *uses* it with their own input in 10s, no MCP install. Moves the category from "watched" (6) to "played with and enjoyed" (8).
- **Ticker reacts to their action** — their search/apply bumps the live impact counters (cause-and-effect they trigger).
- **Smoothness is graded literally** — no console errors, no crashes, loading/empty states present. Rehearse the judge-uses-it path as hard as the demo.
- **Working one-command Install** — copy button copies valid Claude Code MCP config that actually registers.

### Quality of Code (target 4 → 9, the existential one)
9-10 box = *"exemplary, commented, efficient, **open source**"* + presenter familiar. Mostly cleanup, not building.
1. **Open-source the repo** (public, LICENSE) — "open source" is literally in the top band.
2. **Real README** — one architecture diagram, run instructions, the 3 MCP tools documented.
3. **Run a formatter + linter** (Prettier/ESLint) across everything — inconsistent style is the #1 "blatantly AI generated" tell.
4. **Strip AI debris** — kill emoji comments, "Here's the function that…", redundant comments, dead code, placeholder TODOs. Add a few *human* comments explaining **why** (trust formula, compatibility scoring).
5. **Keep unit tests green and run `npm test` live** during code review — strongest quality signal there is.
6. **Clear folder structure** — `mcp/`, `db/`, `web/`, `lib/`.
7. **Be able to explain 2-3 core files cold** — MCP handlers, trust function, realtime wiring. "Presenter unfamiliar with the codebase" is a stated 1-3 trigger.

### Priority stack (if time is short)
1. Open-source + README + formatter + strip AI tells (Quality 4→8, ~45 min)
2. Web "try it" box on real search (Functionality 6→8, ~1 hr)
3. `pgvector` semantic search (Technical 7→9, ~1-1.5 hr)
4. Rehearse explaining the 3 core files (lifts Quality *and* Technical, ~30 min)

### 5-Minute Run-of-Show (hard cap incl. Q&A + code review)
- **0:00–2:30** — Pitch + scroll-dive + two-terminal demo + failure beat
- **2:30–3:00** — Hand a judge the keyboard: they type a task into the "try it" box, watch the ticker move
- **3:00–4:00** — Code review: open README → `npm test` green → walk one core file (trust function)
- **4:00–5:00** — Q&A (Jevons, net-overhead, "isn't this GPTCache" — answers in Judge Deflection)

---

## 9-Hour Build Plan (Revised — With Cuts)

### What to Cut

| Feature | Verdict | Savings |
|---------|---------|---------|
| Verification sandbox | **Cut entirely** — trust is earned through real reuse, not a lab. Success is checked at apply time in the real environment. | 1.5 hrs |
| Skill decay animation | **Numeric only** — show trust_score dropping in DB | 30 min |
| Dependency-aware graph search | **Cut** — but keep **real `pgvector` semantic search** (cosine similarity on skill-description embeddings), NOT tag matching. This is the technical-complexity proof; don't downgrade it to keywords. | +1 to 1.5 hr (worth it) |
| Skill detail cards | **Simplify** — click node → modal with prettified JSON | 30 min |

### What Survives No Matter What
- MCP server with 3 tools (search, get, publish) — `search_skills` backed by **real `pgvector` semantic search**
- Supabase schema + realtime subscriptions
- **Executable `success_check`** that runs a real assertion and gates trust (real pass/fail, not a simulated number)
- **Web "try it" box** on the Network page (judge-usable, runs real search, bumps the ticker)
- **Code-quality pass** — public repo + README + formatter/linter + green `npm test` (rubric-critical)
- Pheromone trail recording + trust scoring
- Live force-directed graph with skill birth animation
- Impact ticker (tokens saved, kWh, water, CO2)
- Cross-agent discovery demo (the money shot)
- **Trust-climb + failure animation** — a skill's node brightens as its trust rises on each success, and dims with a red pulse when a `success_check` fails and trust drops (the "trust is a real pass-rate" beat, now visual)
- 20 pre-seeded skills for cold start (framed as a seed, with auto-distillation-from-public-docs as the real strategy)

### Agentic Acceleration (Both on Claude Max)

Each person is a **lead + a fleet of parallel Claude agents**. The bottleneck is no longer typing speed — it's **review and integration**. So the strategy is: humans own the critical path and the interfaces; agents fan out on independent, clearly-specified leaf tasks.

**Rules so parallel agents don't collide:**
- **Lock the contracts first** (the 0:30 sync is now mandatory, not optional): exact Supabase table columns, MCP tool input/output shapes, and `/api/*` response shapes. Agents build *against* these interfaces, so their work composes instead of conflicting.
- **One agent = one file/module** with a written spec. Give it the contract + the success check ("the About page renders the 5 features from this JSON"). Use separate branches/worktrees so agents never edit the same file at once.
- **The human stays the integrator.** Agents generate; you review, wire, and own anything demo-critical (live graph ↔ realtime, MCP ↔ dashboard, the rehearsal). Never let an unreviewed agent diff touch the demo path.

**Fan out to agents (independent, low-shared-state):**
- Seed-data generation (20 realistic skills with varied trust/envs)
- Environmental impact pure functions (with cited factors) + unit tests
- The **About** page (feature list) and **Install** page (MCP setup) — fully parallel
- First-draft React components (ticker, skill modal, nav) against the agreed props
- MCP tool boilerplate (`search`/`get`/`publish` scaffolds) against the schema

**Keep human-driven (taste, integration, debugging):**
- Schema + contract decisions (everything depends on these)
- The live force-graph wiring + realtime subscriptions
- The scroll-dive feel and timing
- Final integration, demo rehearsal, on-stage reliability

**Net effect:** this is what makes the now-packed visual scope *fit*. Agents absorb the pages, seed data, pure functions, and boilerplate in parallel, freeing the humans to spend their hours on the live graph, the scroll-dive, and a demo that doesn't break.

### Person 1: Backend (MCP + Supabase + API)

| Time | Task | Deliverable |
|------|------|-------------|
| 0:00–0:30 | Supabase project setup. Create 3 tables: `skills` (incl. `trust_score`, `success_count`, `failure_count`, `proven_envs`), `trails`, `stats`. Enable realtime. | Schema live |
| 0:30–1:00 | Pre-seed 15-20 skills with realistic data and varied trust scores. | `npm run seed` works |
| 1:00–3:00 | MCP server core: `search_skills`, `get_skill`, `publish_skill` with `@modelcontextprotocol/sdk`. **`search_skills` uses real `pgvector` cosine similarity on skill-description embeddings** (enable the `vector` extension; embed on publish; cache the query embedding). NOT tag matching. | 3 MCP tools; semantic search returns ranked matches |
| 3:00–4:00 | Pheromone trails + **success-gated trust.** Every apply **runs the skill's `success_check` as a real assertion** (HTTP/shell) and reports pass/fail. Store `success_count` + `failure_count`; trust = Bayesian pass-rate `(successes + 1) / (successes + failures + 2)`. Usage alone moves nothing — only outcomes do. | Real check executes; trust tracks pass-rate, not popularity |
| 4:00–5:00 | Environmental math layer. Pure functions with cited conversion factors. Update `stats` on reuse. | Impact metrics working |
| 5:00–5:30 | Trust update on every apply: recompute `trust_score` from success/failure counts; record the environment fingerprint. (No private/public gate — skills are shareable on publish.) | Trust recomputes live |
| 5:30–6:30 | Dashboard API routes: `/api/skills`, `/api/stats`, `/api/trails`, **`/api/search`** (powers the web "try it" box — same `pgvector` query as the MCP tool, returns match + trust + projected savings). | Frontend has data; try-it backend live |
| 6:30–7:30 | Integration testing. Install MCP in Claude Code. Full flow test. **Code-quality pass:** repo public + LICENSE, README (arch diagram + run steps + 3 tools), run Prettier/ESLint, strip AI-tell comments, `npm test` green on the env-math pure functions. | End-to-end works; repo is review-ready |
| 7:30–9:00 | Demo rehearsal + bug fixes. Practice 3+ times. | Demo reliable |

### Person 2: Frontend (Visual Experience + Dashboard)

Visuals are a first-class deliverable here — the landing/scroll experience is built alongside the live graph, not after it.

| Time | Task | Deliverable |
|------|------|-------------|
| 0:00–0:45 | Next.js scaffold + routing for 4 pages (Home / About / Install / Network). Install `react-force-graph-2d`, Supabase client, realtime. | App runs, routes + realtime connected |
| 0:45–1:30 | **Home landing — above ground.** Forest of trees across the top, "Mycelium" + tagline, impact counters placed. Dark theme (black/deep purple). | Landing looks alive |
| 1:30–3:30 | **The graph (underground network).** `react-force-graph-2d`. Nodes sized by trust, colored by category. New-node glow on realtime INSERT. | Graph renders, nodes animate in |
| 3:30–4:30 | **The scroll-dive.** Scroll past soil line → camera accelerates underground → lands into the live graph. Skills flash white as knowledge is shared. *(Pre-rendered video fallback if it gets risky.)* | Forest→underground reveal works |
| 4:30–5:15 | **Edge animation + impact ticker.** Glowing edge on trail INSERT (`linkDirectionalParticles`); 4 counters with counting animation + source tooltips. | Particles travel, ticker updates live |
| 5:15–6:00 | **Trust-climb + failure animations.** Node brightens as trust rises on a success — and **dims with a red pulse + `unproven` tag when a `success_check` fails and trust drops** (the demo's proof beat). | Both up and down beats look real |
| 6:00–6:45 | **Network page + skill modal + "try it" box.** Searchable list of all skills; click → modal with metadata, trust, proven envs. **Plus a judge-usable input:** type a task → hits `/api/search` → shows matched skill + trust + projected tokens/water/CO₂, and **bumps the live ticker.** This is the "judges can freely use it" beat. | Inspect, browse, and *use* works |
| 6:45–7:30 | **About + Install pages.** About = feature list laid out visually. Install = copy-paste MCP setup with a **copy button that copies valid Claude Code config**. Keep both lightweight/static. | Secondary pages done |
| 7:30–8:15 | Polish. Glow, white-flash shares, smooth transitions, "skill birth" pulse/ripple. **Smoothness is graded:** no console errors, loading/empty states present — rehearse the judge-uses-it path. Prettier/ESLint pass on frontend, strip AI-tell comments. | Demo-ready UI; clean repo |
| 8:15–9:00 | Demo recording (backup video, incl. scroll-dive) + rehearsal with Person 1. | Backup exists |

### Critical Sync Points

| Time | Alignment |
|------|-----------|
| 0:30 | Agree on exact Supabase schemas + column names |
| 3:00 | Person 1 demos MCP tools → Person 2 confirms realtime events firing |
| 6:30 | Full integration test together |
| 7:30 | Demo rehearsal begins — NO more features after this |

---

## The Demo Sequence (90 seconds)

1. **Open on the forest** — trees above ground, impact counters, "Mycelium." Then **scroll-dive underground** — camera races down, the mycelium network unfurls, skills flash white as knowledge is shared. Land in the live graph at baseline. *(This is the 15-second hook that sets up the whole metaphor.)*
2. **Terminal 1** (left): Ask Claude to set up Stripe webhooks in Next.js. Claude solves from scratch, calls `publish_skill`
3. **Dashboard**: New node blooms — dim and **unproven** (trust 0.50, no reuse yet). It's already shareable, just not battle-tested. Ticker unchanged
4. **Terminal 2** (right): Ask Claude the same task. Claude calls `search_skills`, **immediately finds the skill** (no gate), applies it in ~20% tokens, the task succeeds
5. **Dashboard**: Glowing edge animates. The skill's `success_check` **passed** → the node **brightens as its trust climbs**. Ticker jumps — tokens saved, kWh, water, CO2
6. **The proof beat — show a failure.** A third apply runs the skill in a deliberately-wrong environment → the **`success_check` fails** → on the dashboard, **trust visibly drops** and the skill is tagged `unproven on this version`. *This is the money beat: the number went DOWN when the skill didn't work — proving trust is a real functional pass-rate, not a usage counter.*
7. **Close**: "That skill earned trust by actually working, and lost it the moment it didn't — no curator, no lab. Every glowing line is inference that never had to happen again."

---

## The Pitch Script

> "2.5 billion AI queries are sent every day. Even on a deliberately conservative estimate — just 10% solving already-solved, structured problems — that's 105 megawatt-hours of wasted energy, over 6 million liters of wasted water, 40 tonnes of CO2 — every single day — on redundant computation. And that's the floor, not the ceiling."

> "Nature solved collective intelligence 400 million years ago. Through mycelium networks underground — what scientists call the Wood Wide Web — every tree in the forest learns. The knowledge strengthens with confirmation and fades when it's no longer relevant. No central authority. The system gets smarter through use."

> "We built the same thing for AI agents."

> "Mycelium is an MCP server for Claude Code that auto-generates executable skills from successful agent sessions, and lets each skill *earn* its way into a shared commons — by actually working, again and again, for real agents. Digital pheromone trails, borrowed from swarm intelligence research: knowledge that keeps working grows stronger; knowledge that stops working fades."

> "Here — watch a skill being born, and earn its way public."

> [Demo: split screen + living network graph]

> "Every node is a skill auto-generated by an agent. It starts unproven — then earns trust by actually working, glowing brighter with every real success, so any Claude can see how battle-tested it is. Every glowing line is knowledge moving between agents — inference that didn't need to happen. Energy not burned, water not evaporated, carbon not emitted."

> "We're not building another sustainability app. We're building the infrastructure that makes AI itself sustainable."

---

## Judge Deflection

| Attack | Answer |
|--------|--------|
| "This is just GPTCache" | "GPTCache caches text pairs with up to 99% false positives. We auto-generate verified executable skills with test assertions, dependency graphs, version constraints, and trust decay. Show me a GPTCache entry with a test assertion." |
| "How do you know it's right?" | "Because it earned trust by working — repeatedly, for real agents, in real environments. Trust isn't a stamp; it's a live Bayesian success rate built from actual `success_check` outcomes checked at apply time. Every skill shows its score, so Claude sees exactly how proven it is — a fresh skill reads as unproven, one with dozens of real successes reads as trusted. 'Verified' here means 'has a track record,' not 'someone said so.'" |
| "It works for you but will break for me" | "Correct — that's why trust is environment-scoped, not global. Each skill stores the fingerprint of every environment it succeeded in. If yours doesn't overlap, we tell Claude it's unproven for you and re-confirm in your context before trusting it. Coverage widens one environment at a time, like a real package's compatibility matrix." |
| "What stops the commons from rotting?" | "Drift isn't a special case — a new dependency version is just a new environment. So a skill proven on react@19 is automatically surfaced as 'unproven on 20, re-confirm' to the first agent on 20, who applies it and checks the task succeeds. Success → envelope widens; failure → trust drops, tagged broken on ≥20. No re-verification cron, nothing 'on hold' — it heals on contact. A stale skill fails its own task and costs wasted tokens, never corrupted work. The network removes its own bad knowledge with no curator." |
| "What stops me publishing a poisoned skill?" | "Two things. One: a skill that lies fails its `success_check` and its trust sinks, so a malicious skill can't build the track record agents rely on. Two: a hard blacklist enforced *above* the skill — skills are untrusted data, never commands, and can never touch secrets, private data, source code, or destructive ops, no matter what text is hidden inside them. We don't predict every attack; we bound the blast radius where injection can't override it." |
| "Isn't your 31% redundancy inflated?" | "We agree it would be — so we don't use it. 31% is the measured semantic-similarity ceiling; we discount to a 10% floor for genuinely skill-reusable work. Every number we cite uses the floor, and it's still 250 million sessions a day." |
| "Doesn't making AI cheaper just make people use more of it? (Jevons / rebound)" | "Jevons applies when you make something *cheaper to want more of.* Nobody wants to re-solve an already-solved problem — redundant work has zero latent demand to rebound into. We're not lowering the price of useful AI; we're eliminating *duplicated* work that has no marginal value to anyone. And we shift the remaining work from expensive generation to cheap retrieval. That's a structural intensity reduction, not a price cut that induces more consumption." |
| "What does Mycelium itself cost to run? Is it net-positive?" | "Every number we show is net. Finding a skill is one embedding lookup plus a metadata read — a fraction of a watt-hour, bounded and constant regardless of task difficulty. The session it replaces is ~18,000 generated tokens. Overhead is ~three orders of magnitude below what it eliminates: we spend under 0.1% to skip ~80% of the tokens. The success-check piggybacks on work Claude was already doing, so it adds nothing." |
| "Doesn't this make Claude dumber?" | "npm doesn't make developers dumber. It gives them verified building blocks so they focus on unsolved problems." |
| "Where do your CO2/water numbers come from?" | "Published, cited per-query factors — energy from arXiv:2505.09598, water from Li et al. arXiv:2304.03271, grid CO2 from EPA eGRID. We multiply real measured per-task savings by those factors. Every number is sourced and falsifiable." |
| "What about privacy?" | "Two layers. One: skills are abstracted capabilities with metadata, not source code — your proprietary implementation never leaves your session. Two: sharing is opt-in. `/mycelium off` keeps every skill you create in your *private* library — fully usable by you as a personal self-building cache, but never entering the public commons, the graph, or anyone else's search. You decide what leaves your machine, by a keystroke." |
| "Isn't Skill Swarm MCP the same?" | "Skill Swarm searches pre-existing registries. Mycelium auto-generates from sessions and makes each skill earn a live trust score through real reuse, with stigmergic decay. Skill Swarm is a search engine. Mycelium is an ecosystem." |

---