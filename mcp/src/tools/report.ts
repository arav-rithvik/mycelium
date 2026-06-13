import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Ctx } from "../ctx";
import {
  bayesianTrust,
  tokensSaved,
  tokensToImpact,
  formatFooter,
  isProven,
  type EnvFingerprint,
} from "@mycelium/shared";

// report_apply — the demo engine. Records the outcome of applying a skill so trust
// (Bayesian) moves up/down and the live impact totals (tokens/energy/water/co2) grow.
export function registerReportTool(server: McpServer, ctx: Ctx) {
  server.registerTool(
    "report_apply",
    {
      title: "Report skill apply outcome",
      description:
        "Call this AFTER applying a skill and running its success_check, to record whether it worked. " +
        "Pass success=true if the success_check passed, false if it failed. This is what moves the skill's " +
        "trust score (up on success, down on failure) and the live impact totals. Pass your environment.",
      inputSchema: {
        skill_id: z.string(),
        success: z.boolean().describe("did the skill's success_check pass?"),
        environment: z
          .object({
            framework: z.string().optional(),
            frameworkVersion: z.string().optional(),
            os: z.string().optional(),
            runtime: z.string().optional(),
            deps: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
        tokens_used: z.number().optional().describe("actual tokens this apply cost"),
      },
    },
    async (args) => {
      // 1. Fetch the skill.
      const { data: skill, error } = await ctx.supabase
        .from("skills")
        .select("*")
        .eq("id", args.skill_id)
        .single();
      if (error || !skill) {
        return {
          content: [{ type: "text", text: `Skill not found: ${args.skill_id}` }],
          isError: true,
        };
      }

      // 2. How many tokens this reuse saved versus building from scratch.
      const saved = tokensSaved(skill.tokens_to_create, args.tokens_used);

      // 3. Record the apply attempt as a trail (the audit log row).
      await ctx.supabase.from("trails").insert({
        skill_id: args.skill_id,
        task_type: "apply",
        approach: "report_apply",
        success: args.success,
        environment: args.environment ?? {},
        tokens_used: args.tokens_used ?? Math.round(skill.tokens_to_create * 0.2),
        tokens_saved: args.success ? saved : 0,
      });

      // 4. Recompute the Bayesian trust score from updated success/failure counts.
      const newSuccess = skill.success_count + (args.success ? 1 : 0);
      const newFailure = skill.failure_count + (args.success ? 0 : 1);
      const trust = bayesianTrust(newSuccess, newFailure);

      // 5. On success, widen the set of environments this skill is proven in.
      let provenEnvs: EnvFingerprint[] = skill.proven_envs ?? [];
      if (args.success && args.environment && Object.keys(args.environment).length) {
        const exists = provenEnvs.some(
          (e) => JSON.stringify(e) === JSON.stringify(args.environment),
        );
        if (!exists) provenEnvs = [...provenEnvs, args.environment];
      }

      // 6. Persist the new counts, trust score, and proven envs back onto the skill.
      await ctx.supabase
        .from("skills")
        .update({
          success_count: newSuccess,
          failure_count: newFailure,
          trust_score: trust,
          proven_envs: provenEnvs,
        })
        .eq("id", args.skill_id);

      // 7. On success, bump the global impact totals (read-modify-write the stats row).
      if (args.success) {
        const impact = tokensToImpact(saved);
        const { data: s } = await ctx.supabase.from("stats").select("*").eq("id", 1).single();
        await ctx.supabase
          .from("stats")
          .update({
            total_tokens_saved: (s?.total_tokens_saved ?? 0) + saved,
            total_energy_wh: (s?.total_energy_wh ?? 0) + impact.energyWh,
            total_water_ml: (s?.total_water_ml ?? 0) + impact.waterMl,
            total_co2_g: (s?.total_co2_g ?? 0) + impact.co2g,
            total_reuses: (s?.total_reuses ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", 1);
      }

      // 8. Is the caller's environment among the proven ones (>= trust threshold)?
      const proven = isProven(args.environment, provenEnvs);
      const footer = formatFooter({
        skillName: skill.name,
        trustScore: trust,
        tokensSaved: args.success ? saved : 0,
        proven,
        isPrivate: skill.visibility === "private",
      });

      // 9. Human-readable confirmation with the before → after trust delta.
      return {
        content: [
          {
            type: "text",
            text:
              `${args.success ? "✓" : "✗"} Recorded ${args.success ? "SUCCESS" : "FAILURE"} for "${skill.name}".\n` +
              `Trust ${skill.trust_score.toFixed(2)} → ${trust.toFixed(2)}  (${newSuccess} successes / ${newFailure} failures).` +
              (args.success
                ? ` Saved ~${saved.toLocaleString()} tokens.`
                : " Trust dropped — this skill did not work here.") +
              `\n\n${footer}`,
          },
        ],
      };
    },
  );
}
