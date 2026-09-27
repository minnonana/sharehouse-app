"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function CompleteDutyButton({
  weekStartDate,
  dutyTypeKey,
  alreadyDone,
}: {
  weekStartDate: string;
  dutyTypeKey: string;
  alreadyDone: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (alreadyDone) {
    return (
      <span className="inline-block rounded-full bg-green-50 px-4 py-2 font-bold text-success">
        ✓ {t("duty.done")}
      </span>
    );
  }

  async function handleClick() {
    setLoading(true);
    try {
      await fetch("/api/duty/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate, dutyTypeKey }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full bg-primary px-6 py-3 font-bold text-white disabled:opacity-50"
    >
      {t("home.markDone")}
    </button>
  );
}
