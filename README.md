# Mycelium

**The collective intelligence layer for AI agents. npm for agent knowledge.**

In a forest, no tree grows alone. Above ground each tree looks independent, but underground
a mycelium network connects their roots, letting every tree share water, nutrients, and what
it has learned. No central authority. The whole forest gets stronger through the connection.

AI agents today are the trees above ground. Every Claude session grows on its own, solving a
problem from scratch even when another agent, on another person's machine, solved the exact
same thing minutes ago. They are never connected, so the same work is done again and again.

Mycelium is the network underneath. It is an MCP server that gives AI coding agents a shared,
living memory. When an agent solves a real task, Mycelium auto-distills that session into a
named, versioned, executable **skill** and shares it across a common network. The next agent
that hits the same task discovers the skill, reuses it instead of reasoning from scratch, and
verifies it actually worked. The agents stop growing alone and start growing together, and
every reuse is inference that never had to happen.

---

## The problem

- Roughly 2.5 billion AI queries are sent every day, and a large share re-solve problems
  that have already been solved.
- Inference, not training, is now the dominant footprint. Serving a model for a few months
  produces more carbon than training it once.
- On a deliberately conservative floor, the redundant work alone wastes on the order of
  hundreds of megawatt-hours, millions of liters of water, and tens of tonnes of CO2 every
  single day.

Existing tools do not fix this. Semantic caches store text pairs with high false-positive
rates, are single-tenant, and have no notion of whether an answer actually works. Mycelium
shares verified, executable skills across agents, and measures the savings instead of
estimating them.

This is a sustainability project where the infrastructure itself is the sustainability angle:
we cut AI's own footprint, and we count the savings in real tokens that were never generated.

---

## How it works

1. **Solve once.** An agent solves a real task (set up auth, wire a webhook, fix a build).
2. **Distill.** Mycelium turns that success into a reusable, executable skill, complete with
   a name, version, dependencies, and an executable success-check.
3. **Share.** The skill joins a shared commons and is discoverable instantly.
4. **Reuse.** The next agent searches the commons, reads the skill's track record, and applies
   it in a fraction of the tokens.
5. **Earn trust.** The skill runs its own success-check in the real environment. That pass or
   fail is the only thing that moves its trust score, so good knowledge rises and broken
   knowledge fades, with no curator.

---

## The 5 MCP tools

Mycelium exposes its capability to the agent through five MCP tools. The agent reasons over
them and decides; it is never blindly injected.

| Tool | What it does |
| --- | --- |
| `search_skills` | Semantic search (pgvector) over the commons. Returns ranked matches with full metadata and a compatibility score for the requester's environment. |
| `get_skill` | Returns the full skill plus a per-message savings footer the agent appends to its reply. |
| `publish_skill` | Distills a solved task into a named, versioned, dependency-tagged, check-backed skill and publishes it. |
| `report_apply` | Runs the skill's `success_check` and records the real pass or fail. This is the only signal that moves trust, widens the proven environment envelope, and updates the impact totals. |
| `set_sharing` | The privacy toggle (`/mycelium on` and `/mycelium off`). Keep new skills in a private library, or share them to the public commons. |

---

## Core ideas

**Skills, not caches.** A skill is a named, versioned, dependency-pinned, executable unit with
its own success-check, discoverable like an npm package. It is not a text blob you paste and
hope works.

**Trust you can watch fall.** Trust is a live Bayesian pass-rate from real outcomes:
`(successes + 1) / (successes + failures + 2)`. Usage alone earns nothing. A skill used twenty
times but broken eighteen of them has low trust. One real failure drops the score immediately.

**Proven for your machine.** Trust is conditioned on the environment fingerprint (framework,
version, OS, key dependencies). A skill proven on `react@19` is surfaced as "unproven,
re-confirm" to an agent on `react@20`. Coverage widens one environment at a time, like a real
package's compatibility matrix.

**It heals on contact.** A new dependency version is just a new point in environment space. The
first agent on it re-confirms the skill; success widens the proven envelope, failure prunes it.
There is no re-verification cron and nothing rots.

**Skills are data, never commands.** A poisoned skill cannot build a track record because it
fails its own success-check, and a hard capability blacklist keeps skills from touching secrets,
private data, source, or destructive operations no matter what text hides inside.

**Measured, not modeled.** Savings are counted in real tokens that were never generated, at
apply time, then converted to energy, water, and CO2 through published, cited per-query factors.
Every figure is sourced and falsifiable.

---

## What is in this repository

This is an npm-workspaces monorepo.

```
web/        Next.js (App Router) site and live dashboard for the commons
mcp/        the MCP server that exposes the five tools
shared/     shared TypeScript contract: types, environmental math, trust, fingerprinting
supabase/   database schema (Postgres + pgvector + realtime) and seed data
```

The `web` workspace contains the public site, a scroll-driven explainer of the problem, the
solution, and the feature set, plus the live dashboard, which visualizes the commons as a
growing network of skills with a real-time impact ticker.

---

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion.
- **Backend:** TypeScript MCP server built on the Model Context Protocol SDK.
- **Data:** Supabase (Postgres with the `pgvector` extension for semantic search, plus realtime
  subscriptions that drive the live dashboard).
- **Embeddings:** `text-embedding-3-small` for skill search.

---

## Running it locally

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env          # fill in Supabase and embedding keys
# run supabase/schema.sql in the Supabase SQL editor
npm run seed                  # seed the commons with starter skills
npm test                      # shared unit tests (trust, env-math, fingerprint)
npm run web                   # start the site and dashboard
npm run mcp                   # start the MCP server
```

To use the MCP server from an agent, register it with your MCP client and the five tools become
available. After solving something new the agent can publish it; before starting a task it can
search the commons and reuse what already works.

---

## Why it matters

We are not building another sustainability app. We are building the infrastructure that makes AI
itself more sustainable. Agents stop growing alone and start growing together. Knowledge that
keeps working grows stronger, knowledge that stops working fades, and no problem has to be solved
twice.
