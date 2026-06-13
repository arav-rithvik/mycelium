import { pipeline } from "@xenova/transformers";
import { EMBED_MODEL } from "./constants";

// Kept OUT of the package barrel (index.ts) on purpose: this pulls in the transformers runtime,
// which only the server side (mcp, seed, /api/search) needs. The frontend imports "@mycelium/shared"
// for types/math and never drags the model into its bundle.

// The model is loaded once per process and reused (lazy singleton). First call downloads ~30MB and
// caches it under node_modules; every call after is in-memory and fast.
let extractorPromise: Promise<unknown> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBED_MODEL);
  }
  return extractorPromise;
}

/** Embed a string into a 384-dim, L2-normalized vector (cosine-ready for pgvector). */
export async function embed(text: string): Promise<number[]> {
  const extractor = (await getExtractor()) as (
    t: string,
    opts: { pooling: "mean"; normalize: boolean },
  ) => Promise<{ data: Float32Array }>;
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
