import { describe, expect, it } from "vitest";
import { buildSlots, type EngineDuty } from "./engine";
import { DORM_TEMPLATES, normalizeRoomNumbers } from "./templates";

function engineDuties(dorm: "sakigake" | "hokumei"): EngineDuty[] {
  return DORM_TEMPLATES[dorm].duties.map((d, i) => ({
    id: d.key,
    key: d.key,
    sortOrder: i,
    mergeIntoId: d.mergeInto ?? null,
    mergeOrder: d.mergeOrder ?? null,
  }));
}

describe("寮のひな形", () => {
  it("北溟: 5人なら5つの担当を1つずつ、休みなし", () => {
    expect(buildSlots(engineDuties("hokumei"), 5)).toEqual([
      ["kitchen_living"],
      ["shower_toilet"],
      ["mon_trash"],
      ["thu_trash"],
      ["wed_fri"],
    ]);
  });

  it("北溟: 4人なら水金を木のゴミにまとめ、3人ならさらに月のゴミもまとめる", () => {
    expect(buildSlots(engineDuties("hokumei"), 4)).toEqual([
      ["kitchen_living"],
      ["shower_toilet"],
      ["mon_trash"],
      ["thu_trash", "wed_fri"],
    ]);
    expect(buildSlots(engineDuties("hokumei"), 3)).toEqual([
      ["kitchen_living"],
      ["shower_toilet"],
      ["thu_trash", "wed_fri", "mon_trash"],
    ]);
  });

  it("先魁: ひな形のまとめ方は、マイグレーション0008の初期値と同じ結果になる", () => {
    expect(buildSlots(engineDuties("sakigake"), 6)[2]).toEqual(["toilet_2f", "entrance"]);
    expect(buildSlots(engineDuties("sakigake"), 5)[4]).toEqual(["thu_trash", "wed_fri"]);
  });

  it("まとめ先は、同じひな形の中にある担当を指している", () => {
    for (const tpl of Object.values(DORM_TEMPLATES)) {
      const keys = new Set(tpl.duties.map((d) => d.key));
      for (const d of tpl.duties) if (d.mergeInto) expect(keys.has(d.mergeInto)).toBe(true);
    }
  });
});

describe("normalizeRoomNumbers", () => {
  it("空欄を捨て、前後の空白を除く", () => {
    expect(normalizeRoomNumbers([" 201 ", "", "202"], 5)).toEqual(["201", "202"]);
  });
  it("重複・多すぎ・空・長すぎは受け付けない", () => {
    expect(normalizeRoomNumbers(["201", "201"], 5)).toBeNull();
    expect(normalizeRoomNumbers(["1", "2", "3", "4", "5", "6"], 5)).toBeNull();
    expect(normalizeRoomNumbers(["", " "], 5)).toBeNull();
    expect(normalizeRoomNumbers(["12345678901"], 5)).toBeNull();
    expect(normalizeRoomNumbers("201", 5)).toBeNull();
  });
});
