import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Dev harness: spawns our MCP server as a subprocess, then acts as the client (like Claude Code would)
// to list tools and call them. Run with: npx tsx mcp/test-client.ts
const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "mcp/src/index.ts"],
  env: { ...process.env } as Record<string, string>,
});

const client = new Client({ name: "mycelium-test-client", version: "0.0.1" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log("Registered tools:", tools.map((t) => t.name).join(", ") || "(none)");

const res = await client.callTool({ name: "set_sharing", arguments: { enabled: true } });
console.log("set_sharing →", JSON.stringify(res.content));

await client.close();
process.exit(0);
