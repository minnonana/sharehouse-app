import { describe, expect, it } from "vitest";
import { buildPlanWeeks, dutyDisplay, type PlanDuty, type RoomRow, type RotationRow } from "./plan";
import { BASE_WEEK_START, DUTY_LABELS, DUTY_ORDER, ROOM_NUMBERS, buildDutySchedule } from "./rotation";

const duties: PlanDuty[] = DUTY_ORDER.map((key) => ({
  id: `dt-${key}`,
  key,
  label_ja: DUTY_LABELS[key].ja,
  label_en: DUTY_LABELS[key].en,
  short_label: DUTY_LABELS[key].short,
}));
const rooms: RoomRow[] = ROOM_NUMBERS.map((n, i) => ({ id: `r-${n}`, room_number: n, sort_order: i }));
// マイグレーション0008が今あるハウスに入れる組み方と同じ形
const migrated: RotationRow = {
  starts_on: BASE_WEEK_START,
  room_ids: rooms.map((r) => r.id),
  slots: DUTY_ORDER.map((key) => (key === "rest" ? [] : [`dt-${key}`])),
};

function keysOf(weeks: ReturnType<typeof buildPlanWeeks>) {
  return weeks.map((w) => w.entries.map((e) => `${e.roomNumber}:${e.duties.map((d) => d.key).join("+") || "rest"}`));
}

describe("buildPlanWeeks", () => {
  const legacy = buildDutySchedule("2026-11-08", 20).map((w) =>
    ROOM_NUMBERS.map((room) => `${room}:${w.assignments[room]}`),
  );

  it("移行後の組み方で、従来の当番表（20週分）と一致する", () => {
    const weeks = buildPlanWeeks({ rooms, duties, rotations: [migrated], startWeek: "2026-11-08", numberOfWeeks: 20 });
    expect(keysOf(weeks)).toEqual(legacy);
  });

  it("組み方が無いハウスは、従来の計算にフォールバックして同じ結果になる", () => {
    const weeks = buildPlanWeeks({ rooms: [], duties, rotations: [], startWeek: "2026-11-08", numberOfWeeks: 20 });
    expect(keysOf(weeks)).toEqual(legacy);
  });

  it("次の日曜から始まる新しい組み方は、今週には影響しない", () => {
    const five = rooms.slice(0, 5);
    const next: RotationRow = {
      starts_on: "2026-11-22",
      room_ids: five.map((r) => r.id),
      slots: [["dt-kitchen_1f"], ["dt-toilet_1f"], ["dt-toilet_2f", "dt-entrance"], ["dt-mon_trash"], ["dt-thu_trash", "dt-wed_fri"]],
    };
    const weeks = buildPlanWeeks({ rooms, duties, rotations: [migrated, next], startWeek: "2026-11-15", numberOfWeeks: 2 });
    expect(weeks[0].entries).toHaveLength(8);
    expect(weeks[1].entries).toHaveLength(5);
    expect(weeks[1].entries[2].duties.map((d) => d.key)).toEqual(["toilet_2f", "entrance"]);
  });

  it("部屋に登録した住人の名前を持つ", () => {
    const named = rooms.map((r) => (r.room_number === "114" ? { ...r, resident_name: "Lee" } : r));
    const [week] = buildPlanWeeks({ rooms: named, duties, rotations: [migrated], startWeek: "2026-11-08", numberOfWeeks: 1 });
    expect(week.entries.find((e) => e.roomNumber === "114")?.residentName).toBe("Lee");
  });
});

describe("dutyDisplay", () => {
  it("既知の担当はコード側の表示名、未知の担当はDBの表示名を使う", () => {
    expect(dutyDisplay(duties[4], "ja", []).label).toBe("燃えるゴミ(月)");
    const custom: PlanDuty = { id: "x", key: "kitchen_living", label_ja: "キッチン・リビング", label_en: "Kitchen & living", short_label: "KL" };
    expect(dutyDisplay(custom, "en", [])).toEqual({ short: "KL", label: "Kitchen & living" });
  });

  it("水金は、その週に出すゴミの種類で表示する", () => {
    expect(dutyDisplay(duties[6], "ja", [])).toEqual({ short: "WF", label: "水金（収集なし）" });
  });
});
