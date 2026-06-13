import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Ctx } from "../ctx";
import { formatFooter, tokensSaved, isProven } from "@mycelium/shared";

// Fetch one skill's full runbook by id, with a savings footer and a per-environment "proven" flag.
export function registerGetTool(server: McpServer, ctx: Ctx) {
  server.registerTool(
    "get_skill",
    {
      title: "Get Mycelium skill",
      description:
        "Fetch the full content of a skill by its id (from search_skills results) so you can read and apply it. " +
        "Returns the skill's runbook plus a one-line savings footer to append to your reply. " +
        "Pass your environment to mark whether it's proven in your setup.",
      inputSchema: {
        id: z.string().describe("the skill id from search_skills"),
        environment: z
          .object({
            framework: z.string().optional(),
            frameworkVersion: z.string().optional(),
            os: z.string().optional(),
            runtime: z.string().optional(),
            deps: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
      },
    },
    async (args) => {
      const { data: skill, error } = await ctx.supabase
        .from("skills")
        .select("*")
        .eq("id", args.id)
        .single();

      if (error || !skill) {
        return {
          content: [{ type: "text", text: `Skill not found: ${args.id}` }],
          isError: true,
        };
      }

      if (skill.visibility === "private" && skill.owner_id !== ctx.ownerId) {
        return {
          content: [
            { type: "text", text: "That skill is private to another user and cannot be accessed." },
          ],
          isError: true,
        };
      }

      const proven = isProven(args.environment, skill.proven_envs ?? []);
      const saved = tokensSaved(skill.tokens_to_create);
      const footer = formatFooter({
        skillName: skill.name,
        trustScore: skill.trust_score,
        tokensSaved: saved,
        proven,
        isPrivate: skill.visibility === "private",
      });

      return {
        content: [{ type: "text", text: `${skill.content}\n\n${footer}` }],
      };
    },
  );
}
