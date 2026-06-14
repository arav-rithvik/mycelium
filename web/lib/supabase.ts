import { createClient } from "@supabase/supabase-js";

// Browser client — ANON key only (read + realtime). Safe to ship to the client.
// The service-role key lives only on the server (MCP + /api) and must never appear here.
// Tolerate a pasted "Project URL" that accidentally includes the /rest/v1 REST path or a trailing slash.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, anonKey);
