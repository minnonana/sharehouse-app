import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 退去処理。代表者は他のメンバーを、本人は自分自身を退去させられる。
// 代表者が2人未満になる退去はDB関数側で拒否される。
export async function POST(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { memberId } = await params;
  const supabase = await createClient();

  const { error } = await supabase.rpc("leave_member", { p_member_id: memberId });

  if (error) {
    const message = error.message.includes("owner_count_would_drop_below_two")
      ? "owner_count_would_drop_below_two"
      : error.message.includes("forbidden")
        ? "forbidden"
        : error.message.includes("member_not_found")
          ? "member_not_found"
          : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
