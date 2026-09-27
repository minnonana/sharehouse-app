import { describe, expect, it } from "vitest";
import {
  getDutyAssignmentsForWeek,
  getWedFriCollectionsForWeek,
  getWeekIndex,
  getWeekStartDate,
} from "./rotation";

describe("getWeekStartDate", () => {
  it("平日の日付から週の日曜日を求められる", () => {
    expect(getWeekStartDate("2026-09-30")).toBe("2026-09-27");
    expect(getWeekStartDate("2026-09-27")).toBe("2026-09-27");
    expect(getWeekStartDate("2026-10-03")).toBe("2026-09-27");
    expect(getWeekStartDate("2026-10-04")).toBe("2026-10-04");
  });
});

describe("getWeekIndex", () => {
  it("基準週からの週数を計算できる", () => {
    expect(getWeekIndex("2026-09-27")).toBe(0);
    expect(getWeekIndex("2026-10-04")).toBe(1);
    expect(getWeekIndex("2026-09-20")).toBe(-1);
  });
});

describe("getDutyAssignmentsForWeek — 仕様書の当番表と一致すること", () => {
  it("9/27週: 111=1Fキッチン ... 118=休み", () => {
    expect(getDutyAssignmentsForWeek("2026-09-27")).toEqual({
      "111": "kitchen_1f",
      "112": "toilet_1f",
      "113": "toilet_2f",
      "114": "entrance",
      "115": "mon_trash",
      "116": "thu_trash",
      "117": "wed_fri",
      "118": "rest",
    });
  });

  it("10/4週: 111=休み ... 118=水金", () => {
    expect(getDutyAssignmentsForWeek("2026-10-04")).toEqual({
      "111": "rest",
      "112": "kitchen_1f",
      "113": "toilet_1f",
      "114": "toilet_2f",
      "115": "entrance",
      "116": "mon_trash",
      "117": "thu_trash",
      "118": "wed_fri",
    });
  });

  it("11/22週(8週後): 9/27週と同じ並びに戻る", () => {
    expect(getDutyAssignmentsForWeek("2026-11-22")).toEqual(
      getDutyAssignmentsForWeek("2026-09-27"),
    );
  });

  it("2/28週: 仕様書の最終行と一致する", () => {
    expect(getDutyAssignmentsForWeek("2027-02-28")).toEqual({
      "111": "toilet_2f",
      "112": "entrance",
      "113": "mon_trash",
      "114": "thu_trash",
      "115": "wed_fri",
      "116": "rest",
      "117": "kitchen_1f",
      "118": "toilet_1f",
    });
  });
});

describe("getWedFriCollectionsForWeek — 仕様書のゴミ収集日と一致すること", () => {
  it("9/27週: 収集なし", () => {
    expect(getWedFriCollectionsForWeek("2026-09-27")).toEqual([]);
  });

  it("10/4週: あきびん(10/7) + 資源(10/9)", () => {
    expect(getWedFriCollectionsForWeek("2026-10-04")).toEqual([
      { date: "2026-10-07", kind: "bottle" },
      { date: "2026-10-09", kind: "recyclable" },
    ]);
  });

  it("10/11週: 燃やさないごみ(10/16)のみ", () => {
    expect(getWedFriCollectionsForWeek("2026-10-11")).toEqual([
      { date: "2026-10-16", kind: "non_burnable" },
    ]);
  });

  it("10/25週: プラスチック資源のみ(10/30、第5金曜)", () => {
    expect(getWedFriCollectionsForWeek("2026-10-25")).toEqual([
      { date: "2026-10-30", kind: "plastic_only" },
    ]);
  });

  it("12/27週: 収集なし", () => {
    expect(getWedFriCollectionsForWeek("2026-12-27")).toEqual([]);
  });

  it("2027-01-03週: あきびん(1/6) + 資源(1/8)", () => {
    expect(getWedFriCollectionsForWeek("2027-01-03")).toEqual([
      { date: "2027-01-06", kind: "bottle" },
      { date: "2027-01-08", kind: "recyclable" },
    ]);
  });
});
