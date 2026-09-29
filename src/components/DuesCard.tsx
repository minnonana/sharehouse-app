"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { MonthlyBalanceRow } from "@/lib/shopping/balance";

export function DuesCard({
  year,
  month,
  amountYen,
  myPaid,
  paidCount,
  totalMembers,
  monthlyRows,
}: {
  year: number;
  month: number;
  amountYen: number;
  myPaid: boolean;
  paidCount: number;
  totalMembers: number;
  monthlyRows: MonthlyBalanceRow[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function togglePaid() {
    setLoading(true);
    try {
      await fetch("/api/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, paid: !myPaid }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const currentBalance = monthlyRows.at(-1)?.balance ?? 0;

  return (
    <section className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
      <h2 className="font-bold">{t("shopping.duesTitle", { year, month })}</h2>

      <div className="flex items-center justify-between">
        <span className="text-sm">
          {t("shopping.duesAmount", { amount: amountYen })} / {t("shopping.duesPaidCount", { paid: paidCount, total: totalMembers })}
        </span>
        <button
          onClick={togglePaid}
          disabled={loading}
          className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${
            myPaid ? "border border-border text-foreground" : "bg-primary text-white"
          }`}
        >
          {myPaid ? t("shopping.duesUndoPaid") : t("shopping.duesMarkPaid")}
        </button>
      </div>

      <p className="text-sm font-bold text-primary-dark">
        {t("shopping.currentBalance", { balance: currentBalance.toLocaleString() })}
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer text-foreground/60">{t("shopping.showHistory")}</summary>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-foreground/50">
              <th className="py-1">{t("shopping.colMonth")}</th>
              <th className="py-1 text-right">{t("shopping.colCarryover")}</th>
              <th className="py-1 text-right">{t("shopping.colCollected")}</th>
              <th className="py-1 text-right">{t("shopping.colSpent")}</th>
              <th className="py-1 text-right">{t("shopping.colBalance")}</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row) => (
              <tr key={`${row.year}-${row.month}`} className="border-t border-border">
                <td className="py-1">
                  {row.year}/{row.month}
                </td>
                <td className="py-1 text-right">¥{row.carryover.toLocaleString()}</td>
                <td className="py-1 text-right">¥{row.collected.toLocaleString()}</td>
                <td className="py-1 text-right">¥{row.spent.toLocaleString()}</td>
                <td className="py-1 text-right font-bold">¥{row.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
