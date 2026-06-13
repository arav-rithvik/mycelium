# 🍄 Mycelium — the collective intelligence layer for AI agents

**npm for agent knowledge.** An MCP server that auto-generates reusable *skills* from successful
agent sessions, shares them across a living commons, and lets each skill *earn* a live trust score
by actually working — so agents stop re-solving solved problems, and every reuse is inference that
never had to happen (energy, water, and carbon saved, measured live).

> Built at Milpitas Hacks 2 (sustainability track). The infrastructure *is* the sustainability angle:
> we cut AI's own footprint and **measure** the cut instead of estimating it.

## How it works (one diagram)

```
  Claude Code  ──(MCP stdio)──►  mycelium MCP server  ──►  Supabase (Postgres + pgvector + realtime)
   search / get / publish              5 tools                 skills · trails · stats · settings
   report_apply / set_sharing            │                            │
                                         │                            └─(realtime)─► web dashboard
                                         └── @mycelium/shared ──────────────────────►  (graph + ticker)
                                             trust · env-math · fingerprint · embeddings
```

- **search_skills** — real pgvector cosine-similarity search over skill-description embeddings.
- **get_skill** — full skill content + a ready-to-print per-message savings footer.
- **publish_skill** — distills a solved task into a named, versioned, check-backed skill.
- **report_apply** — runs the skill's `success_check` outcome → moves Bayesian trust + impact stats.
- **set_sharing** — the `/mycelium on|off` privacy toggle (public commons vs private library).

## Repo layout

```
shared/   @mycelium/shared — types, trust, env-math, fingerprint, embeddings (imported by mcp + web)
mcp/      the MCP server (Person 1)
web/      Next.js dashboard + /api routes (api: Person 1, pages: Person 2)
supabase/ schema.sql + seed.ts
```

## Run it

```bash
npm install
cp .env.example .env            # fill in Supabase URL + keys
# run supabase/schema.sql in the Supabase SQL editor, then:
npm run seed                    # 20 starter skills with local embeddings
npm test                        # shared pure-function unit tests
npm run mcp                     # start the MCP server (stdio)
npm run dev -w @mycelium/web    # the dashboard at http://localhost:3000
```

Embeddings run **locally** via `Supabase/gte-small` (`@xenova/transformers`) — no API key required.

## License

MIT — see [LICENSE](./LICENSE).
