"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function AbsenceForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/absence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "failed");
        return;
      }
      setOpen(false);
      setStartDate("");
      setEndDate("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary-dark"
      >
        {t("duty.registerAbsence")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          {t("duty.startDate")}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border px-2 py-2 text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs">
          {t("duty.endDate")}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border px-2 py-2 text-sm"
          />
        </label>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {t("common.save")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
