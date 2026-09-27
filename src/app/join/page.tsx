"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useI18n, type Locale } from "@/lib/i18n";
import { AddToHomeScreenNotice } from "@/components/AddToHomeScreenNotice";
import { ROOM_NUMBERS } from "@/lib/duty/rotation";

export default function JoinPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          name,
          roomNumber,
          displayLanguage: locale,
        }),
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
      <div className="mb-4 flex justify-end gap-2 text-sm">
        {(["ja", "en"] as Locale[]).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`rounded-full px-3 py-1 ${
              locale === l ? "bg-primary text-white" : "bg-surface-muted text-foreground"
            }`}
          >
            {l === "ja" ? "日本語" : "English"}
          </button>
        ))}
      </div>

      <AddToHomeScreenNotice />

      <h1 className="mb-6 text-2xl font-bold text-primary-dark">{t("join.title")}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("join.inviteCode")}
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, ""))}
            className="rounded-lg border border-border px-4 py-3 text-lg tracking-widest"
            placeholder="000000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("join.name")}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-border px-4 py-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("join.roomNumber")}
          <select
            required
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="rounded-lg border border-border bg-white px-4 py-3"
          >
            <option value="" disabled>
              -
            </option>
            {ROOM_NUMBERS.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-primary px-6 py-3 text-lg font-bold text-white disabled:opacity-50"
        >
          {t("join.submit")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-foreground/70">
        <Link href="/create-house" className="underline">
          代表者として新しくハウスを作る場合はこちら
        </Link>
      </p>
    </main>
  );
}
