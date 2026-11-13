import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 代表者が、ログインが切れた住人の引き継ぎ（復旧）コードを発行する（有効期限24時間）。
// 権限の確認（同じハウスの代表者、または本人）はDB関数側で行う。
export async function POST(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { memberId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("issue_handover_code_for", { p_member_id: memberId });

  if (error || !data) {
    const message = error?.message.includes("forbidden")
      ? "forbidden"
      : error?.message.includes("member_not_found_or_left")
        ? "member_not_found_or_left"
        : (error?.message ?? "issue_failed");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ handoverCode: data });
}
