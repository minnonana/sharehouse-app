"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ShoppingItem } from "@/types/database";

interface Row {
  item: ShoppingItem;
  assigneeName: string | null;
  createdByName: string;
}

export function ShoppingChecklist({ rows, canSettle }: { rows: Row[]; canSettle: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [openAmountFor, setOpenAmountFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-foreground/50">{t("shopping.noItems")}</p>;
  }

  // 「行けるよ」: 自分が担当になることを明示するボタン（最初に押した1人が担当）
  async function claim(itemId: string) {
    setLoadingId(itemId);
    try {
      const res = await fetch(`/api/shopping/${itemId}/claim`, { method: "POST" });
      if (res.ok) {
        setOpenAmountFor(itemId);
      }
      // 成功・失敗どちらでも最新の状態（自分が担当になった/すでに他の人が担当済み）を反映する
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  // 担当中の品目のチェック: 買い終わったことの報告（金額入力）
  function handleCheck(item: ShoppingItem) {
    if (item.status !== "in_progress") return;
    setOpenAmountFor(item.id);
  }

  async function submitAmount(itemId: string) {
    const amountYen = Number(amount);
    if (!Number.isFinite(amountYen) || amountYen <= 0) return;
    setLoadingId(itemId);
    try {
      await fetch(`/api/shopping/${itemId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountYen }),
      });
      setOpenAmountFor(null);
      setAmount("");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function settle(itemId: string) {
    setLoadingId(itemId);
    try {
      await fetch(`/api/shopping/${itemId}/settle`, { method: "POST" });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-white shadow-sm">
      {rows.map(({ item, assigneeName, createdByName }) => {
        const isDone = item.status === "done" || item.status === "settled";
        const isPending = item.status === "pending";
        const isMineToBuy = item.status === "in_progress";
        const displayName = (locale === "ja" ? item.name_ja : item.name_en) || item.name;

        return (
          <li key={item.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              {isPending ? (
                <button
                  onClick={() => claim(item.id)}
                  disabled={loadingId === item.id}
                  className="mt-0.5 shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                >
                  {t("shopping.iCanGo")}
                </button>
              ) : (
                <input
                  type="checkbox"
                  checked={isDone}
                  disabled={loadingId === item.id || isDone}
                  onChange={() => handleCheck(item)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--color-primary)]"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className={`font-bold ${isDone ? "text-foreground/40 line-through" : ""}`}>{displayName}</p>
                <p className="text-xs text-foreground/50">
                  {t("shopping.addedBy", { name: createdByName })}
                  {assigneeName && !isDone && ` / ${t("shopping.assignedTo", { name: assigneeName })}`}
                  {isDone && item.amount_yen != null && assigneeName && (
                    <> / {t("shopping.assignedTo", { name: assigneeName })} / ¥{item.amount_yen.toLocaleString()}</>
                  )}
                </p>

                {openAmountFor === item.id && isMineToBuy && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="円"
                      className="w-24 rounded-lg border border-border px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => submitAmount(item.id)}
                      disabled={loadingId === item.id || !amount}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {t("shopping.markComplete")}
                    </button>
                  </div>
                )}

                {item.status === "done" && canSettle && (
                  <button
                    onClick={() => settle(item.id)}
                    disabled={loadingId === item.id}
                    className="mt-2 rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary-dark disabled:opacity-50"
                  >
                    {t("shopping.markSettled")}
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
