import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { postId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("board_post_reads")
    .upsert(
      { post_id: postId, member_id: ctx.member.id },
      { onConflict: "post_id,member_id" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
