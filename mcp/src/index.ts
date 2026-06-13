import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { supabase } from "./supabase";
import type { Ctx } from "./ctx";
import { registerSetSharingTool } from "./tools/setSharing";

// Who owns the skills this client publishes; scopes private skills. Defaults to "local".
const ctx: Ctx = {
  supabase,
  ownerId: process.env.MYCELIUM_OWNER_ID ?? "local",
};

const server = new McpServer({ name: "mycelium", version: "0.1.0" });

// One tool per file; each receives the shared ctx. More land here as we build them.
registerSetSharingTool(server, ctx);

// stdio: stdout is reserved for JSON-RPC, so every log goes to stderr.
await server.connect(new StdioServerTransport());
console.error(`[mycelium] MCP server connected on stdio (owner: ${ctx.ownerId})`);
