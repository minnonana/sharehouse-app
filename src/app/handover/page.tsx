"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function HandoverPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/handover/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "failed");
        return;
      }
      router.push("/home");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-primary-dark">{t("handover.title")}</h1>
      <p className="mb-6 text-sm text-foreground/70">{t("handover.subtitle")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("handover.codeLabel")}
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="rounded-lg border border-border px-4 py-3 text-lg tracking-widest"
            placeholder="000000"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-danger">{t(`errors.${error}`)}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-primary px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
        >
          {t("handover.submit")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-foreground/70">
        <Link href="/join" className="underline">
          {t("handover.backToJoin")}
        </Link>
      </p>
    </main>
  );
}
