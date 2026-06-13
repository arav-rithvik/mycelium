import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Smoke test: spawn our MCP server as a subprocess and exercise all 5 tools over real stdio + real DB,
// exactly the way Claude Code would. Run with: npx tsx mcp/test-client.ts
// (Mutates the DB — publishes a throwaway skill and reports applies. Re-run `npm run seed` after to reset.)
const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "mcp/src/index.ts"],
  env: { ...process.env } as Record<string, string>,
});
const client = new Client({ name: "mycelium-test-client", version: "0.0.1" });
await client.connect(transport);

const textOf = (res: any): string => (res.content ?? []).map((c: any) => c.text ?? "").join("");
const firstId = (text: string): string | undefined => text.match(/id: ([0-9a-f-]{36})/)?.[1];
const env = { framework: "nextjs", frameworkVersion: "15.2", os: "darwin" };

const { tools } = await client.listTools();
console.log("TOOLS:", tools.map((t) => t.name).join(", "), "\n");

const search = await client.callTool({
  name: "search_skills",
  arguments: { query: "set up stripe webhooks in next.js", environment: env, limit: 3 },
});
const searchText = textOf(search);
console.log("SEARCH:\n" + searchText + "\n");
const topId = firstId(searchText);

if (topId) {
  const get = await client.callTool({ name: "get_skill", arguments: { id: topId, environment: env } });
  console.log("GET (first 200 chars):\n" + textOf(get).slice(0, 200) + " …\n");
}

const pub = await client.callTool({
  name: "publish_skill",
  arguments: {
    name: "test-skill-smoke",
    description: "A throwaway skill created by the MCP smoke test",
    category: "other",
    framework: "node",
    content: "# test\nstep 1\nstep 2",
    success_check: "echo ok",
    tokens_to_create: 5000,
    environment: env,
  },
});
const pubText = textOf(pub);
console.log("PUBLISH:", pubText, "\n");
const newId = firstId(pubText);

if (newId) {
  const ok = await client.callTool({
    name: "report_apply",
    arguments: { skill_id: newId, success: true, environment: env, tokens_used: 1000 },
  });
  console.log("REPORT success:\n" + textOf(ok) + "\n");

  const bad = await client.callTool({
    name: "report_apply",
    arguments: { skill_id: newId, success: false, environment: { framework: "react", frameworkVersion: "21" } },
  });
  console.log("REPORT failure:\n" + textOf(bad) + "\n");
}

await client.close();
process.exit(0);
