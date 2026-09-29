"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function LeaveButton({ memberId, isSelf }: { memberId: string; isSelf: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/${memberId}/leave`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 失敗時も確認ボタンは閉じるが、エラーメッセージは折りたたみ後の表示に残す
        setError(t(`errors.${data.error}`) !== `errors.${data.error}` ? t(`errors.${data.error}`) : data.error);
        setLoading(false);
        setConfirming(false);
        return;
      }
      if (isSelf) {
        router.push("/join");
      }
      router.refresh();
      setLoading(false);
      setConfirming(false);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <span className="flex flex-col items-end gap-1">
        <button
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className="text-xs text-danger underline"
        >
          {t("settings.leave")}
        </button>
        {error && <span className="max-w-[10rem] text-right text-xs text-danger">{error}</span>}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex gap-2">
        <button
          onClick={leave}
          disabled={loading}
          className="rounded-full bg-danger px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          {t("common.confirm")}
        </button>
        <button onClick={() => setConfirming(false)} className="rounded-full border border-border px-3 py-1 text-xs">
          {t("common.cancel")}
        </button>
      </span>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
