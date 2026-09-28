"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ROOM_NUMBERS } from "@/lib/duty/rotation";

export default function CreateHousePage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [houseName, setHouseName] = useState("");
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ houseName, name, roomNumber, displayLanguage: locale }),
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
      <h1 className="mb-2 text-2xl font-bold text-primary-dark">{t("createHouse.title")}</h1>
      <p className="mb-6 text-sm text-foreground/70">{t("createHouse.subtitle")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("createHouse.houseName")}
          <input
            required
            value={houseName}
            onChange={(e) => setHouseName(e.target.value)}
            className="rounded-lg border border-border px-4 py-3"
            placeholder={t("createHouse.houseNamePlaceholder")}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("createHouse.yourName")}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-border px-4 py-3"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("createHouse.yourRoomNumber")}
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
          {t("createHouse.submit")}
        </button>
      </form>
    </main>
  );
}
