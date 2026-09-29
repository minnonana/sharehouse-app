/** 買い物帳・共用費の月ごとの集計ロジック */

export interface MonthlyBalanceRow {
  year: number;
  month: number;
  carryover: number;
  collected: number;
  spent: number;
  balance: number;
}

interface DueRow {
  year: number;
  month: number;
  amount_yen: number;
  paid: boolean;
}

interface SpendRow {
  amount_yen: number | null;
  completed_at: string | null;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 年月を1つずつ進める */
function nextMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

export function buildMonthlyBalance(
  dues: DueRow[],
  spends: SpendRow[],
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): MonthlyBalanceRow[] {
  const collectedByMonth = new Map<string, number>();
  for (const due of dues) {
    if (!due.paid) continue;
    const key = monthKey(due.year, due.month);
    collectedByMonth.set(key, (collectedByMonth.get(key) ?? 0) + due.amount_yen);
  }

  const spentByMonth = new Map<string, number>();
  for (const spend of spends) {
    if (!spend.completed_at || !spend.amount_yen) continue;
    const d = new Date(spend.completed_at);
    const key = monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
    spentByMonth.set(key, (spentByMonth.get(key) ?? 0) + spend.amount_yen);
  }

  const rows: MonthlyBalanceRow[] = [];
  let carryover = 0;
  let y = startYear;
  let m = startMonth;

  // 無限ループ防止のガード
  for (let i = 0; i < 240; i++) {
    const key = monthKey(y, m);
    const collected = collectedByMonth.get(key) ?? 0;
    const spent = spentByMonth.get(key) ?? 0;
    const balance = carryover + collected - spent;
    rows.push({ year: y, month: m, carryover, collected, spent, balance });
    carryover = balance;

    if (y === endYear && m === endMonth) break;
    [y, m] = nextMonth(y, m);
  }

  return rows;
}
