import type { supabase } from "./supabase";

/** The shared context every tool handler receives: the DB client + who's calling. */
export interface Ctx {
  supabase: typeof supabase;
  ownerId: string;
}
