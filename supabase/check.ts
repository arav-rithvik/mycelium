import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Dev utility: confirms the .env keys work and the schema has been run.
// Run with: npm run db:check
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  { name: "skills", col: "id" },
  { name: "trails", col: "id" },
  { name: "stats", col: "id" },
  { name: "settings", col: "owner_id" }, // settings is keyed by owner_id, not id
] as const;
for (const t of tables) {
  const { data, error } = await supabase.from(t.name).select(t.col);
  if (error) console.log(`  ${t.name.padEnd(10)} ❌  ${error.message}`);
  else console.log(`  ${t.name.padEnd(10)} ✅  ${data.length} rows`);
}
