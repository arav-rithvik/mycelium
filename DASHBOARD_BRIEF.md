# Mycelium Dashboard — Build Brief (paste into Rithvik's Claude Code)

You (Claude) are building the **`/dashboard` page** for Mycelium, in the existing Next.js app at `web/`.
Mycelium is an MCP server that lets AI agents reuse proven "skills" instead of re-solving problems — every
reuse is energy/water/CO₂ saved. The backend (4 API routes + Supabase realtime) is **already built and
live**. Your job is the **visual dashboard** that turns its data into the demo's wow factor.

## The demo this powers (so you build the right thing)

Live, two laptops, same prompt ("set up Supabase auth in a Next.js app"):

- **Laptop A (no Mycelium):** Claude grinds it out from scratch — slower, more tokens.
- **Laptop B (Mycelium on):** Claude instantly reuses the proven skill — faster, and prints a savings footer.
- **Then the projector shows THIS dashboard** — big, colorful, alive — where the saving lands and gets
  multiplied to planetary scale. **The terminals are the proof; this dashboard is the WOW.** Make it
  memorable, not subtle.

## What to build (priority order)

1. **The impact ticker — big animated counters.** Tokens saved · energy (kWh) · water (L) · CO₂ (kg).
   Source: `GET /api/stats` for the initial value, then subscribe to realtime `stats` for live bumps.
   Make these HUGE and count up smoothly.
2. **⭐ The "scaled impact" WOW panel (the closer).** Take the totals and project them to things humans feel —
   "= N homes powered for a year · X cars off the road · Y Olympic pools of water." Then the planetary line.
   (Math below.) This is the beat the judges remember — make it the biggest, boldest element.
3. **The living network graph.** Nodes = skills from `GET /api/skills` (size/brightness = `trust_score`,
   color = `category`); edges = recent reuses from `GET /api/trails`. Subscribe to realtime: a new `skills`
   row = a node blooms; a new `trails` row = an edge pulses; `stats` update = ticker moves. Use
   `react-force-graph-2d`.
4. **The "try it" box.** A text input → `POST /api/search` with `{ query, environment? }` → render the returned
   matches (name, `trust_score`, `similarity`, projected savings). Judges type a task and watch it find a skill.

## Data sources — all live, no setup needed

Routes (already built, public data only):

```
GET  /api/skills          -> { skills: Skill[] }      // graph nodes
GET  /api/stats           -> { stats: Stats }         // the ticker
GET  /api/trails?limit=50 -> { trails: Trail[] }      // edges
POST /api/search          -> { matches: SkillMatch[] } // body { query, environment? } — the "try it" box
```

Key shapes (full types in `shared/src/types.ts`):

- `Stats`: `{ total_tokens_saved, total_energy_wh, total_water_ml, total_co2_g, total_reuses }`
- `Skill`: `{ id, name, description, category, trust_score (0..1), proven_envs, tokens_to_create, ... }`
- `Trail`: `{ id, skill_id, success, tokens_saved, timestamp }`
- `SkillMatch`: `{ id, name, trust_score, similarity (0..1), projected_savings: { tokens, energyWh, waterMl, co2g } }`

Realtime (use the browser client already at `web/lib/supabase.ts`):

```ts
supabase.channel("skills").on("postgres_changes", { event: "*", schema: "public", table: "skills" }, handler)
supabase.channel("trails").on("postgres_changes", { event: "INSERT", schema: "public", table: "trails" }, handler)
supabase.channel("stats").on("postgres_changes",  { event: "UPDATE", schema: "public", table: "stats" }, handler)
```

## The multiplier math (the wow — drop this in)

```ts
// Human-relatable equivalents from cumulative impact (energy Wh, water mL, CO₂ g).
export function equivalents(energyWh: number, waterMl: number, co2g: number) {
  const kWh = energyWh / 1000, liters = waterMl / 1000, kgCO2 = co2g / 1000;
  return {
    homeDays:   kWh / 28.8,     // avg US home uses ~28.8 kWh/day
    phoneCharges: kWh / 0.0114, // ~11.4 Wh per full phone charge
    carMiles:   kgCO2 / 0.404,  // EPA ~404 g CO₂ / mile
    treesYear:  kgCO2 / 21,     // a tree absorbs ~21 kg CO₂ / year
    showers:    liters / 65,    // avg shower ~65 L
  };
}
```

**The planetary closer (the line that lands).** Our cited 10% floor = 250M redundant agent sessions/day,
wasting **~105 MWh · ~6M L water · ~40 t CO₂ — every day.** Over a year that's **~38 GWh = powering ~3,650
homes for a year · ~876 Olympic pools of water · ~3,200 cars off the road.** Show the live number, then
slam-cut to this scale. (These are the conservative floor, defensible — don't inflate them.)

## Visual direction

Dark (black / deep green-purple), the Mycelium glow aesthetic you already used on the landing page. The
network graph = the "underground" reveal; the impact panel = bright, alive, counting. Big type. The "scaled
impact" panel should feel like the punchline. Reuse your existing components/style — this is the `/dashboard`
that the homepage's "explore the live commons →" links to.
