# Mycelium — Work Split & Build Plan

> **Both people keep this file open.** It tells each of you what YOU build, what the OTHER person is building, when to push, when to pull, and when to test — so we can run a tight **build → push → test → repeat** loop without colliding.
> Pair this with `mycelium_prd.md` (what/why) and `mycelium_contracts.md` (exact shapes).

---

## Team & roles

| | Person 1 — **Backend** | Person 2 — **Frontend + Demo Lead (Rithvik)** |
|---|---|---|
| Owns | `shared/`, `mcp/`, `supabase/`, `web/app/api/`, `web/lib/supabase.ts` | `web/app/*` (pages), `web/components/`, styling — the **Homepage scroll** + the **Dashboard** |
| Core job | MCP tools, pgvector search, trust + env-math, Supabase, API, seed data | Homepage scroll story, Dashboard (live graph + "how it works" + "try it" box), the demo |
| Mantra | "Shapes match the contract; realtime fires on every write." | "The scroll IS the explanation. I direct the look; backend feeds the data." |

**Rithvik directs the frontend look live.** The contracts give the UI its data; the visual design is the creator's call, not a spec.

---

## The working loop (build → push → test → repeat)

We both push to **`main`**. Folder ownership means we almost never touch the same file (the only shared file is `shared/src/types.ts` + the contract doc — change those by the protocol in the contracts file).

**Every loop, each person:**
1. `git pull --rebase origin main`  ← pull the other person's latest first
2. Build your slice (one coherent chunk).
3. `npm run build` + your local test (see "Test gates" below). **Don't push red.**
4. `git add -p && git commit && git push`
5. Ping the other person: *"pushed X — pull when you can."*

**Golden rules**
- **Pull before you push.** Always rebase on their latest.
- **Push small and often** (every 30-60 min), so integration is continuous, not a big-bang at the end.
- **Never push a build that doesn't compile.** Red `main` blocks the other person.
- **Person 1 pushes the foundation FIRST** (see 0:00-0:45) so Person 2 is never blocked.

---

## Test gates (what "passing" means at each push)

| Layer | Command | Green = |
|---|---|---|
| Shared pure fns | `npm test -w shared` | env-math + trust + fingerprint unit tests pass |
| Build | `npm run build` | all 3 workspaces compile |
| MCP | `npx @modelcontextprotocol/inspector` or a script | 4 tools list + return contract shapes |
| API | `curl localhost:3000/api/{skills,stats,trails}` + POST `/api/search` | JSON matches §8 shapes |
| Realtime | publish a skill → graph node appears without refresh | INSERT event fires |
| End-to-end | install MCP in Claude Code, run the demo flow | publish → search → report_apply → ticker moves |

---

## Schedule (≈9 hours — compress/expand to your actual clock; eat at the breaks)

Times are offsets from "go". **Bold = sync point, both stop and align.**

| Time | Person 1 (Backend) | Person 2 (Frontend/Rithvik) |
|---|---|---|
| 0:00–0:30 | **JOINT: lock `shared/src/types.ts` + `schema.sql` against `mycelium_contracts.md`. Create repo, npm workspaces, `.env.example`, push skeleton.** | (same — do this together) |
| 0:30–0:45 | Supabase project: run `schema.sql`, enable realtime, `match_skills` RPC. **Push `shared/` (types, constants, stubs) + working Supabase creds in chat.** | Next.js scaffold (`/`, `/dashboard`, `/install`), install `react-force-graph-2d` + supabase-js, `transpilePackages`. |
| 0:45–1:30 | `seed.ts`: 20 skills, varied trust/envs, real embeddings. `npm run seed`. | **Homepage scroll skeleton** — forest (above ground), tagline, ticker placeholders, the scroll-stop scaffolding. Connect realtime client. |
| 1:30–3:00 | MCP core: `search_skills` (embed → `match_skills` → compatibility + projected_savings), `get_skill` (+footer), `publish_skill`. | **Dashboard graph:** nodes from `GET /api/skills`, sized by trust, colored by category; new-node glow on realtime INSERT. |
| 3:00 | **SYNC: P1 demos MCP tools (inspector). P2 confirms realtime INSERT → node appears.** | **SYNC** (same) |
| 3:00–4:00 | `report_apply`: trail insert, success/failure counts, Bayesian trust recompute, proven_envs widen, stats update, returns footer. | **Homepage scroll-dive:** forest → dive underground → connection preview → "explore the live commons →" handoff to `/dashboard`. (Video fallback ready.) |
| 4:00–5:00 | Env-math layer wired into report_apply + write `npm test -w shared` (env-math, trust, fingerprint). | **Dashboard edge animation + ticker:** glowing edge on trail INSERT (`linkDirectionalParticles`); 4 counters count up; source tooltips. |
| 5:00–5:30 | `match_skills` tuning + `/api/search` route + **privacy toggle** (`set_sharing` tool, `visibility`/`owner_id` filtering, `.claude/commands/mycelium-on|off.md`). | **Homepage feature + technical beats** — each scroll reveal teaches a feature while the network behaves; the Technical beat (MCP/pgvector/trust). (Creator-directed.) |
| 5:30–6:30 | API routes `/api/skills`, `/api/stats`, `/api/trails`. Verify all §8 shapes with curl. | **Dashboard trust-climb + failure animations** (brighten on success; **red-pulse + `unproven` tag** on `success_check` fail) + **"how it works" panel** (MCP + pgvector + Bayesian trust, live). |
| 6:30 | **SYNC: full integration test. Install MCP in Claude Code, run publish→search→report, watch dashboard react. P1 records the terminal clip for the homepage trust beat.** | **SYNC** (same) — embed the terminal clip in the homepage trust beat |
| 6:30–7:30 | Integration fixes. **Code-quality pass:** repo public + LICENSE, README (arch diagram, run steps, 5 tools), Prettier/ESLint, strip AI-tell comments, `npm test` green. | **Dashboard "try it" box** (POST `/api/search`, match+trust+projected savings, bumps ticker) + **Install page** (MCP config copy-button + `/mycelium on\|off` docs). |
| 7:30 | **FEATURE FREEZE — no new features. Polish + rehearse only.** | **FREEZE** (same) |
| 7:30–8:15 | Harden the demo path; pre-can a backup DB state; make sure `report_apply` failure beat is reliable. | Polish: smooth scroll, scroll-stop timing, glow, no console errors, dashboard reliable. Lint pass on frontend. |
| 8:15–9:00 | **JOINT: rehearse the 5-min run-of-show 3+ times (scroll homepage to 2:45 → dashboard → code review). Record backup video (homepage scroll + dashboard).** | **JOINT** (same) |

