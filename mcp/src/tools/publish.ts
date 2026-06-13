import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Ctx } from "../ctx";
import { embed } from "@mycelium/shared/embed";

// Distills a solved, generalizable task into a reusable skill in the commons.
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
        environment: z
          .object({
            framework: z.string().optional(),
            frameworkVersion: z.string().optional(),
            os: z.string().optional(),
            runtime: z.string().optional(),
            deps: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
        visibility: z
          .enum(["public", "private"])
          .optional()
          .describe("override the sharing toggle for this one skill"),
      },
    },
    async (args) => {
      const { data: setting } = await ctx.supabase
        .from("settings")
        .select("sharing_enabled")
        .eq("owner_id", ctx.ownerId)
        .maybeSingle();
      const sharingEnabled = setting?.sharing_enabled ?? true;

      const visibility = args.visibility ?? (sharingEnabled ? "public" : "private");

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
          visibility,
          owner_id: ctx.ownerId,
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
            text: `Published "${args.name}" (id: ${inserted.id}) at trust 0.50 — ${
              visibility === "public"
                ? "now discoverable in the public commons. It will earn trust as agents reuse it successfully."
                : "saved to your private library (not shared publicly)."
            }`,
          },
        ],
      };
    },
  );
}
