"use client";

import { useEffect, useRef } from "react";
import { useI18n, type Locale } from "@/lib/i18n";

/**
 * ページ読み込み直後に、DBに保存されている本人の表示言語(member.display_language)を
 * クライアント側の言語状態に反映する。設定画面で切り替えた言語がページ再読み込み後も
 * 維持されるようにするため。
 */
export function LocaleSync({ locale }: { locale: Locale }) {
  const { locale: current, setLocale } = useI18n();
  const didSync = useRef(false);

  useEffect(() => {
    if (didSync.current) return;
    didSync.current = true;
    if (locale !== current) {
      setLocale(locale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- マウント時に一度だけ同期する
  }, []);

  return null;
}
