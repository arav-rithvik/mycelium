// An environment fingerprint: where a skill was proven, or where a requester is.
export interface EnvFingerprint {
  framework?: string; // "nextjs"
  frameworkVersion?: string; // "15.2"  (semver-ish string)
  os?: string; // "darwin" | "linux" | "win32"
  runtime?: string; // "node@20"
  deps?: Record<string, string>; // { "@supabase/ssr": "0.5.1" }
}

export type SkillCategory =
  | "auth"
  | "payments"
  | "database"
  | "frontend"
  | "devops"
  | "api"
  | "testing"
  | "other";

export type Visibility = "public" | "private";

// A full skill row (matches the `skills` table).
export interface Skill {
  id: string;
  name: string; // "nextjs-supabase-auth"
  description: string; // one line, this is what gets embedded
  category: SkillCategory;
  framework: string; // "nextjs"
  content: string; // full skill body (markdown/yaml)
  success_check: string; // human-readable assertion, e.g. "GET /auth/callback => 302"
  trust_score: number; // 0..1, Bayesian, derived & stored
  success_count: number;
  failure_count: number;
  tokens_to_create: number; // baseline cost to solve from scratch (for savings math)
  proven_envs: EnvFingerprint[];
  visibility: Visibility; // "private" = only the owner can discover it; "public" = in the commons
  owner_id: string | null; // who published it (null for seeded/public-origin skills)
  created_at: string; // ISO
}

// Per-owner sharing toggle (matches the `settings` table). sharing_enabled=false => new skills publish PRIVATE.
export interface SharingState {
  owner_id: string;
  sharing_enabled: boolean; // default true
}

// A reuse / apply event (matches the `trails` table).
export interface Trail {
  id: string;
  skill_id: string;
  task_type: string;
  approach: string;
  success: boolean;
  environment: EnvFingerprint;
  tokens_used: number; // actual tokens this apply
  tokens_saved: number; // baseline - actual
  timestamp: string; // ISO
}

// Global aggregate (matches the singleton `stats` table, id=1).
export interface Stats {
  id: number; // always 1
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
  similarity: number; // 0..1 cosine similarity from pgvector
  compatibility: number; // 0..1 vs requester env (1 if no env given)
  proven_envs: EnvFingerprint[];
  projected_savings: Impact; // what reusing it would save (baseline * REUSE_SAVED_FRACTION)
}
