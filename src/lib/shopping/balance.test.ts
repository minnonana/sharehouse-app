import { describe, expect, it } from "vitest";
import { buildMonthlyBalance } from "./balance";

describe("buildMonthlyBalance", () => {
  it("仕様書の例と一致する繰越・集まった額・使った額・残高を計算できる", () => {
    const dues = [
      // 10月: 8人払った
      ...Array.from({ length: 8 }, (_, i) => ({ year: 2026, month: 10, amount_yen: 500, paid: true, id: i })),
      // 11月: 7人払った
      ...Array.from({ length: 7 }, (_, i) => ({ year: 2026, month: 11, amount_yen: 500, paid: true, id: i })),
    ];
    const spends = [
      { amount_yen: 2350, completed_at: "2026-10-15T00:00:00Z" },
      { amount_yen: 3100, completed_at: "2026-11-20T00:00:00Z" },
    ];

    const rows = buildMonthlyBalance(dues, spends, 2026, 10, 2026, 11);

    expect(rows).toEqual([
      { year: 2026, month: 10, carryover: 0, collected: 4000, spent: 2350, balance: 1650 },
      { year: 2026, month: 11, carryover: 1650, collected: 3500, spent: 3100, balance: 2050 },
    ]);
  });

  it("未払いの人はcollectedに含めない", () => {
    const dues = [
      { year: 2026, month: 10, amount_yen: 500, paid: true },
      { year: 2026, month: 10, amount_yen: 500, paid: false },
    ];
    const rows = buildMonthlyBalance(dues, [], 2026, 10, 2026, 10);
    expect(rows[0].collected).toBe(500);
  });
});
