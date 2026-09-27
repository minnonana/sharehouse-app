"use client";

import { useI18n, type Locale } from "@/lib/i18n";
import { useRouter } from "next/navigation";

export function LanguageSwitcher({ initialLocale }: { initialLocale: Locale }) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();

  async function handleChange(next: Locale) {
    setLocale(next);
    await fetch("/api/member/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayLanguage: next }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {(["ja", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            (locale ?? initialLocale) === l ? "bg-primary text-white" : "bg-surface-muted"
          }`}
        >
          {l === "ja" ? "日本語" : "English"}
        </button>
      ))}
      <span className="sr-only">{t("settings.language")}</span>
    </div>
  );
}
