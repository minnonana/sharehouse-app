"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubstituteButton({
  weekStartDate,
  originalMemberId,
  dutyTypeKey,
}: {
  weekStartDate: string;
  originalMemberId: string;
  dutyTypeKey: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch("/api/duty/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate, originalMemberId, dutyTypeKey }),
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
      className="rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary-dark disabled:opacity-50"
    >
      代行する
    </button>
  );
}
