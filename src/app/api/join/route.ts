import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROOM_NUMBERS } from "@/lib/duty/rotation";

// 招待コードを使ってハウスに参加する
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json();
  const { inviteCode, name, roomNumber, displayLanguage } = body as {
    inviteCode: string;
    name: string;
    roomNumber: string;
    displayLanguage: "ja" | "en";
  };

  if (!inviteCode || !name || !roomNumber) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (!ROOM_NUMBERS.includes(roomNumber as (typeof ROOM_NUMBERS)[number])) {
    return NextResponse.json({ error: "invalid_room_number" }, { status: 400 });
  }

  const { data: code } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("code", inviteCode)
    .maybeSingle();

  if (!code) {
    return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  }
  if (code.used_by) {
    return NextResponse.json({ error: "code_already_used" }, { status: 409 });
  }
  if (new Date(code.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "code_expired" }, { status: 410 });
  }

  // その部屋番号が既に埋まっていないか確認
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("house_id", code.house_id)
    .eq("room_number", roomNumber)
    .is("left_at", null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "room_already_occupied" }, { status: 409 });
  }

  // 参加直後はまだ自分の members 行が無いため、「自分の所属ハウスだけ見れる」という
  // members の SELECT ポリシー上、insert().select() で作成直後の行を読み戻すことができない
  // （auth_house_ids() がこの新しい行を見つけられず、Postgres は INSERT の WITH CHECK 違反と
  // 同じ "new row violates row-level security policy" エラーを返す）。
  // ハウス作成時と同様、id をアプリ側で発行し、SELECT を伴わない insert のみで作成する。
  const memberId = randomUUID();
  const memberJoinedAt = new Date().toISOString();

  const { error: memberError } = await supabase.from("members").insert({
    id: memberId,
    house_id: code.house_id,
    auth_user_id: user.id,
    name,
    room_number: roomNumber,
    display_language: displayLanguage ?? "ja",
    is_owner: false,
    joined_at: memberJoinedAt,
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const member = {
    id: memberId,
    house_id: code.house_id,
    auth_user_id: user.id,
    name,
    room_number: roomNumber,
    display_language: displayLanguage ?? "ja",
    is_owner: false,
    joined_at: memberJoinedAt,
    left_at: null,
  };

  await supabase
    .from("invite_codes")
    .update({ used_by: member.id, used_at: new Date().toISOString() })
    .eq("id", code.id);

  return NextResponse.json({ member });
}