Meals: grab food during a sync or the 5:00–5:30 block — don't both leave at once.

---

## Dependency map (who unblocks whom)

- **P1 → P2 (push first, early):** `shared/` types+constants, Supabase creds, `schema.sql` run, seed data. Until these land, P2 mocks against the §1 types.
- **P1 → P2 (ongoing):** `/api/*` routes (P2 can use seeded data + realtime before routes exist), `report_apply` (needed for the trust-climb/failure animation — target by 4:00).
- **P2 → P1:** confirms realtime events fire (3:00 sync) so P1 knows writes are observable. Confirms the demo terminal flow end-to-end (6:30 sync).
- **Shared file risk:** only `shared/src/types.ts`. Change it via the contract protocol, push immediately, other rebases.

---

## Person 1 — Backend, detailed task list

1. **(joint)** Lock types + schema, scaffold repo + workspaces, push skeleton.
2. Supabase: run `schema.sql`, enable realtime, create `match_skills` RPC, share creds.
3. `shared/`: fill `env-math.ts`, `trust.ts`, `fingerprint.ts` (impl the stubs), `constants.ts`. **Push early.**
4. `seed.ts`: 20 realistic skills, varied trust/success counts/proven_envs, real embeddings; `npm run seed`.
5. MCP server: register + implement `search_skills`, `get_skill`, `publish_skill`, `report_apply`, `set_sharing` per §7. Test with MCP inspector.
6. `report_apply` is the demo engine — make the trust climb (success) and drop (failure) rock-solid and reflected in realtime.
7. **Privacy toggle:** `set_sharing` writes `settings`; `publish_skill` reads it to set `visibility` + `owner_id`; `search_skills`/`match_skills` filter so private skills only return to their owner; `get_skill` 403s on others' private skills. Ship `.claude/commands/mycelium-on.md` + `mycelium-off.md` (§11). Resolve `owner_id` from `MYCELIUM_OWNER_ID`.
8. `/api/skills|stats|trails|search` per §8 — **public skills only** (dashboard is the public commons).
9. Unit tests for the 3 pure modules (`npm test -w shared`) — must be green for code review.
10. Code-quality pass (README, LICENSE, lint, strip AI tells). **Be able to explain `trust.ts` + a tool file cold.**

## Person 2 — Frontend + Demo Lead (Rithvik), detailed task list

Two surfaces: **Homepage `/`** (the scroll story) and **Dashboard `/dashboard`** (the live commons + how-it-works). Design is your creative call; the spine + data contracts are fixed.

