"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface InboxItem {
  id: string;
  fromMemberName: string;
  fromDutyLabel: string;
  toDutyLabel: string;
}

export function SwapRequestInbox({ items }: { items: InboxItem[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function respond(id: string, action: "accept" | "decline") {
    setLoadingId(id);
    try {
      await fetch(`/api/duty/swap/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-primary bg-primary-light p-4 shadow-sm">
      <h2 className="mb-2 font-bold text-primary-dark">{t("duty.swapInboxTitle")}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg bg-white p-3 text-sm">
            <span>
              {t("duty.swapItemLabel", {
                fromName: item.fromMemberName,
                fromDuty: item.fromDutyLabel,
                toDuty: item.toDutyLabel,
              })}
            </span>
            <span className="flex gap-2">
              <button
                onClick={() => respond(item.id, "accept")}
                disabled={loadingId === item.id}
                className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
              >
                {t("duty.swapAccept")}
              </button>
              <button
                onClick={() => respond(item.id, "decline")}
                disabled={loadingId === item.id}
                className="rounded-full border border-border px-3 py-1 text-xs disabled:opacity-50"
              >
                {t("duty.swapDecline")}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
