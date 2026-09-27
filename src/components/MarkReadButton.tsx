"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function MarkReadButton({ postId, alreadyRead }: { postId: string; alreadyRead: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (alreadyRead) {
    return <span className="text-xs text-success">✓ {t("board.markRead")}</span>;
  }

  async function handleClick() {
    setLoading(true);
    try {
      await fetch(`/api/board/${postId}/read`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border border-primary px-3 py-1 text-xs text-primary-dark disabled:opacity-50"
    >
      {t("board.markRead")}
    </button>
  );
}
