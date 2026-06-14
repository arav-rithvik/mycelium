import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// Recent reuse events → the graph's glowing edges. Most-recent first, default 50.
export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "50") || 50, 200);
  const { data, error } = await supabaseServer
    .from("trails")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trails: data });
}
