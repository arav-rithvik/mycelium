import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Ctx } from "../ctx";

// The /mycelium on|off privacy toggle. Simplest of the 5 tools: it flips one row in `settings`.
export function registerSetSharingTool(server: McpServer, ctx: Ctx) {
  server.registerTool(
    "set_sharing",
    {
      title: "Set Mycelium sharing",
      description:
        "Toggle whether NEW skills you publish join the public commons or stay in your private library " +
        "(the /mycelium on|off switch). enabled=true → public; enabled=false → private. Affects future publishes only.",
      inputSchema: {
        enabled: z.boolean().describe("true = share new skills publicly; false = keep them private"),
      },
    },
    async ({ enabled }) => {
      const { error } = await ctx.supabase.from("settings").upsert({
        owner_id: ctx.ownerId,
        sharing_enabled: enabled,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        return {
          content: [{ type: "text", text: `Failed to update sharing: ${error.message}` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: enabled
              ? "🌐 Mycelium sharing ON — new skills join the public commons and earn trust through real reuse."
              : "🔒 Mycelium sharing OFF — new skills are saved to your private library only.",
          },
        ],
      };
    },
  );
}
