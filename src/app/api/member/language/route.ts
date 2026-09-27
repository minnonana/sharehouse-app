import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { displayLanguage } = (await request.json()) as { displayLanguage: "ja" | "en" };
  const supabase = await createClient();

  const { error } = await supabase
    .from("members")
    .update({ display_language: displayLanguage })
    .eq("id", ctx.member.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
