import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 代表者が、同じハウスの住人を代表者にする（代表者を2人以上にしておくため）
export async function POST(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!ctx.member.is_owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { memberId } = await params;
  const supabase = await createClient();
  // RLSで更新できなかった場合はエラーにならず0件になるため、更新できた行を読み戻して確かめる
  const { data, error } = await supabase
    .from("members")
    .update({ is_owner: true })
    .eq("id", memberId)
    .eq("house_id", ctx.house.id)
    .is("left_at", null)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true });
}
