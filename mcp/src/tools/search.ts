import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Ctx } from "../ctx";
import { compatibility, tokensSaved, tokensToImpact } from "@mycelium/shared";
import type { EnvFingerprint } from "@mycelium/shared";
import { embed } from "@mycelium/shared/embed";

// One row as returned by the `match_skills` RPC (already ordered by similarity desc).
interface MatchRow {
  id: string;
  name: string;
  description: string;
  category: string;
  trust_score: number;
  proven_envs: EnvFingerprint[] | null;
  tokens_to_create: number;
  visibility: string;
  owner_id: string;
  similarity: number;
}

// Semantic search over the skill commons: embed the query, ask Postgres for the nearest
// skills (pgvector cosine), then annotate each with env-compat + projected savings.
export function registerSearchTool(server: McpServer, ctx: Ctx) {
  server.registerTool(
    "search_skills",
    {
      title: "Search Mycelium skills",
      description:
        "Search the Mycelium skill commons by MEANING (semantic search) BEFORE starting a non-trivial " +
        "task, to find a proven solution to reuse instead of solving from scratch. Returns ranked matches " +
        "with trust scores and projected token savings. Pass your environment (framework/version/os) to " +
        "see which skills are already proven in your setup.",
      inputSchema: {
        query: z.string().describe("the task you're about to do, in natural language"),
        environment: z
          .object({
            framework: z.string().optional(),
            frameworkVersion: z.string().optional(),
            os: z.string().optional(),
            runtime: z.string().optional(),
            deps: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
        limit: z.number().optional().describe("max results, default 8"),
      },
    },
    async ({ query, environment, limit }) => {
      const vec = await embed(query);
      const { data, error } = await ctx.supabase.rpc("match_skills", {
        query_embedding: vec,
        requester_id: ctx.ownerId,
        match_count: limit ?? 8,
      });
      if (error) {
        return {
          content: [{ type: "text", text: `Search failed: ${error.message}` }],
          isError: true,
        };
      }

      const rows = (data ?? []) as MatchRow[];
      if (rows.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No matching skills found for "${query}". This looks novel — solve it, then consider publish_skill.`,
            },
          ],
        };
      }

      const blocks = rows.map((row, i) => {
        const comp = compatibility(environment, row.proven_envs ?? []);
        const proven = comp >= 0.7;
        const saved = tokensSaved(row.tokens_to_create);
        const impact = tokensToImpact(saved);
        return (
          `\n${i + 1}. ${row.name}  (id: ${row.id})\n` +
          `   trust ${row.trust_score.toFixed(2)} · ${(row.similarity * 100).toFixed(0)}% match · ` +
          `${proven ? "✓ proven in your environment" : "unproven in your environment — adapt & re-confirm"}\n` +
          `   reusing saves ~${saved.toLocaleString()} tokens ` +
          `(${impact.energyWh.toFixed(1)} Wh · ${impact.co2g.toFixed(1)} g CO₂)\n` +
          `   ${row.description}`
        );
      });

      const text =
        `Found ${rows.length} skills for "${query}" (ranked by relevance):\n` +
        blocks.join("\n") +
        `\n\n→ Call get_skill with an id to read and apply one.`;

      return { content: [{ type: "text", text }] };
    },
  );
}
