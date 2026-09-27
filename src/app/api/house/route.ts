import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROOM_NUMBERS, DUTY_ORDER, DUTY_LABELS } from "@/lib/duty/rotation";

// 代表者がハウスを新規作成する。作成した人がそのまま最初の代表者(is_owner)になる。
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

  const { data: house, error: houseError } = await supabase
    .from("houses")
    .insert({ name: houseName })
    .select()
    .single();

  if (houseError || !house) {
    return NextResponse.json({ error: houseError?.message ?? "house_create_failed" }, { status: 500 });
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      house_id: house.id,
      auth_user_id: user.id,
      name,
      room_number: roomNumber,
      display_language: displayLanguage ?? "ja",
      is_owner: true,
    })
    .select()
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: memberError?.message ?? "member_create_failed" }, { status: 500 });
  }

  // 初期の担当マスタを投入（設定画面で後から変更可能）
  const dutyTypesPayload = DUTY_ORDER.map((key, index) => ({
    house_id: house.id,
    key,
    label_ja: DUTY_LABELS[key].ja,
    label_en: DUTY_LABELS[key].en,
    short_label: DUTY_LABELS[key].short,
    category: key === "rest" ? "rest" : key.includes("trash") || key === "wed_fri" ? "trash" : "chore",
    sort_order: index,
  }));

  await supabase.from("duty_types").insert(dutyTypesPayload);
  await supabase.from("washer_status").insert({ house_id: house.id, status: "idle" });

  return NextResponse.json({ house, member });
}
