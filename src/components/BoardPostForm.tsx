"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

const TEMPLATE_KEYS = [
  "board.templates.toiletPaperEmpty",
  "board.templates.guestComing",
  "board.templates.repairVisit",
] as const;

export function BoardPostForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [important, setImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(text: string, isImportant: boolean) {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, isImportant }),
      });
      setBody("");
      setImportant(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("board.postPlaceholder")}
        className="min-h-20 rounded-lg border border-border p-3 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {TEMPLATE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => submit(t(key), false)}
            disabled={submitting}
            className="rounded-full border border-primary px-3 py-1 text-xs text-primary-dark"
          >
            {t(key)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={important}
          onChange={(e) => setImportant(e.target.checked)}
        />
        {t("board.important")}
      </label>

      <button
        type="button"
        onClick={() => submit(body, important)}
        disabled={submitting || !body.trim()}
        className="rounded-full bg-primary px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        {t("board.newPost")}
      </button>
    </section>
  );
}
