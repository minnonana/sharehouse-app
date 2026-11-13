"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { DORM_TEMPLATES } from "@/lib/duty/templates";
import type { DormType } from "@/lib/duty/engine";

const DORMS: DormType[] = ["sakigake", "hokumei"];

/** ユニットの番号（110 のように0で終わる）から、部屋番号（111, 112, …）を作る */
function roomsFromUnit(unit: string, count: number): string[] | null {
  if (!/^[0-9]*[1-9][0-9]*0$/.test(unit)) return null;
  const base = Number(unit);
  return Array.from({ length: count }, (_, i) => String(base + i + 1));
}

export default function CreateHousePage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [dormType, setDormType] = useState<DormType>("sakigake");
  const [roomInputs, setRoomInputs] = useState<string[]>(Array(DORM_TEMPLATES.sakigake.maxRooms).fill(""));
  const [unitNumber, setUnitNumber] = useState("");
  const [houseName, setHouseName] = useState("");
  // ハウス名を自分で書き換えるまでは、ユニットの番号をそのままハウス名にする
  const [houseNameEdited, setHouseNameEdited] = useState(false);
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const enteredRooms = roomInputs.map((r) => r.trim()).filter((r) => r !== "");
  const hasDuplicate = new Set(enteredRooms).size !== enteredRooms.length;

  function chooseDorm(next: DormType) {
    setDormType(next);
    const max = DORM_TEMPLATES[next].maxRooms;
    setRoomInputs((prev) => roomsFromUnit(unitNumber, max) ?? Array.from({ length: max }, (_, i) => prev[i] ?? ""));
  }

  function changeUnitNumber(value: string) {
    const unit = value.replace(/\D/g, "");
    setUnitNumber(unit);
    if (!houseNameEdited) setHouseName(unit);
    const rooms = roomsFromUnit(unit, DORM_TEMPLATES[dormType].maxRooms);
    if (rooms) {
      setRoomInputs(rooms);
      if (!rooms.includes(roomNumber)) setRoomNumber("");
    }
  }

  function setRoomInput(index: number, value: string) {
    setRoomInputs((prev) => prev.map((r, i) => (i === index ? value : r)));
  }

  function showError(code: string) {
    const key = `errors.${code}`;
    setError(t(key) !== key ? t(key) : code);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (hasDuplicate || enteredRooms.length === 0) {
      showError("invalid_room_numbers");
      return;
    }
    if (!enteredRooms.includes(roomNumber)) {
      showError("invalid_room_number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          houseName,
          name,
          roomNumber,
          displayLanguage: locale,
          dormType,
          roomNumbers: enteredRooms,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? "failed");
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
        <fieldset className="flex flex-col gap-2 text-sm font-medium">
          <legend className="mb-1">{t("createHouse.dorm")}</legend>
          <div className="flex gap-2">
            {DORMS.map((dorm) => {
              const tpl = DORM_TEMPLATES[dorm];
              const active = dorm === dormType;
              return (
                <button
                  key={dorm}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseDorm(dorm)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left ${
                    active ? "border-primary bg-primary-light text-primary-dark" : "border-border bg-white"
                  }`}
                >
                  <span className="block text-base font-bold">{locale === "ja" ? tpl.nameJa : tpl.nameEn}</span>
                  <span className="block text-xs font-normal text-foreground/70">
                    {t("createHouse.dormMax", { max: tpl.maxRooms })}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("createHouse.unitNumber")}
          <input
            inputMode="numeric"
            maxLength={9}
            value={unitNumber}
            onChange={(e) => changeUnitNumber(e.target.value)}
            className="rounded-lg border border-border px-4 py-3"
            placeholder="110"
          />
          <span className="text-xs font-normal text-foreground/70">{t("createHouse.unitNumberHint")}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("createHouse.houseName")}
          <input
            required
            value={houseName}
            onChange={(e) => {
              setHouseName(e.target.value);
              setHouseNameEdited(true);
            }}
            className="rounded-lg border border-border px-4 py-3"
            placeholder={t("createHouse.houseNamePlaceholder")}
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm font-medium">
          <legend className="mb-1">{t("createHouse.roomNumbers")}</legend>
          <p className="text-xs font-normal text-foreground/70">{t("createHouse.roomNumbersHint")}</p>
          <div className="grid grid-cols-4 gap-2">
            {roomInputs.map((value, index) => (
              <input
                key={index}
                value={value}
                maxLength={10}
                inputMode="numeric"
                aria-label={t("createHouse.roomNumberN", { n: index + 1 })}
                placeholder={String(index + 1)}
                onChange={(e) => setRoomInput(index, e.target.value)}
                className="min-w-0 rounded-lg border border-border px-2 py-3 text-center"
              />
            ))}
          </div>
          {hasDuplicate && <p className="text-xs font-normal text-danger">{t("errors.invalid_room_numbers")}</p>}
        </fieldset>

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
            value={enteredRooms.includes(roomNumber) ? roomNumber : ""}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="rounded-lg border border-border bg-white px-4 py-3"
          >
            <option value="" disabled>
              -
            </option>
            {Array.from(new Set(enteredRooms)).map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-danger">{error}</p>}

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
