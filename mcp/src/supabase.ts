import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// SERVICE-ROLE client — server-side only. Bypasses Row-Level Security: full read/write on every
// table. This is the "god-mode" key from the README's security note; it must never reach a browser.
// The MCP server is a local process Claude Code spawns, so it's a safe place to hold it.
// Tolerate a pasted "Project URL" that accidentally includes the /rest/v1 REST path or a trailing slash.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !serviceKey) {
  console.error(
    "[mycelium] Missing Supabase env — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }, // a server process has no user session to persist
  // supabase-js builds a Realtime client at createClient() time even though this server never
  // subscribes to anything. That constructor needs a WebSocket impl, and Node < 22 has no global
  // WebSocket — so on a Node-20 host the process throws at import and crashes on boot. We never
  // open this socket; we just hand Realtime the `ws` package so the constructor is satisfied on
  // any Node version. Makes the server portable instead of pinned to a Node 22 runtime.
  realtime: { transport: WebSocket as unknown as never },
});
