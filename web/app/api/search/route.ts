import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { compatibility, tokensSaved, tokensToImpact } from "@mycelium/shared";
import type { EnvFingerprint, SkillMatch } from "@mycelium/shared";
import { embed } from "@mycelium/shared/embed";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the embedding model can be slow on a cold start

// Powers the dashboard "try it" box. Same embed → match_skills path as the MCP search tool,
// but returns structured SkillMatch[] for the UI. requester_id=null → PUBLIC skills only.
export async function POST(req: NextRequest) {
  let body: { query?: string; environment?: EnvFingerprint };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  const vec = await embed(query);
  const { data, error } = await supabaseServer.rpc("match_skills", {
    query_embedding: vec,
    requester_id: null,
    match_count: 8,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const matches: SkillMatch[] = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    trust_score: row.trust_score,
    similarity: row.similarity,
    compatibility: compatibility(body.environment, row.proven_envs ?? []),
    proven_envs: row.proven_envs ?? [],
    projected_savings: tokensToImpact(tokensSaved(row.tokens_to_create)),
  }));

  return NextResponse.json({ matches });
}
