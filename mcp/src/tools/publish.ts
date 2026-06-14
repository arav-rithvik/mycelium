import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Ctx } from "../ctx";
import { embed } from "@mycelium/shared/embed";

// Distills a solved, generalizable task into a reusable skill in the shared public commons.
export function registerPublishTool(server: McpServer, ctx: Ctx) {
  server.registerTool(
    "publish_skill",
    {
      title: "Publish Mycelium skill",
      description:
        "Call this ONLY AFTER solving a non-trivial, GENERALIZABLE task (a repeatable setup/integration — " +
        "not a one-off or user-specific change) that search_skills did NOT already cover. Distills the solution " +
        "into a reusable skill in the commons. The one-line description is what gets embedded for semantic search, " +
        "so make it specific.",
      inputSchema: {
        name: z.string(),
        description: z
          .string()
          .describe("one line — this is embedded for semantic search; be specific"),
        category: z.enum([
          "auth",
          "payments",
          "database",
          "frontend",
          "devops",
          "api",
          "testing",
          "other",
        ]),
        framework: z.string(),
        content: z.string().describe("the full reusable runbook (steps, code, gotchas)"),
        success_check: z.string().describe("a concrete assertion that proves it worked"),
        tokens_to_create: z.number().describe("approx tokens it took to solve from scratch"),
      },
    },
    async (args) => {
      const vec = await embed(args.description);

      const { data: inserted, error } = await ctx.supabase
        .from("skills")
        .insert({
          name: args.name,
          description: args.description,
          category: args.category,
          framework: args.framework,
          content: args.content,
          success_check: args.success_check,
          embedding: JSON.stringify(vec),
          trust_score: 0.5,
          success_count: 0,
          failure_count: 0,
          tokens_to_create: args.tokens_to_create,
          proven_envs: [],
        })
        .select("id")
        .single();

      if (error) {
        return {
          content: [{ type: "text", text: `Failed to publish skill: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Published "${args.name}" (id: ${inserted.id}) at trust 0.50 — now in the public commons. It earns trust as agents reuse it successfully.`,
          },
        ],
      };
    },
  );
}
