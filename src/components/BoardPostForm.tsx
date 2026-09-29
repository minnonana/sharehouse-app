"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { BoardPostCategory } from "@/types/database";

const TEMPLATE_KEYS = [
  { key: "board.templates.toiletPaperEmpty", category: "other" as BoardPostCategory },
  { key: "board.templates.guestComing", category: "guest" as BoardPostCategory },
  { key: "board.templates.repairVisit", category: "repair" as BoardPostCategory },
] as const;

const CATEGORIES: { value: BoardPostCategory; icon: string; labelKey: string }[] = [
  { value: "rule", icon: "📌", labelKey: "board.categoryRule" },
  { value: "guest", icon: "🙋", labelKey: "board.categoryGuest" },
  { value: "repair", icon: "🔧", labelKey: "board.categoryRepair" },
  { value: "other", icon: "💬", labelKey: "board.categoryOther" },
];

export function BoardPostForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [important, setImportant] = useState(false);
  const [category, setCategory] = useState<BoardPostCategory>("other");
  const [submitting, setSubmitting] = useState(false);

  async function submit(text: string, isImportant: boolean, cat: BoardPostCategory) {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, isImportant, category: cat }),
      });
      setBody("");
      setImportant(false);
      setCategory("other");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-foreground/60">{t("board.categoryLabel")}</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              category === c.value ? "bg-primary text-white" : "bg-surface-muted text-foreground/70"
            }`}
          >
            {c.icon} {t(c.labelKey)}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("board.postPlaceholder")}
        className="min-h-20 rounded-lg border border-border p-3 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        {TEMPLATE_KEYS.map(({ key, category: tplCategory }) => (
          <button
            key={key}
            type="button"
            onClick={() => submit(t(key), false, tplCategory)}
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
        onClick={() => submit(body, important, category)}
        disabled={submitting || !body.trim()}
        className="rounded-full bg-primary px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        {t("board.newPost")}
      </button>
    </section>
  );
}
