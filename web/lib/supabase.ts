import { createClient } from "@supabase/supabase-js";

// Browser client — ANON key only (read + realtime). Safe to ship to the client.
// The service-role key lives only on the server (MCP + /api) and must never appear here.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, anonKey);
