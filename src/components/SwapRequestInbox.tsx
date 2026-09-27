"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DUTY_LABELS, type DutyKey } from "@/lib/duty/rotation";

interface InboxItem {
  id: string;
  fromMemberName: string;
  fromDutyKey: DutyKey;
  toDutyKey: DutyKey;
}

export function SwapRequestInbox({ items }: { items: InboxItem[] }) {
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
      <h2 className="mb-2 font-bold text-primary-dark">交換のお願いが届いています</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg bg-white p-3 text-sm">
            <span>
              {item.fromMemberName}さんの「{DUTY_LABELS[item.fromDutyKey].ja}」⇄ あなたの「
              {DUTY_LABELS[item.toDutyKey].ja}」
            </span>
            <span className="flex gap-2">
              <button
                onClick={() => respond(item.id, "accept")}
                disabled={loadingId === item.id}
                className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
              >
                承諾
              </button>
              <button
                onClick={() => respond(item.id, "decline")}
                disabled={loadingId === item.id}
                className="rounded-full border border-border px-3 py-1 text-xs disabled:opacity-50"
              >
                却下
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
