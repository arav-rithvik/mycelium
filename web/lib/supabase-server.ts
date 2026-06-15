import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY service-role client for the /api routes. Never import this from a client component —
// the service key bypasses RLS. (The browser uses the anon client in lib/supabase.ts.)
// Created lazily so importing this module never throws at build time (page-data collection)
// when env vars are absent — the client is only built on first use at request time.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  // Tolerate a pasted "Project URL" that includes the /rest/v1 path or a trailing slash.
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  client = createClient(url, serviceKey, { auth: { persistSession: false } });
  return client;
}

// Proxy preserves the `supabaseServer.rpc(...)` call sites while deferring construction.
export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
