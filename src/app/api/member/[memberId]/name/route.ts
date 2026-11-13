import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 住人の名前を変更する。本人は自分の名前を、代表者は同じハウスの住人の名前を変えられる。
export async function POST(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { memberId } = await params;
  const { name } = (await request.json()) as { name: string };
  const trimmed = name?.trim();
  if (!trimmed || trimmed.length > 40) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (memberId !== ctx.member.id && !ctx.member.is_owner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  // RLSで更新できなかった場合はエラーにならず0件になるため、更新できた行を読み戻して確かめる
  const { data, error } = await supabase
    .from("members")
    .update({ name: trimmed })
    .eq("id", memberId)
    .eq("house_id", ctx.house.id)
    .is("left_at", null)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ ok: true });
}
