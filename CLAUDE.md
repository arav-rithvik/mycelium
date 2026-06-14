# Mycelium — Project Guide for Claude Code

Mycelium is **"npm for agent knowledge"**: an MCP server that auto-generates reusable *skills* from
solved agent tasks, shares them in a commons (Supabase), and lets each skill earn a Bayesian trust
score by passing its `success_check` in real environments. Sustainability angle: every reuse is
inference (energy/water/CO₂) that never had to happen — measured live. Built for Milpitas Hacks 2.

## Read these first — the spec is law
- `mycelium_prd.md` — what & why (product requirements).
- `mycelium_contracts.md` — **the integration law**: exact shared types, DB schema, MCP tool I/O, API
  shapes. Do NOT invent shapes not written there. To change one: edit the contract doc first, then the
  code, then tell your partner.
- `mycelium_split.md` — who builds what + the schedule.
- `mycelium.md` — deep narrative / pitch / judge Q&A.

## Architecture
Monorepo (npm workspaces). Flow: **Claude Code ⇄ MCP server (stdio) ⇄ Supabase (Postgres + pgvector +
realtime) ⇄ web dashboard.**
```
shared/   @mycelium/shared — types, trust, env-math, fingerprint, embeddings (imported by mcp + web)
mcp/      the MCP server: 5 tools (search_skills, get_skill, publish_skill, report_apply, set_sharing)
web/      Next.js dashboard + /api routes   (api routes = backend, pages/components = frontend)
supabase/ schema.sql + seed.ts + check.ts
```

## Roles & ownership — do not edit the other person's folders
- **Person 1 — Backend (Arav, `backend` branch):** `shared/`, `mcp/`, `supabase/`, `web/app/api/`,
  `web/lib/supabase.ts`.
- **Person 2 — Frontend (Rithvik, `frontend` branch):** `web/app/*` pages, `web/components/`, styling.
- **The only shared file is `shared/src/types.ts`** — change it via the contract protocol above.

## Git workflow
- Branches: `main` (always green), `backend`, `frontend`. Work on your branch; when a chunk compiles
  **and** tests pass ("green"), commit → `git checkout main && git merge <branch> && git push` → switch
  back to your branch.
- `git pull` main before you merge. Push small + often. **Never push red** (it blocks your partner).
- Never commit `.env` / `.env.local` (gitignored). **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the
  browser — it is server-only (MCP + `/api`). The browser uses the `anon` key.

## Key technical decisions
- **Embeddings run locally** via `Supabase/gte-small` (`@xenova/transformers`), **384-dim**, no API key.
  (Contract originally specified OpenAI `text-embedding-3-small`/1536; we deliberately changed it — the
  schema is `vector(384)`.) Import `embed()` from `@mycelium/shared/embed` (server-only; intentionally
  NOT in the package barrel, to keep the model out of the web bundle).
- **Trust** = `bayesianTrust(s, f) = (s+1)/(s+f+2)` (Beta(1,1) prior). Only `success_check` outcomes move
  it — usage alone never does. **Environment compatibility** is scored in `shared/src/fingerprint.ts`.
- ESM everywhere. Run TS directly with `tsx` (no build step in dev). Typecheck = `tsc --noEmit`.
  Tests = **Vitest** (`npm test`) and must stay green — they're shown in the live code review.
- Supabase RLS is intentionally **off** for the hackathon (keeps realtime simple; auth is out of scope).

## Run
```bash
npm install
cp .env.example .env            # fill Supabase URL + anon + service_role keys (get from teammate)
# paste supabase/schema.sql into the Supabase SQL editor and run it
npm run seed                    # ~100 skills + local embeddings
npm run db:check                # verify tables + row counts
npm test                        # shared unit tests (must be green)
npm run mcp                     # start the MCP server (stdio)
npm run dev -w @mycelium/web    # dashboard at http://localhost:3000
```

## Scope discipline
The demo is the **homepage scroll + the live dashboard** — protect those above all. Out of scope:
auth/accounts, anti-poisoning, a verification sandbox (trust is earned at apply-time in the real env).
See `mycelium_prd.md` → "Scope discipline" + "Fallback scope". At feature-freeze: finish what's started,
start nothing new, cut what's broken.

## Working style
Both teammates are newer to this space and care about understanding *why*, not just shipping working
code — so explain non-trivial decisions and their tradeoffs. But this is a hackathon: keep momentum,
prefer reliable over clever, and never break the demo path.
