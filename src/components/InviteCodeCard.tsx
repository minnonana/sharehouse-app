"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function InviteCodeCard() {
  const { t, locale } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "failed");
        return;
      }
      setCode(data.inviteCode.code);
      setExpiresAt(data.inviteCode.expires_at);
    } finally {
      setLoading(false);
    }
  }

  const dateLocale = locale === "ja" ? "ja-JP" : "en-US";

  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-bold">{t("settings.invite")}</h2>
      {code ? (
        <div>
          <p className="text-3xl font-bold tracking-widest text-primary-dark">{code}</p>
          {expiresAt && (
            <p className="mt-1 text-xs text-foreground/60">
              {t("settings.inviteExpiry", {
                date: new Date(expiresAt).toLocaleString(dateLocale, { timeZone: "Asia/Tokyo" }),
              })}
            </p>
          )}
        </div>
      ) : (
        <p className="mb-2 text-sm text-foreground/60">{t("settings.inviteHint")}</p>
      )}
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <button
        onClick={issue}
        disabled={loading}
        className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {code ? t("settings.reissue") : t("settings.issue")}
      </button>
    </section>
  );
}
