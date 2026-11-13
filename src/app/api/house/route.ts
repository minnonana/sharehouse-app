import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROOM_NUMBERS, DUTY_ORDER, DUTY_LABELS, BASE_WEEK_START, getWeekStartDate } from "@/lib/duty/rotation";
import { buildSlots, type DormType } from "@/lib/duty/engine";
import { DORM_TEMPLATES, isDormType, normalizeRoomNumbers } from "@/lib/duty/templates";
import { getTodayJst } from "@/lib/date/jst";

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

  // 寮（担当のひな形）と、ユニットの全部屋の番号。省略時は従来どおり先魁の111〜118
  const dormType: DormType = isDormType(body.dormType) ? body.dormType : "sakigake";
  const template = DORM_TEMPLATES[dormType];
  const roomNumbers =
    body.roomNumbers === undefined ? [...ROOM_NUMBERS] : normalizeRoomNumbers(body.roomNumbers, template.maxRooms);
  if (!roomNumbers) {
    return NextResponse.json({ error: "invalid_room_numbers" }, { status: 400 });
  }
  if (!roomNumbers.includes(roomNumber)) {
    return NextResponse.json({ error: "invalid_room_number" }, { status: 400 });
  }

  const houseId = randomUUID();
  const houseCreatedAt = new Date().toISOString();

  const { error: houseError } = await supabase
    .from("houses")
    .insert({ id: houseId, name: houseName, created_at: houseCreatedAt, dorm_type: dormType });

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

  // 担当マスタ（寮のひな形）。まとめ先を id で持つため、id を先に発行する
  const dutyIdByKey = new Map(template.duties.map((d) => [d.key, randomUUID()]));
  const dutyTypesPayload: Record<string, unknown>[] = template.duties.map((d, index) => ({
    id: dutyIdByKey.get(d.key),
    house_id: houseId,
    key: d.key,
    label_ja: d.ja,
    label_en: d.en,
    short_label: d.short,
    category: d.category,
    sort_order: index,
    merge_into_id: d.mergeInto ? dutyIdByKey.get(d.mergeInto) : null,
    merge_order: d.mergeOrder ?? null,
  }));
  dutyTypesPayload.push({
    id: randomUUID(),
    house_id: houseId,
    key: "rest",
    label_ja: DUTY_LABELS.rest.ja,
    label_en: DUTY_LABELS.rest.en,
    short_label: DUTY_LABELS.rest.short,
    category: "rest",
    sort_order: template.duties.length,
    merge_into_id: null,
    merge_order: null,
  });
  await supabase.from("duty_types").insert(dutyTypesPayload);

  // 部屋と、当番の組み方の区切り
  const roomsPayload = roomNumbers.map((roomNumberValue, index) => ({
    id: randomUUID(),
    house_id: houseId,
    room_number: roomNumberValue,
    sort_order: index,
  }));
  await supabase.from("rooms").insert(roomsPayload);
  await supabase
    .from("members")
    .update({ room_id: roomsPayload.find((r) => r.room_number === roomNumber)?.id })
    .eq("id", memberId);

  // 従来どおりの先魁（111〜118）は、定時通知と同じ基準週・同じ並びで回す。
  // それ以外は、今週から、部屋数に合わせて組んだ枠で回す。
  const isLegacyShape =
    dormType === "sakigake" && roomNumbers.length === ROOM_NUMBERS.length && roomNumbers.every((r, i) => r === ROOM_NUMBERS[i]);
  const slots = isLegacyShape
    ? DUTY_ORDER.map((key) => (key === "rest" ? [] : [dutyIdByKey.get(key) as string]))
    : buildSlots(
        template.duties.map((d, index) => ({
          id: dutyIdByKey.get(d.key) as string,
          key: d.key,
          sortOrder: index,
          mergeIntoId: d.mergeInto ? (dutyIdByKey.get(d.mergeInto) as string) : null,
          mergeOrder: d.mergeOrder ?? null,
        })),
        roomsPayload.length,
      );
  await supabase.from("duty_rotations").insert({
    house_id: houseId,
    starts_on: isLegacyShape ? BASE_WEEK_START : getWeekStartDate(getTodayJst()),
    room_ids: roomsPayload.map((r) => r.id),
    slots,
  });

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
