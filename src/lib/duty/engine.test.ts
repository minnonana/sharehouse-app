import { describe, expect, it } from "vitest";
import {
  buildSlots,
  getAssignmentsForWeek,
  needsOwnerConfirmation,
  nextWeekStart,
  pickRotation,
  type EngineDuty,
  type Rotation,
} from "./engine";
import { BASE_WEEK_START, DUTY_ORDER, ROOM_NUMBERS, getDutyAssignmentsForWeek } from "./rotation";

// 先魁のひな形（マイグレーション0008の初期値と同じまとめ方）
const MERGE: Record<string, [string, number]> = {
  entrance: ["toilet_2f", 1],
  wed_fri: ["thu_trash", 2],
  mon_trash: ["thu_trash", 3],
  toilet_2f: ["toilet_1f", 4],
  toilet_1f: ["kitchen_1f", 5],
  thu_trash: ["kitchen_1f", 6],
};
const sakigake: EngineDuty[] = DUTY_ORDER.map((key, i) => ({
  id: key,
  key,
  sortOrder: i,
  mergeIntoId: MERGE[key]?.[0] ?? null,
  mergeOrder: MERGE[key]?.[1] ?? null,
}));

function addWeeks(dateStr: string, weeks: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + weeks * 7, 12));
  return date.toISOString().slice(0, 10);
}

describe("buildSlots", () => {
  it("8部屋: 7担当＋休み1（今の先魁と同じ並び）", () => {
    expect(buildSlots(sakigake, 8)).toEqual([
      ["kitchen_1f"],
      ["toilet_1f"],
      ["toilet_2f"],
      ["entrance"],
      ["mon_trash"],
      ["thu_trash"],
      ["wed_fri"],
      [],
    ]);
  });

  it("7部屋: 7担当で休みなし", () => {
    const slots = buildSlots(sakigake, 7);
    expect(slots).toHaveLength(7);
    expect(slots.every((s) => s.length === 1)).toBe(true);
  });

  it("6部屋: 玄関を2Fトイレにまとめる", () => {
    expect(buildSlots(sakigake, 6)).toEqual([
      ["kitchen_1f"],
      ["toilet_1f"],
      ["toilet_2f", "entrance"],
      ["mon_trash"],
      ["thu_trash"],
      ["wed_fri"],
    ]);
  });

  it("5部屋: さらに水金を木のゴミにまとめる", () => {
    expect(buildSlots(sakigake, 5)).toEqual([
      ["kitchen_1f"],
      ["toilet_1f"],
      ["toilet_2f", "entrance"],
      ["mon_trash"],
      ["thu_trash", "wed_fri"],
    ]);
  });

  it("どの人数でも、すべての担当がちょうど1回ずつ入る", () => {
    for (let n = 1; n <= 10; n++) {
      const slots = buildSlots(sakigake, n);
      expect(slots).toHaveLength(n);
      const all = slots.flat().sort();
      expect(all).toEqual(DUTY_ORDER.filter((k) => k !== "rest").sort());
    }
  });

  it("9部屋以上: 休みが増える", () => {
    expect(buildSlots(sakigake, 10).filter((s) => s.length === 0)).toHaveLength(3);
  });

  it("まとめ方の設定がなくても、部屋数に収まる", () => {
    const plain = sakigake.map((d) => ({ ...d, mergeIntoId: null, mergeOrder: null }));
    const slots = buildSlots(plain, 3);
    expect(slots).toHaveLength(3);
    expect(slots.flat()).toHaveLength(7);
  });

  it("0部屋なら空", () => {
    expect(buildSlots(sakigake, 0)).toEqual([]);
  });
});

describe("getAssignmentsForWeek", () => {
  const rotation: Rotation = {
    startsOn: BASE_WEEK_START,
    roomIds: [...ROOM_NUMBERS],
    slots: buildSlots(sakigake, 8),
  };

  it("今の先魁の当番表（従来の計算）と、60週にわたって一致する", () => {
    for (let w = -4; w < 60; w++) {
      const weekStart = addWeeks(BASE_WEEK_START, w);
      const legacy = getDutyAssignmentsForWeek(weekStart);
      const next = getAssignmentsForWeek(rotation, weekStart);
      for (const room of ROOM_NUMBERS) {
        const expected = legacy[room] === "rest" ? [] : [legacy[room]];
        expect(next.get(room)).toEqual(expected);
      }
    }
  });

  it("一周で、全員が各枠を1回ずつ受け持つ", () => {
    const five: Rotation = { startsOn: "2026-11-15", roomIds: ["a", "b", "c", "d", "e"], slots: buildSlots(sakigake, 5) };
    const seen = new Map<string, Set<string>>();
    for (let w = 0; w < 5; w++) {
      const week = getAssignmentsForWeek(five, addWeeks("2026-11-15", w));
      for (const [room, slot] of week) {
        if (!seen.has(room)) seen.set(room, new Set());
        seen.get(room)!.add(slot.join("+"));
      }
    }
    for (const room of five.roomIds) expect(seen.get(room)!.size).toBe(5);
  });

  it("部屋数と枠の数が合わないときは、何も割り当てない", () => {
    const broken: Rotation = { startsOn: BASE_WEEK_START, roomIds: ["a", "b"], slots: [["x"]] };
    expect(getAssignmentsForWeek(broken, BASE_WEEK_START).size).toBe(0);
  });
});

describe("pickRotation / nextWeekStart / needsOwnerConfirmation", () => {
  const rotations = [{ startsOn: "2026-09-27" }, { startsOn: "2026-11-22" }];

  it("週の開始日以前で、いちばん新しい組み方を選ぶ（今週はそのまま、次の日曜から切り替わる）", () => {
    expect(pickRotation(rotations, "2026-11-15")?.startsOn).toBe("2026-09-27");
    expect(pickRotation(rotations, "2026-11-22")?.startsOn).toBe("2026-11-22");
    expect(pickRotation(rotations, "2026-09-20")).toBeNull();
  });

  it("次の日曜日を返す（月またぎ・年またぎ）", () => {
    expect(nextWeekStart("2026-11-29")).toBe("2026-12-06");
    expect(nextWeekStart("2026-12-27")).toBe("2027-01-03");
  });

  it("代表者の確認が必要な人数", () => {
    expect(needsOwnerConfirmation("sakigake", 6)).toBe(false);
    expect(needsOwnerConfirmation("sakigake", 5)).toBe(true);
    expect(needsOwnerConfirmation("hokumei", 4)).toBe(false);
    expect(needsOwnerConfirmation("hokumei", 3)).toBe(true);
  });
});
