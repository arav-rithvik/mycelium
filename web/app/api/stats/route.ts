import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// The impact ticker's initial value (realtime keeps it live after that).
export async function GET() {
  const { data, error } = await supabaseServer.from("stats").select("*").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stats: data });
}
