# 🍄 Mycelium — the collective intelligence layer for AI agents

**npm for agent knowledge.** An MCP server that lets Claude auto-generate reusable _skills_ from solved
tasks, share them in a live commons, reuse them by **meaning** (real vector search), and let each skill
_earn_ a trust score by actually working — so agents stop re-solving solved problems. Every reuse is
inference that never had to happen: **energy, water, and carbon saved, measured live.**

> Built at Milpitas Hacks 2 (sustainability track). The infrastructure _is_ the sustainability angle —
> we cut AI's own footprint and **measure** the cut instead of estimating it.

---

## How it works

```
   Claude Code ──(MCP)──► mycelium server ──► Supabase (Postgres + pgvector + realtime)
    search / get               4 tools              skills · trails · stats
    publish / report             │                         │
                                 │                         └─(realtime)─► live dashboard
                                 └── @mycelium/shared ───────────────────►  (graph + impact ticker)
                                     trust · env-math · fingerprint · embeddings
```

**The loop:** Claude `search_skills` before a task → semantic match in the commons → `get_skill` → applies
it for ~20% of the from-scratch tokens → `report_apply` runs the skill's `success_check` outcome, which
moves the skill's **Bayesian trust** up (success) or down (failure) and grows the live impact totals.

## The 4 MCP tools

| Tool            | What it does                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_skills` | **Real pgvector cosine-similarity** search over skill-description embeddings. Returns ranked matches with trust + environment compatibility + projected savings. |
| `get_skill`     | Returns a skill's full runbook + a ready-to-print **per-message savings footer**.                                                                                |
| `publish_skill` | Distills a solved task into a named, versioned, check-backed skill in the commons (trust 0.50).                                                                  |
| `report_apply`  | Records a `success_check` outcome → moves Bayesian trust (up/down), widens the proven-environment set, and updates the impact totals.                            |

_Privacy is by connection: if you don't want to contribute, don't connect the MCP. (No per-skill privacy
system — a deliberate hackathon cut.)_

## Why it's real engineering, not vibes

- **Real semantic search.** Skill descriptions are embedded with a local model (`Supabase/gte-small`,
  384-dim, no API key) and searched with pgvector cosine distance — not keyword matching. _"set up stripe
  webhooks"_ finds a skill described as _"handle Stripe payment events"_ at 94% by meaning.
- **Earned trust, Bayesian.** `trust = (successes + 1) / (successes + failures + 2)` — the mean of a
  Beta(1,1) prior. A new skill is exactly 0.50; one success → 0.67; it **drops** on a real failure. Usage
  alone never moves it — only `success_check` outcomes do. (See `shared/src/trust.ts`.)
- **Environment-scoped.** A skill proven on `react@19` is surfaced as _"unproven — re-confirm"_ on
  `react@21`; coverage widens one environment at a time. (See `shared/src/fingerprint.ts`.)
- **Measured impact.** Tokens saved → energy/water/CO₂ via published, cited per-token factors. We observe
  savings; we don't model them. (See `shared/src/env-math.ts` + `shared/src/constants.ts`.)
- **Realtime, not polling.** Every DB write fans out over Supabase realtime → the dashboard reacts.

## Repo layout

```
shared/   @mycelium/shared — types, trust, env-math, fingerprint, embeddings (imported by mcp + web)
mcp/      the MCP server — stdio (local) + http.ts (remote/Railway)
web/      Next.js dashboard + /api routes (graph, ticker, edges, "try it" search)
supabase/ schema.sql (4 tables + pgvector match_skills RPC) + seed.ts (100 skills, 5 real runbooks)
```

## Run it locally

```bash
npm install
cp .env.example .env            # add your Supabase URL + anon + service_role keys
# paste supabase/schema.sql into the Supabase SQL editor and run it
npm run seed                    # 100 skills with local embeddings
npm run db:check                # verify tables + row counts
npm test                        # shared unit tests (21 passing)
npm run mcp                     # start the MCP server (stdio)
npm run dev -w @mycelium/web    # dashboard at http://localhost:3000
```

## Add it to Claude Code

**Local (stdio):**

```bash
claude mcp add mycelium -- npx tsx /ABS/PATH/mycelium/mcp/src/index.ts
```

**Remote (after deploying — see [DEPLOY.md](./DEPLOY.md)):**

```bash
claude mcp add --transport http mycelium https://<your-url>/mcp
```

## Make it automatic (recommended)

Installing the MCP makes the tools _available_; to make Claude use them **automatically** — search before
every task, apply, report, no prompting — add this to your `CLAUDE.md` (global `~/.claude/CLAUDE.md` or a
project one):

> **Mycelium (always on).** You have the Mycelium MCP. On every non-trivial setup/integration task:
> (1) call `search_skills` **first** (with the user's environment) — silently, don't announce it;
> (2) if a result is a strong match, `get_skill` and **apply it** — don't paste the runbook back, just
> apply it, summarize what you did in ~2 lines, and append the savings footer the tool returns;
> (3) after applying, run the skill's `success_check` and call `report_apply` with the **real** outcome;
> (4) if nothing matched and you solved something reusable from scratch, `publish_skill` it.
> Keep narration minimal — the experience should just be _faster_, not a tour of the tools.

The MCP makes Mycelium possible; this instruction makes it **invisible** — the user never asks for it and
never sees a different workflow, only a faster one.

## Tests

```bash
npm test    # Vitest — trust, env-math, fingerprint (21 passing)
```

## License

MIT — see [LICENSE](./LICENSE).
