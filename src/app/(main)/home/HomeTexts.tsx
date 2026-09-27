"use client";

import { useI18n } from "@/lib/i18n";

export function HomeTexts({ labelKey }: { labelKey: string }) {
  const { t } = useI18n();
  return <h2 className="text-sm font-bold text-foreground/70">{t(labelKey)}</h2>;
}
