import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Graph nodes + the network list. PUBLIC commons only — private skills never reach the browser.
// We select explicit columns (NOT `embedding`, which is a 384-float vector and huge).
export async function GET() {
  const { data, error } = await supabaseServer
    .from("skills")
    .select(
      "id,name,description,category,framework,content,success_check,trust_score,success_count,failure_count,tokens_to_create,proven_envs,visibility,owner_id,created_at",
    )
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skills: data });
}