1. **(joint)** Lock types + schema with P1.
2. Next.js scaffold (`/`, `/dashboard`, `/install`), `transpilePackages: ["@mycelium/shared"]`, supabase-js + realtime client, `react-force-graph-2d`.
3. **Homepage scroll — narrative spine** (PRD §"scroll narrative spine"): hero/forest → Problem (numbers) → scroll-dive reveal → Solution → Feature beats → Technical beat → connection preview + "explore the live commons →" handoff. Each beat = a demo stop. Video fallback for the dive.
4. **Embed the terminal clip** in the trust feature beat (P1 records it ~6:30) — the "it actually runs" proof.
5. **Dashboard — the live commons + story.** Full force-graph from `/api/skills` (trust = brightness/size, category color); realtime INSERT = node born, UPDATE = trust change (brighten / red-pulse); edge animation on trail INSERT; the 4-counter impact ticker (`/api/stats` + realtime).
6. **Dashboard — "how it works" panel:** surface the backend live — the MCP tools, pgvector search, Bayesian trust updating as events arrive. The dashboard tells the backend's story (per the new brief: "the backend, how it works, will also be on the dashboard").
7. **Dashboard — skill browser + "try it" box:** searchable skill list + click → modal (metadata, trust, proven envs); the **"try it" box** (POST `/api/search`, projected savings, bumps ticker). Public skills only — no private-skill UI on the public site.
8. **Install page** (lightweight): copy-button for valid Claude Code MCP config **+ document `/mycelium on|off` and the `.claude/commands/` files**.
9. (Optional) Privacy beat visual: a "🔒 saved privately" toast so judges can see a private publish stay out of the public graph.
10. Demo lead: own the 5-min run-of-show, **rehearse the homepage scroll to ~2:45**, capture the backup video, drive rehearsals.

---

## Demo run-of-show (5-min HARD cap — incl. Q&A + live code review)

**The scroll IS the demo — we drive the two pages and narrate. No live terminal on stage.**

| Time | What |
|---|---|
| 0:00–2:45 | **Scroll the Homepage**, narrating: hero/forest → the Problem (the numbers) → scroll-dive reveal → Solution → each Feature beat (skill synthesis, stigmergy, MCP discovery, **earned trust + embedded terminal clip** showing climb-then-drop, environment-scoped trust, privacy toggle, per-message footer) → the Technical beat. **Rehearse to 2:45; pre-mark the scroll stops.** |
| 2:45–3:45 | **Land on the Dashboard** (live, real data): point out trust = brightness + reuse edges; open the **"how it works"** panel (MCP + pgvector + Bayesian trust); **hand a judge the keyboard → they use the "try it" box** → real search + savings, ticker bumps. |
| 3:45–4:30 | **Live code review:** open README → `npm test` green → walk `shared/src/trust.ts` + one MCP tool file. |
| 4:30–5:00 | **Q&A** — rehearsed answers (all in `mycelium.md` → Judge Deflection): Jevons/rebound, net-overhead (~1000× less than saved), "isn't this GPTCache," privacy/poisoning. |

The embedded terminal clip (publish → reuse → trust climbs → wrong-env failure → trust drops) is a pre-recorded screen capture inside the Homepage trust beat — the "it actually runs" proof, zero live risk.

Optional privacy beat (only if a judge asks about privacy, or you have spare seconds): type `/mycelium off`, publish a skill → it does NOT appear in the public graph (stays in your private library) → `/mycelium on` → next publish blooms publicly. One line: *"You decide what leaves your machine — private by a keystroke, shared only when you opt in."* Don't force this into the 5-min cap; keep it as a Q&A answer.

Closing line: *"We're not building another sustainability app. We're building the infrastructure that makes AI itself sustainable."*

---

## Feature freeze protocol (7:30)

**Finish what's started. Start nothing new. If it's not working, CUT it.**

| Track | Who | What |
|---|---|---|
| Polish | Both, on your own slice | Harden the demo path, kill console errors, smooth transitions |
| Demo + rehearsal | Person 2 (lead) | Run-of-show 3×, backup video incl. scroll-dive |
| Repo cleanup | Person 1 | README, LICENSE, lint, strip dead/AI-tell code, `npm test` green |

---

## Fallback scope (if badly behind, ship in this order)

1. **Homepage scroll** through the narrative spine (problem → reveal → solution → features → technical) + working ticker — this alone is the whole pitch.
2. **Dashboard** with the live graph on seeded data + the impact totals.
3. The **"try it" box** on the dashboard (real `search_skills`, savings shown) — the judge-usable beat.
4. The embedded **terminal clip** (recorded) in the homepage trust beat — the "it runs" proof.

If even the live backend is shaky, the scroll homepage + a recorded dashboard video still tells the full story. Protect the homepage scroll above everything — it's the demo.

Even with only 1–2, the metaphor and the sustainability story land. Protect the **code-quality pass and the "try it" box** over extra visual flourish — they're cheap and they swing the two weakest rubric categories.

---

## Quick reference — the rubric gaps we're explicitly closing

- **Technical Complexity 7→9:** real pgvector search + executing `success_check` + naming efficiency choices in code review.
- **Functionality 6→8:** the "try it" box + interactive graph (judges *use* it).
- **Quality of Code 4→9:** open-source + README + lint + green tests + *you can explain the core files*.
