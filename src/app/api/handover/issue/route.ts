import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { generateSixDigitCode, addHours } from "@/lib/invite/code";

// 機種変更・アプリ削除用の引き継ぎコードを発行する（有効期限24時間）。
// 自分自身のためのコードなので、誰でも発行できる。
export async function POST() {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const supabase = await createClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSixDigitCode();
    const { data, error } = await supabase
      .from("handover_codes")
      .insert({
        member_id: ctx.member.id,
        code,
        expires_at: addHours(new Date(), 24).toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ handoverCode: data });
    }
  }

  return NextResponse.json({ error: "issue_failed" }, { status: 500 });
}
