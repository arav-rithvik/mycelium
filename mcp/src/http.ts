import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerSearchTool } from "./tools/search";
import { registerGetTool } from "./tools/get";
import { registerPublishTool } from "./tools/publish";
import { registerReportTool } from "./tools/report";
import { registerSetSharingTool } from "./tools/setSharing";
import { supabase } from "./supabase";
import type { Ctx } from "./ctx";

// Remote HTTP entry point for the Mycelium MCP server.
//
// Unlike the stdio entry (one process == one client), an HTTP server is shared by many clients,
// so each MCP "session" gets its own McpServer + transport. The transport is keyed by the
// Mcp-Session-Id header that StreamableHTTPServerTransport mints on the initialize request and
// the client echoes back on every subsequent request.

const PORT = process.env.PORT || 3333;

// Build a fresh McpServer with all 5 tools registered against the given owner.
// ownerId is resolved per-request from the "x-mycelium-owner" header so one remote
// deployment can serve many owners without restarting.
function buildServer(ownerId: string): McpServer {
  const ctx: Ctx = { supabase, ownerId };
  const server = new McpServer({ name: "mycelium", version: "0.1.0" });
  registerSearchTool(server, ctx);
  registerGetTool(server, ctx);
  registerPublishTool(server, ctx);
  registerReportTool(server, ctx);
  registerSetSharingTool(server, ctx);
  return server;
}

const app = express();
app.use(express.json());

// Live transports keyed by session id, so follow-up POST/GET/DELETE requests
// reuse the same in-memory MCP session rather than re-initializing.
const transports: Record<string, StreamableHTTPServerTransport> = {};

// POST /mcp — client-to-server JSON-RPC (initialize + all subsequent calls).
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Existing session: reuse its transport.
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session: create a transport and wire up its lifecycle.
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        // Store the transport once the session id is established.
        transports[sid] = transport;
      },
    });

    // Clean up the map when the transport closes so we don't leak sessions.
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    const ownerId = (req.headers["x-mycelium-owner"] as string | undefined) ?? "public";
    const server = buildServer(ownerId);
    await server.connect(transport);
    console.error(`[mycelium] MCP session initializing (owner: ${ownerId})`);
  } else {
    // No session id and not an initialize request: invalid.
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// Shared handler for GET (server-to-client SSE stream) and DELETE (session teardown).
async function handleSessionRequest(req: express.Request, res: express.Response) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
}

// GET /mcp — opens the SSE stream for server-initiated messages.
app.get("/mcp", handleSessionRequest);

// DELETE /mcp — explicit session termination.
app.delete("/mcp", handleSessionRequest);

// Health check for load balancers / uptime probes.
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.listen(PORT, () => {
  console.error(`[mycelium] MCP HTTP server listening on port ${PORT}`);
});
