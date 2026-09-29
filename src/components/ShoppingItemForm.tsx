"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const TEMPLATE_KEYS = [
  "shopping.templates.toiletPaper",
  "shopping.templates.trashBags",
  "shopping.templates.detergent",
  "shopping.templates.sponge",
] as const;

export function ShoppingItemForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(itemName: string) {
    if (!itemName.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName }),
      });
      setName("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("shopping.addPlaceholder")}
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button
          onClick={() => submit(name)}
          disabled={submitting || !name.trim()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {t("shopping.add")}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => submit(t(key))}
            disabled={submitting}
            className="rounded-full border border-primary px-3 py-1 text-xs text-primary-dark"
          >
            {t(key)}
          </button>
        ))}
      </div>
    </section>
  );
}
