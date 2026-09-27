"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isIosNotStandalone } from "@/lib/pwa/isStandalone";

export function AddToHomeScreenNotice() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  // iPhoneでホーム画面から開いているかはサーバーではわからないため、
  // マウント後にクライアントだけで判定する（SSRとの不一致を避けるため一度だけ実行）。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウント時の一度きりの環境判定のため
    setShow(isIosNotStandalone());
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 rounded-lg border border-primary bg-primary-light p-4 text-sm">
      <p className="font-bold text-primary-dark">{t("join.addToHomeTitle")}</p>
      <p className="mt-1 text-foreground">{t("join.addToHomeBody")}</p>
    </div>
  );
}
