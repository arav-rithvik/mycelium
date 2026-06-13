import { createClient } from "@supabase/supabase-js";

// SERVICE-ROLE client — server-side only. Bypasses Row-Level Security: full read/write on every
// table. This is the "god-mode" key from the README's security note; it must never reach a browser.
// The MCP server is a local process Claude Code spawns, so it's a safe place to hold it.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !serviceKey) {
  console.error(
    "[mycelium] Missing Supabase env — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }, // a server process has no user session to persist
});
