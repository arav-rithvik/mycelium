// --- Environmental conversion (per-query published factors, converted per-token) ---
// We convert published per-QUERY factors to per-TOKEN using a documented assumption
// of TOKENS_PER_QUERY. This assumption is stated openly; every factor is sourced.
export const TOKENS_PER_QUERY = 500; // documented assumption
export const ENERGY_WH_PER_QUERY = 0.42; // arXiv:2505.09598
export const WATER_ML_PER_QUERY = 10; // Li et al. arXiv:2304.03271 (low end = conservative)
export const CO2_G_PER_QUERY = 0.16; // 0.42 Wh * 386 gCO2/kWh (EPA eGRID)

export const ENERGY_WH_PER_TOKEN = ENERGY_WH_PER_QUERY / TOKENS_PER_QUERY; // 0.00084
export const WATER_ML_PER_TOKEN = WATER_ML_PER_QUERY / TOKENS_PER_QUERY; // 0.02
export const CO2_G_PER_TOKEN = CO2_G_PER_QUERY / TOKENS_PER_QUERY; // 0.00032

// Reusing a skill costs ~20% of solving from scratch -> ~80% saved.
export const REUSE_SAVED_FRACTION = 0.8;

// Embeddings — LOCAL model (no API key). Supabase/gte-small outputs 384-dim normalized vectors.
// (Contract originally specified OpenAI text-embedding-3-small/1536; we run locally to avoid a paid key.)
export const EMBED_MODEL = "Supabase/gte-small";
export const EMBED_DIM = 384;
