"use client";

import { useI18n } from "@/lib/i18n";
import type { ElementType } from "react";

/**
 * サーバーコンポーネントの中で翻訳済みテキストを1つ差し込むための汎用コンポーネント。
 * 例: <T k="board.title" as="h1" className="text-xl font-bold" />
 */
export function T({
  k,
  params,
  as: Tag = "span",
  className,
}: {
  k: string;
  params?: Record<string, string | number>;
  as?: ElementType;
  className?: string;
}) {
  const { t } = useI18n();
  return <Tag className={className}>{t(k, params)}</Tag>;
}
