// 週ごとの当番表（どの部屋が、どの担当を受け持つか）を組み立てる。
// 部屋・担当・組み方の区切りは DB（rooms / duty_types / duty_rotations）から読み、
// 組み方がまだ無いハウスでは、従来の固定ローテーション（rotation.ts）にフォールバックする。
import { getAssignmentsForWeek, nextWeekStart, pickRotation, type Rotation } from "./engine";
import {
  DUTY_LABELS,
  ROOM_NUMBERS,
  getDutyAssignmentsForWeek,
  getWedFriCollectionsForWeek,
  getWedFriDutyLabel,
  getWeekStartDate,
  type DutyKey,
  type TrashEvent,
} from "./rotation";

export interface PlanDuty {
  id: string;
  key: string;
  label_ja: string;
  label_en: string;
  short_label: string;
}

export interface RoomRow {
  id: string;
  room_number: string;
  sort_order: number;
  resident_name?: string | null;
}

export interface RotationRow {
  starts_on: string;
  room_ids: string[];
  slots: string[][];
}

export interface PlanEntry {
  roomNumber: string;
  /** アプリ未参加の住人の名前（代表者が部屋に登録したもの） */
  residentName: string | null;
  /** その週に受け持つ担当。空なら「休み」 */
  duties: PlanDuty[];
}

export interface PlanWeek {
  weekStartDate: string;
  entries: PlanEntry[];
  wedFriCollections: TrashEvent[];
}

function legacyDuty(key: DutyKey, dutyByKey: Map<string, PlanDuty>): PlanDuty {
  return (
    dutyByKey.get(key) ?? {
      id: key,
      key,
      label_ja: DUTY_LABELS[key].ja,
      label_en: DUTY_LABELS[key].en,
      short_label: DUTY_LABELS[key].short,
    }
  );
}

function buildWeekEntries(
  weekStart: string,
  rooms: RoomRow[],
  duties: PlanDuty[],
  rotations: RotationRow[],
): PlanEntry[] {
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const dutyById = new Map(duties.map((d) => [d.id, d]));
  const residentNameByRoom = new Map(rooms.map((r) => [r.room_number, r.resident_name ?? null]));

  const picked = pickRotation(
    rotations.map((r) => ({ ...r, startsOn: r.starts_on })),
    weekStart,
  );

  if (picked && picked.room_ids.length > 0 && picked.room_ids.every((id) => roomById.has(id))) {
    const rotation: Rotation = { startsOn: picked.starts_on, roomIds: picked.room_ids, slots: picked.slots };
    const assignments = getAssignmentsForWeek(rotation, weekStart);
    if (assignments.size === picked.room_ids.length) {
      return picked.room_ids.map((roomId) => {
        const room = roomById.get(roomId) as RoomRow;
        return {
          roomNumber: room.room_number,
          residentName: room.resident_name ?? null,
          duties: (assignments.get(roomId) ?? [])
            .map((id) => dutyById.get(id))
            .filter((d): d is PlanDuty => d !== undefined),
        };
      });
    }
  }

  // 組み方がまだ無い（または読めない）ときは、従来の固定ローテーション
  const dutyByKey = new Map(duties.map((d) => [d.key, d]));
  const legacy = getDutyAssignmentsForWeek(weekStart);
  return ROOM_NUMBERS.map((room) => ({
    roomNumber: room,
    residentName: residentNameByRoom.get(room) ?? null,
    duties: legacy[room] === "rest" ? [] : [legacyDuty(legacy[room], dutyByKey)],
  }));
}

/** startWeek から numberOfWeeks 週分の当番表を作る */
export function buildPlanWeeks(params: {
  rooms: RoomRow[];
  duties: PlanDuty[];
  rotations: RotationRow[];
  startWeek: string;
  numberOfWeeks: number;
}): PlanWeek[] {
  const weeks: PlanWeek[] = [];
  let cursor = getWeekStartDate(params.startWeek);
  for (let i = 0; i < params.numberOfWeeks; i++) {
    weeks.push({
      weekStartDate: cursor,
      entries: buildWeekEntries(cursor, params.rooms, params.duties, params.rotations),
      wedFriCollections: getWedFriCollectionsForWeek(cursor),
    });
    cursor = nextWeekStart(cursor);
  }
  return weeks;
}

/** 担当の表示名と短い記号。「水金」は、その週に実際に出すゴミの種類で具体的に表示する */
export function dutyDisplay(
  duty: PlanDuty,
  lang: "ja" | "en",
  wedFriCollections: TrashEvent[],
): { short: string; label: string } {
  const known = DUTY_LABELS[duty.key as DutyKey];
  if (duty.key === "wed_fri") {
    return { short: known.short, label: getWedFriDutyLabel(wedFriCollections, lang) };
  }
  if (known) return { short: known.short, label: known[lang] };
  return { short: duty.short_label, label: lang === "ja" ? duty.label_ja : duty.label_en };
}
