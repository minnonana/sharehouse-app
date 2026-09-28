"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { DUTY_LABELS, type DutyKey, type RoomNumber } from "@/lib/duty/rotation";

export function SwapRequestForm({
  weekStartDate,
  myDutyTypeKey,
  candidates,
}: {
  weekStartDate: string;
  myDutyTypeKey: DutyKey;
  candidates: Array<{ room: RoomNumber; memberId: string; memberName: string; dutyKey: DutyKey }>;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetIndex, setTargetIndex] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary-dark"
      >
        {t("duty.requestSwap")}
      </button>
    );
  }

  async function submit() {
    if (targetIndex === "") return;
    const target = candidates[Number(targetIndex)];
    setSubmitting(true);
    try {
      await fetch("/api/duty/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate,
          myDutyTypeKey,
          targetMemberId: target.memberId,
          targetDutyTypeKey: target.dutyKey,
        }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3 text-sm">
      <select
        value={targetIndex}
        onChange={(e) => setTargetIndex(e.target.value)}
        className="rounded-lg border border-border bg-white px-3 py-2"
      >
        <option value="" disabled>
          {t("duty.selectSwapTarget")}
        </option>
        {candidates.map((c, i) => (
          <option key={c.memberId} value={i}>
            {c.room} {c.memberName}（{DUTY_LABELS[c.dutyKey][locale]}）
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting || targetIndex === ""}
          className="flex-1 rounded-full bg-primary px-4 py-2 text-white disabled:opacity-50"
        >
          {t("duty.submitSwapRequest")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded-full border border-border px-4 py-2"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
