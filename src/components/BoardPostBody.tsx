"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Language } from "@/types/database";

export function BoardPostBody({
  translatedBody,
  originalBody,
  originalLang,
  viewerLang,
}: {
  translatedBody: string;
  originalBody: string;
  originalLang: Language;
  viewerLang: Language;
}) {
  const { t } = useI18n();
  const [showOriginal, setShowOriginal] = useState(false);

  // 投稿者と閲覧者が同じ言語なら、そもそも翻訳する意味がないので切り替えボタンは出さない
  if (originalLang === viewerLang) {
    return <p className="whitespace-pre-wrap text-sm">{originalBody}</p>;
  }

  return (
    <div>
      <p className="whitespace-pre-wrap text-sm">{showOriginal ? originalBody : translatedBody}</p>
      <button
        onClick={() => setShowOriginal((v) => !v)}
        className="mt-1 text-xs text-primary-dark underline"
      >
        {showOriginal ? t("board.showTranslated") : t("board.showOriginal")}
      </button>
    </div>
  );
}
