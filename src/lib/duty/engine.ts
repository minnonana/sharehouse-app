// 当番の組み方（部屋数に合わせたローテーション）のコアロジック。
// 従来の rotation.ts は「8部屋・7担当＋休み」に固定だが、こちらは
// 入居中の部屋数に合わせて休みを増減し、足りなければ担当をまとめる。
// 仕様: docs/plan-dorms.md

export type DormType = "sakigake" | "hokumei";

export interface EngineDuty {
  id: string;
  key: string;
  sortOrder: number;
  /** 人数が足りないときに、この担当をまとめる先 */
  mergeIntoId: string | null;
  /** まとめる順（小さいほど先にまとめる）。null はまとめない */
  mergeOrder: number | null;
}

/** 1つの枠が受け持つ担当idの並び。空の配列は「休み」 */
export type Slot = string[];

export interface Rotation {
  /** この組み方が始まる週（日曜日, YYYY-MM-DD） */
  startsOn: string;
  /** 回す部屋（入居中）の並び */
  roomIds: string[];
  /** 1週目に各部屋が受け持つ枠。毎週、部屋ごとに1つ前の枠へずれていく */
  slots: Slot[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/**
 * 入居中の部屋数に合わせて、枠（担当のまとまり）を作る。
 * - 部屋数 ≧ 担当数: 担当を1つずつ、余りは休み
 * - 部屋数 ＜ 担当数: merge_order の小さい順に、担当をまとめ先の枠へ寄せる
 */
export function buildSlots(duties: EngineDuty[], roomCount: number): Slot[] {
  if (roomCount <= 0) return [];

  const real = duties.filter((d) => d.key !== "rest").sort((a, b) => a.sortOrder - b.sortOrder);
  const slots: Slot[] = real.map((d) => [d.id]);

  if (roomCount >= slots.length) {
    while (slots.length < roomCount) slots.push([]);
    return slots;
  }

  const byId = new Map(real.map((d) => [d.id, d]));
  const mergeQueue = real
    .filter((d) => d.mergeOrder !== null && d.mergeIntoId !== null && byId.has(d.mergeIntoId))
    .sort((a, b) => (a.mergeOrder as number) - (b.mergeOrder as number));

  for (const duty of mergeQueue) {
    if (slots.length <= roomCount) break;
    const fromIndex = slots.findIndex((s) => s[0] === duty.id);
    if (fromIndex === -1) continue; // すでに別の枠にまとめられている
    const toIndex = slots.findIndex((s, i) => i !== fromIndex && s.includes(duty.mergeIntoId as string));
    if (toIndex === -1) continue;
    slots[toIndex].push(...slots[fromIndex]);
    slots.splice(fromIndex, 1);
  }

  // まとめ方の設定だけでは足りないときは、後ろの枠から順に1つ前へ寄せる
  while (slots.length > roomCount) {
    const last = slots.pop() as Slot;
    slots[slots.length - 1].push(...last);
  }

  return slots;
}

/** まとめが進んで1人の負担が大きくなる人数かどうか（代表者の確認が必要） */
export function needsOwnerConfirmation(dormType: DormType, occupiedRoomCount: number): boolean {
  const threshold = dormType === "hokumei" ? 3 : 5;
  return occupiedRoomCount <= threshold;
}

/** 指定した週に有効な組み方（開始日が週以前で、いちばん新しいもの）を選ぶ */
export function pickRotation<T extends { startsOn: string }>(rotations: T[], weekStart: string): T | null {
  let picked: T | null = null;
  for (const r of rotations) {
    if (r.startsOn <= weekStart && (picked === null || r.startsOn > picked.startsOn)) {
      picked = r;
    }
  }
  return picked;
}

/** 指定した週の、部屋ごとの担当idの並びを返す（休みは空の配列） */
export function getAssignmentsForWeek(rotation: Rotation, weekStart: string): Map<string, Slot> {
  const n = rotation.roomIds.length;
  const result = new Map<string, Slot>();
  if (n === 0 || rotation.slots.length !== n) return result;

  const weekIndex = Math.round(
    (parseDate(weekStart).getTime() - parseDate(rotation.startsOn).getTime()) / WEEK_MS,
  );

  rotation.roomIds.forEach((roomId, roomIndex) => {
    const slotIndex = (((roomIndex - weekIndex) % n) + n) % n;
    result.set(roomId, rotation.slots[slotIndex]);
  });

  return result;
}

/** 次の日曜日（組み直しが反映される週の開始日）を返す。weekStart はその週の日曜日 */
export function nextWeekStart(weekStart: string): string {
  const d = parseDate(weekStart);
  d.setUTCDate(d.getUTCDate() + 7);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
