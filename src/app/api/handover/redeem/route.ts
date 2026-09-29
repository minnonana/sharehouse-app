import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 新しい端末で引き継ぎコードを入力し、元の住人データに戻る
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { code } = (await request.json()) as { code: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { data: member, error } = await supabase.rpc("redeem_handover_code", {
    p_code: code.trim(),
    p_new_auth_user_id: user.id,
  });

  if (error) {
    const message = error.message.includes("invalid_or_expired_code")
      ? "invalid_or_expired_code"
      : error.message.includes("member_not_found_or_left")
        ? "member_not_found_or_left"
        : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ member });
}
