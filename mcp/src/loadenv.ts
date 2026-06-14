import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load the repo-root .env regardless of where the host (Claude Code / Railway) spawns this server
// from — cwd-independent. Imported FIRST in the entry files so it runs before supabase.ts reads
// process.env. (On a deployed host with no .env file, this is a harmless no-op and the host's own
// env vars are used.)
config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../.env") });
