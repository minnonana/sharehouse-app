import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROOM_NUMBERS, DUTY_ORDER, DUTY_LABELS } from "@/lib/duty/rotation";

// 代表者がハウスを新規作成する。作成した人がそのまま最初の代表者(is_owner)になる。
//
// 注意: ハウス作成の直後はまだ自分の members 行が無いため、
// 「自分の所属ハウスだけ見れる」という houses の SELECT ポリシー上、
// insert().select() で作成直後の行を読み戻すことができない。
// そのため id をアプリ側で発行し、SELECT を伴わない insert のみで作成する。
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { houseName, name, roomNumber, displayLanguage } = body as {
    houseName: string;
    name: string;
    roomNumber: string;
    displayLanguage: "ja" | "en";
  };

  if (!houseName || !name || !roomNumber) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (!ROOM_NUMBERS.includes(roomNumber as (typeof ROOM_NUMBERS)[number])) {
    return NextResponse.json({ error: "invalid_room_number" }, { status: 400 });
  }

  const houseId = randomUUID();
  const houseCreatedAt = new Date().toISOString();

  const { error: houseError } = await supabase
    .from("houses")
    .insert({ id: houseId, name: houseName, created_at: houseCreatedAt });

  if (houseError) {
    return NextResponse.json({ error: houseError.message }, { status: 500 });
  }

  const memberId = randomUUID();
  const memberJoinedAt = new Date().toISOString();

  const { error: memberError } = await supabase.from("members").insert({
    id: memberId,
    house_id: houseId,
    auth_user_id: user.id,
    name,
    room_number: roomNumber,
    display_language: displayLanguage ?? "ja",
    is_owner: true,
    joined_at: memberJoinedAt,
  });

  if (memberError) {
    // ハウス作成には成功したがメンバー作成に失敗した場合はハウスも削除しておく
    await supabase.from("houses").delete().eq("id", houseId);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // 初期の担当マスタを投入（設定画面で後から変更可能）
  const dutyTypesPayload = DUTY_ORDER.map((key, index) => ({
    house_id: houseId,
    key,
    label_ja: DUTY_LABELS[key].ja,
    label_en: DUTY_LABELS[key].en,
    short_label: DUTY_LABELS[key].short,
    category: key === "rest" ? "rest" : key.includes("trash") || key === "wed_fri" ? "trash" : "chore",
    sort_order: index,
  }));

  await supabase.from("duty_types").insert(dutyTypesPayload);
  await supabase.from("washer_status").insert({ house_id: houseId, status: "idle" });

  return NextResponse.json({
    house: { id: houseId, name: houseName, created_at: houseCreatedAt },
    member: {
      id: memberId,
      house_id: houseId,
      auth_user_id: user.id,
      name,
      room_number: roomNumber,
      display_language: displayLanguage ?? "ja",
      is_owner: true,
      joined_at: memberJoinedAt,
      left_at: null,
    },
  });
}
