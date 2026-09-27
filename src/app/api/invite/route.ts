import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSixDigitCode, addDays } from "@/lib/invite/code";

// 代表者が招待コードを発行する（有効期限7日）
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!member || !member.is_owner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 重複しにくいよう数回試行する
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSixDigitCode();
    const { data, error } = await supabase
      .from("invite_codes")
      .insert({
        house_id: member.house_id,
        code,
        created_by: member.id,
        expires_at: addDays(new Date(), 7).toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ inviteCode: data });
    }
  }

  return NextResponse.json({ error: "issue_failed" }, { status: 500 });
}
