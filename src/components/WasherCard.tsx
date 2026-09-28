"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatJstTime } from "@/lib/date/jst";
import type { WasherStatusRow } from "@/types/database";

export function WasherCard({
  washer,
  usedByName,
}: {
  washer: WasherStatusRow | null;
  usedByName: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [expectedEndAt, setExpectedEndAt] = useState("");
  const [loading, setLoading] = useState(false);

  const inUse = washer?.status === "in_use";

  const DEFAULT_DURATION_MINUTES = 45;

  async function callWasherApi(action: "start" | "finish") {
    setLoading(true);
    try {
      await fetch("/api/washer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          // 未入力の場合は「使用開始から45分後」を自動で終了予定時刻にする
          expectedEndAt:
            action === "start"
              ? expectedEndAt
                ? toIso(expectedEndAt)
                : defaultExpectedEndIso()
              : null,
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function toIso(hhmm: string): string {
    const now = new Date();
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function defaultExpectedEndIso(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + DEFAULT_DURATION_MINUTES);
    return d.toISOString();
  }

  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-foreground/70">{t("home.washer")}</h2>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-block h-3 w-3 rounded-full ${inUse ? "bg-warning" : "bg-success"}`}
          aria-hidden
        />
        <span className="text-lg font-bold">
          {inUse ? t("home.washerInUse") : t("home.washerIdle")}
        </span>
        {inUse && usedByName && (
          <span className="text-sm text-foreground/60">（{usedByName}）</span>
        )}
      </div>

      {inUse && washer?.expected_end_at && (
        <p className="mb-3 text-sm text-foreground/70">
          {t("home.expectedEndTimeLabel", { time: formatJstTime(washer.expected_end_at) })}
        </p>
      )}

      {inUse ? (
        <button
          onClick={() => callWasherApi("finish")}
          disabled={loading}
          className="w-full rounded-full bg-primary px-4 py-3 font-bold text-white disabled:opacity-50"
        >
          {t("home.finishWasher")}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t("home.expectedEndTime")}
            <input
              type="time"
              value={expectedEndAt}
              onChange={(e) => setExpectedEndAt(e.target.value)}
              className="rounded-lg border border-border px-3 py-2"
            />
            <span className="text-xs text-foreground/50">
              {t("home.expectedEndTimeHint", { minutes: DEFAULT_DURATION_MINUTES })}
            </span>
          </label>
          <button
            onClick={() => callWasherApi("start")}
            disabled={loading}
            className="w-full rounded-full bg-primary px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {t("home.startWasher")}
          </button>
        </div>
      )}
    </section>
  );
}
