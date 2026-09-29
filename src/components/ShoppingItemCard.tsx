"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { ShoppingItem } from "@/types/database";

const STATUS_KEY = {
  pending: "shopping.statusPending",
  in_progress: "shopping.statusInProgress",
  done: "shopping.statusDone",
  settled: "shopping.statusSettled",
} as const;

export function ShoppingItemCard({
  item,
  assigneeName,
  createdByName,
  canSettle,
}: {
  item: ShoppingItem;
  assigneeName: string | null;
  createdByName: string;
  canSettle: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [showAmountInput, setShowAmountInput] = useState(false);

  async function claim() {
    setLoading(true);
    try {
      await fetch(`/api/shopping/${item.id}/claim`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    const amountYen = Number(amount);
    if (!Number.isFinite(amountYen) || amountYen <= 0) return;
    setLoading(true);
    try {
      await fetch(`/api/shopping/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountYen }),
      });
      setShowAmountInput(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function settle() {
    setLoading(true);
    try {
      await fetch(`/api/shopping/${item.id}/settle`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold">{item.name}</span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground/70">
          {t(STATUS_KEY[item.status])}
        </span>
      </div>

      <p className="text-xs text-foreground/50">
        {t("shopping.addedBy", { name: createdByName })}
        {assigneeName && ` / ${t("shopping.assignedTo", { name: assigneeName })}`}
        {item.amount_yen != null && ` / ¥${item.amount_yen.toLocaleString()}`}
      </p>

      {item.status === "pending" && (
        <button
          onClick={claim}
          disabled={loading}
          className="self-start rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {t("shopping.iCanGo")}
        </button>
      )}

      {item.status === "in_progress" &&
        (showAmountInput ? (
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="円"
              className="w-24 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              onClick={complete}
              disabled={loading || !amount}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {t("shopping.markComplete")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAmountInput(true)}
            className="self-start rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary-dark"
          >
            {t("shopping.markComplete")}
          </button>
        ))}

      {item.status === "done" && canSettle && (
        <button
          onClick={settle}
          disabled={loading}
          className="self-start rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary-dark disabled:opacity-50"
        >
          {t("shopping.markSettled")}
        </button>
      )}
    </li>
  );
}
