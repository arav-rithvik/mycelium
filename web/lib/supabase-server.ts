import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY service-role client for the /api routes. Never import this from a client component —
// the service key bypasses RLS. (The browser uses the anon client in lib/supabase.ts.)
// Tolerate a pasted "Project URL" that includes the /rest/v1 path or a trailing slash.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseServer = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
