# Mycelium — Contracts (the integration law)

> **These shapes are LAW. If both people honor them, the code merges cleanly.**
> Backend (Person 1) implements them. Frontend (Person 2) consumes them. Neither side invents shapes not written here — if you need a new field, change it HERE first and tell the other person (it's the only file you both edit).
> Lock the **Shared Types** and **DB schema** at the 0:30 sync. Person 1 pushes `shared/` + `schema.sql` FIRST so Person 2 is unblocked.

---

## 0. Repo structure (npm workspaces)

```
mycelium/
  package.json            # { "workspaces": ["shared","mcp","web"] }
  tsconfig.base.json
  .env.example
  .gitignore
  README.md               # pitch + setup + "npm test" (rubric: Quality of Code)
  shared/                 # @mycelium/shared — THE CONTRACT CODE both sides import
    package.json
    src/
      index.ts            # re-exports everything
      types.ts            # all shared types (below)
      constants.ts        # env factors, reuse factor, categories
      env-math.ts         # tokens -> impact; savings; footer formatter
      trust.ts            # Bayesian trust
      fingerprint.ts      # env fingerprint + compatibility
  mcp/                    # @mycelium/mcp — the MCP server (Person 1)
    package.json
    src/
      index.ts            # server entry, registers 4 tools
      supabase.ts         # service-role client
      tools/{search,get,publish,report}.ts
  web/                    # @mycelium/web — Next.js (Person 2 owns UI; Person 1 owns /api)
    package.json
    next.config.js        # transpilePackages: ["@mycelium/shared"]
    app/
      page.tsx            # HOMEPAGE — the scroll story (Person 2)
      dashboard/page.tsx  # DASHBOARD — live commons: full graph + skill list + "how it works" panel + "try it" box (Person 2)
      install/page.tsx    # MCP setup + /mycelium on|off docs (Person 2, lightweight)
      api/
        skills/route.ts   # Person 1
        stats/route.ts    # Person 1
        trails/route.ts   # Person 1
        search/route.ts   # Person 1 (powers "try it")
    components/           # Person 2, freeform
    lib/supabase.ts       # browser anon client (Person 1 stubs, Person 2 uses)
  supabase/
    schema.sql            # Person 1
    seed.ts               # Person 1
```

`web` imports shared via `transpilePackages: ["@mycelium/shared"]` in `next.config.js`. All three workspaces use `tsconfig.base.json`.

---

## 1. Shared types — `shared/src/types.ts` (CANONICAL)

```ts
// An environment fingerprint: where a skill was proven, or where a requester is.
export interface EnvFingerprint {
  framework?: string;        // "nextjs"
  frameworkVersion?: string; // "15.2"  (semver-ish string)
  os?: string;               // "darwin" | "linux" | "win32"
  runtime?: string;          // "node@20"
  deps?: Record<string, string>; // { "@supabase/ssr": "0.5.1" }
}

export type SkillCategory =
  | "auth" | "payments" | "database" | "frontend"
  | "devops" | "api" | "testing" | "other";

export type Visibility = "public" | "private";

// A full skill row (matches the `skills` table).
export interface Skill {
  id: string;
  name: string;                 // "nextjs-supabase-auth"
  description: string;          // one line, this is what gets embedded
  category: SkillCategory;
  framework: string;            // "nextjs"
  content: string;              // full skill body (markdown/yaml)
  success_check: string;        // human-readable assertion, e.g. "GET /auth/callback => 302"
  trust_score: number;          // 0..1, Bayesian, derived & stored
  success_count: number;
  failure_count: number;
  tokens_to_create: number;     // baseline cost to solve from scratch (for savings math)
  proven_envs: EnvFingerprint[];
  visibility: Visibility;       // "private" = only the owner can discover it; "public" = in the commons
  owner_id: string | null;      // who published it (null for seeded/public-origin skills)
  created_at: string;           // ISO
}

// Per-owner sharing toggle (matches the `settings` table). sharing_enabled=false => new skills publish PRIVATE.
export interface SharingState {
  owner_id: string;
  sharing_enabled: boolean;     // default true
}

// A reuse / apply event (matches the `trails` table).
export interface Trail {
  id: string;
  skill_id: string;
  task_type: string;
  approach: string;
  success: boolean;
  environment: EnvFingerprint;
  tokens_used: number;          // actual tokens this apply
  tokens_saved: number;         // baseline - actual
  timestamp: string;            // ISO
}

// Global aggregate (matches the singleton `stats` table, id=1).
export interface Stats {
  id: number;                   // always 1
  total_tokens_saved: number;
  total_energy_wh: number;
  total_water_ml: number;
  total_co2_g: number;
  total_reuses: number;
  updated_at: string;
}

// Environmental impact of some number of tokens.
export interface Impact {
  tokens: number;
  energyWh: number;
  waterMl: number;
  co2g: number;
}

// A search result row (returned by search_skills + POST /api/search).
export interface SkillMatch {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  trust_score: number;
  similarity: number;     // 0..1 cosine similarity from pgvector
  compatibility: number;  // 0..1 vs requester env (1 if no env given)
  proven_envs: EnvFingerprint[];
  projected_savings: Impact; // what reusing it would save (baseline * REUSE_SAVED_FRACTION)
}
```

---

## 2. Constants — `shared/src/constants.ts`

```ts
// --- Environmental conversion (per-query published factors, converted per-token) ---
// We convert published per-QUERY factors to per-TOKEN using a documented assumption
// of TOKENS_PER_QUERY. This assumption is stated openly; every factor is sourced.
export const TOKENS_PER_QUERY = 500;          // documented assumption
export const ENERGY_WH_PER_QUERY = 0.42;      // arXiv:2505.09598
export const WATER_ML_PER_QUERY  = 10;        // Li et al. arXiv:2304.03271 (low end = conservative)
export const CO2_G_PER_QUERY     = 0.16;      // 0.42 Wh * 386 gCO2/kWh (EPA eGRID)

export const ENERGY_WH_PER_TOKEN = ENERGY_WH_PER_QUERY / TOKENS_PER_QUERY; // 0.00084
export const WATER_ML_PER_TOKEN  = WATER_ML_PER_QUERY  / TOKENS_PER_QUERY; // 0.02
export const CO2_G_PER_TOKEN     = CO2_G_PER_QUERY      / TOKENS_PER_QUERY; // 0.00032

// Reusing a skill costs ~20% of solving from scratch -> ~80% saved.
export const REUSE_SAVED_FRACTION = 0.8;

// Embeddings
export const EMBED_MODEL = "text-embedding-3-small";
export const EMBED_DIM = 1536;
```

---

## 3. Environmental math — `shared/src/env-math.ts` (PURE, unit-tested)

```ts
import { Impact } from "./types";
import {
  ENERGY_WH_PER_TOKEN, WATER_ML_PER_TOKEN, CO2_G_PER_TOKEN, REUSE_SAVED_FRACTION,
} from "./constants";

/** Convert a token count into environmental impact. Pure. */
export function tokensToImpact(tokens: number): Impact {
  return {
    tokens,
    energyWh: tokens * ENERGY_WH_PER_TOKEN,
    waterMl:  tokens * WATER_ML_PER_TOKEN,
    co2g:     tokens * CO2_G_PER_TOKEN,
  };
}

/** Tokens saved by reusing instead of re-solving. If actual unknown, estimate. */
export function tokensSaved(tokensToCreate: number, actualTokens?: number): number {
  if (actualTokens == null) return Math.round(tokensToCreate * REUSE_SAVED_FRACTION);
  return Math.max(0, tokensToCreate - actualTokens);
}

/** The per-message footer Claude appends. `proven` => "proven on your env" vs "unproven — re-confirm". */
export function formatFooter(opts: {
  skillName: string; trustScore: number; tokensSaved: number; proven: boolean; isPrivate?: boolean;
}): string {
  const i = tokensToImpact(opts.tokensSaved);
  const water = i.waterMl >= 1000 ? `${(i.waterMl/1000).toFixed(2)} L` : `${Math.round(i.waterMl)} mL`;
  const env = opts.proven ? "proven on your env" : "unproven — re-confirm";
  const priv = opts.isPrivate ? " · 🔒 private" : "";
  return [
    `---`,
    `🍄 Mycelium saved ~${opts.tokensSaved.toLocaleString()} tokens this turn → ` +
      `${i.energyWh.toFixed(1)} Wh · ${water} water · ${i.co2g.toFixed(1)} g CO₂ not emitted`,
    `   (skill: ${opts.skillName} · trust ${opts.trustScore.toFixed(2)} · ${env}${priv})`,
  ].join("\n");
}
```

---

## 4. Trust — `shared/src/trust.ts` (PURE, unit-tested)

```ts
/** Bayesian posterior mean pass-rate. Usage alone never moves this; only outcomes do. */
export function bayesianTrust(successCount: number, failureCount: number): number {
  return (successCount + 1) / (successCount + failureCount + 2);
}
```

## 5. Fingerprint compatibility — `shared/src/fingerprint.ts` (PURE, unit-tested)

```ts
import { EnvFingerprint } from "./types";

/** 0..1 overlap of a requester env against ONE proven env. */
export function envSimilarity(req: EnvFingerprint, proven: EnvFingerprint): number { /* impl */ return 0; }

/** Best compatibility of a requester env against the skill's proven envelope.
 *  Returns 1 when `req` is empty/undefined (no env constraint to fail). */
export function compatibility(req: EnvFingerprint | undefined, provenEnvs: EnvFingerprint[]): number {
  if (!req || Object.keys(req).length === 0) return 1;
  if (provenEnvs.length === 0) return 0.5; // brand new, unproven anywhere
  return Math.max(...provenEnvs.map(p => envSimilarity(req, p)));
}

/** Is `req` already inside the proven envelope (compatibility >= threshold)? */
export function isProven(req: EnvFingerprint | undefined, provenEnvs: EnvFingerprint[], threshold = 0.7): boolean {
  return compatibility(req, provenEnvs) >= threshold;
}
```

---

## 6. Database schema — `supabase/schema.sql`

```sql
create extension if not exists vector;

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null default 'other',
  framework text,
  content text not null,
  success_check text not null,
  embedding vector(1536),
  trust_score double precision not null default 0.5,
  success_count int not null default 0,
  failure_count int not null default 0,
  tokens_to_create int not null default 10000,
  proven_envs jsonb not null default '[]'::jsonb,
  visibility text not null default 'public',   -- 'public' | 'private'
  owner_id text,                                -- publisher; null for seeded/public-origin skills
  created_at timestamptz not null default now()
);
create index on skills (visibility);
create index on skills (owner_id);

-- per-owner sharing toggle (the /mycelium on|off state)
create table settings (
  owner_id text primary key,
  sharing_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table trails (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  task_type text,
  approach text,
  success boolean not null,
  environment jsonb not null default '{}'::jsonb,
  tokens_used int not null default 0,
  tokens_saved int not null default 0,
  timestamp timestamptz not null default now()
);

create table stats (
  id int primary key default 1,
  total_tokens_saved bigint not null default 0,
  total_energy_wh double precision not null default 0,
  total_water_ml double precision not null default 0,
  total_co2_g double precision not null default 0,
  total_reuses int not null default 0,
  updated_at timestamptz not null default now()
);
insert into stats (id) values (1) on conflict do nothing;

-- pgvector cosine-similarity search RPC used by search_skills + /api/search.
-- Privacy rule: returns PUBLIC skills + the requester's OWN private skills. Never another owner's private skill.
-- requester_id = null (e.g. the public dashboard) => public skills only.
create or replace function match_skills(query_embedding vector(1536), requester_id text default null, match_count int default 8)
returns table (id uuid, name text, description text, category text, trust_score double precision,
               proven_envs jsonb, tokens_to_create int, visibility text, owner_id text, similarity double precision)
language sql stable as $$
  select s.id, s.name, s.description, s.category, s.trust_score, s.proven_envs, s.tokens_to_create,
         s.visibility, s.owner_id,
         1 - (s.embedding <=> query_embedding) as similarity
  from skills s
  where s.embedding is not null
    and (s.visibility = 'public' or s.owner_id = requester_id)
  order by s.embedding <=> query_embedding
  limit match_count;
$$;

-- enable realtime (Person 2 subscribes from the browser). settings optional (toggle indicator).
alter publication supabase_realtime add table skills, trails, stats, settings;
```

**Fallback if embeddings fail:** add a `tsvector` column + GIN index and swap `match_skills` for full-text ranking. Same return shape, so nothing downstream changes.

---

## 7. MCP tools — `mcp/src/tools/*` (I/O contract)

Server registers 5 tools. **3 discovery + 1 trust + 1 privacy toggle.** All inputs/outputs are JSON.
The server resolves `owner_id` from env `MYCELIUM_OWNER_ID` (see §10) on every call.

### `search_skills`
```
input:  { query: string, environment?: EnvFingerprint, limit?: number /* default 8 */ }
output: { matches: SkillMatch[] }
        // embed query -> match_skills(embedding, owner_id, limit) -> add compatibility + projected_savings.
        // Returns PUBLIC skills + the caller's OWN private skills. Never another owner's private skill.
```

### `get_skill`
```
input:  { id: string, environment?: EnvFingerprint }
output: { skill: Skill, footer: string }   // formatFooter(...) — Claude appends to its reply
        // 403/error if the skill is private and owner_id != caller. Footer notes "(private)" for own private skills.
```

### `publish_skill`
```
input: {
  name: string, description: string, category: SkillCategory, framework: string,
  content: string, success_check: string, tokens_to_create: number, environment: EnvFingerprint,
  visibility?: Visibility   // optional one-off override; if omitted, uses the caller's current sharing toggle
}
output: { id: string, trust_score: number, visibility: Visibility }
        // visibility = input.visibility ?? (settings.sharing_enabled ? 'public' : 'private'); sets owner_id = caller.
        // embeds description; inserts at trust 0.5; proven_envs=[]. PRIVATE skills do NOT enter the public commons/graph.
```

### `set_sharing`  (the /mycelium on | off toggle)
```
input:  { enabled: boolean }
output: { owner_id: string, sharing_enabled: boolean }
        // upserts settings(owner_id, sharing_enabled). When false, future publishes default to PRIVATE.
        // Does NOT retroactively change already-published skills (use publish visibility override or a future re-share).
```

### `report_apply`  (the trust + impact engine — drives the demo's climb/drop beats)
```
input:  { skill_id: string, success: boolean, environment: EnvFingerprint, tokens_used?: number }
output: { trust_score: number, success_count: number, failure_count: number,
          impact: Impact, footer: string }
behavior (single transaction):
  1. insert a trails row (tokens_saved = tokensSaved(skill.tokens_to_create, tokens_used))
  2. success ? success_count++ : failure_count++
  3. trust_score = bayesianTrust(success_count, failure_count)
  4. if success && env is a NEW fingerprint -> append to proven_envs
  5. if success -> increment stats (tokens_saved + tokensToImpact(...))
  6. return updated trust + impact + formatFooter(...)
```

Realtime fires automatically on these writes → the graph and ticker react with no extra wiring.

---

## 8. HTTP API — `web/app/api/*` (Person 1 implements, Person 2 consumes)

```
GET  /api/skills          -> { skills: Skill[] }            // graph nodes + network list — PUBLIC ONLY (where visibility='public')
GET  /api/stats           -> { stats: Stats }               // ticker initial value
GET  /api/trails?limit=50 -> { trails: Trail[] }            // recent edges
POST /api/search          -> body { query: string, environment?: EnvFingerprint }
                             -> { matches: SkillMatch[] }    // powers the "try it" box; requester_id=null => PUBLIC ONLY
```

All responses are JSON, 200 on success, `{ error: string }` + 4xx/5xx on failure. CORS not needed (same origin).
**The dashboard is the public commons** — `/api/skills` and `/api/search` must filter `visibility='public'`. Private skills never reach the browser. (A user's own private library lives only in their MCP session, via `search_skills` with their `owner_id`.)

---

## 9. Realtime channels (Person 2 subscribes directly via supabase-js)

```ts
// browser, lib/supabase.ts client
supabase.channel('skills').on('postgres_changes',
  { event: '*', schema: 'public', table: 'skills' }, handler)   // INSERT = node born; UPDATE = trust changed
supabase.channel('trails').on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'trails' }, handler) // = reuse edge animation
supabase.channel('stats').on('postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'stats' }, handler)  // = ticker bump
```

Row payloads match the `Skill` / `Trail` / `Stats` types in §1 exactly.

---

## 10. Environment variables — `.env.example`

```
# Supabase (shared)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # browser realtime read
SUPABASE_SERVICE_ROLE_KEY=            # server only (mcp + /api) — NEVER expose to browser
# Embeddings
OPENAI_API_KEY=                       # text-embedding-3-small
# Identity (MCP server) — who owns skills this client publishes; scopes private skills.
MYCELIUM_OWNER_ID=                    # any stable string/UUID per install (defaults to "local" if unset)
```

Both people use the **same Supabase project** (one URL/keys, shared in your private chat). Frontend can develop against seeded data immediately once Person 1 has run `schema.sql` + `seed.ts`.

---

## 11. Slash commands — `/mycelium on` & `/mycelium off` (privacy toggle UX)

The toggle is driven by the `set_sharing` MCP tool, surfaced as Claude Code slash commands so a user can flip it in one keystroke. Ship these two files in the repo (they get copied to the user's `.claude/commands/` at install — covered on the Install page):

`.claude/commands/mycelium-off.md`
```md
---
description: Stop sharing new Mycelium skills publicly — keep them in your private library
---
Call the Mycelium `set_sharing` tool with `{ "enabled": false }`. Then confirm to the user:
"🔒 Mycelium sharing OFF — new skills you create are saved to your private library only, not the public commons."
```

`.claude/commands/mycelium-on.md`
```md
---
description: Share new Mycelium skills with the public commons
---
Call the Mycelium `set_sharing` tool with `{ "enabled": true }`. Then confirm to the user:
"🌐 Mycelium sharing ON — new skills you create join the public commons and earn trust through real reuse."
```

**Semantics:** the toggle affects **future** publishes only (it doesn't retroactively pull skills you already shared). Private skills are fully usable by their owner (single-player value: your own self-building cache) but never appear in the public graph, `/api/skills`, the "try it" box, or other users' searches. A one-off `publish_skill { visibility: "public" }` can override the current mode for a single skill.

**Footer note:** when a private skill is applied, `formatFooter` appends ` · 🔒 private` so the user can see it stayed local.

---

## Contract change protocol

`shared/src/types.ts` and this file are the only things you both touch. To change a shape:
1. Edit it **here** first, 2. ping the other person in chat, 3. update `shared/`, 4. push immediately so the other rebuilds against it. Never silently add a field the other side can't see.
