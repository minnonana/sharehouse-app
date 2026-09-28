"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/subscribeClient";
import { isIosNotStandalone } from "@/lib/pwa/isStandalone";

type Status = "checking" | "unsupported" | "ios-needs-home-screen" | "off" | "on";

export function NotificationSettings() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isIosNotStandalone()) {
        if (!cancelled) setStatus("ios-needs-home-screen");
        return;
      }
      if (!(await isPushSupported())) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      const existing = await getExistingSubscription();
      if (!cancelled) setStatus(existing ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle() {
    setBusy(true);
    setError(null);
    try {
      if (status === "on") {
        await unsubscribeFromPush();
        setStatus("off");
      } else {
        const result = await subscribeToPush();
        if (result.ok) {
          setStatus("on");
        } else {
          setError(result.reason ?? "failed");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-bold">{t("settings.notifications")}</h2>

      {status === "checking" && <p className="text-sm text-foreground/50">{t("common.loading")}</p>}

      {status === "ios-needs-home-screen" && (
        <p className="text-sm text-foreground/70">{t("settings.notificationsNeedsHomeScreen")}</p>
      )}

      {status === "unsupported" && (
        <p className="text-sm text-foreground/70">{t("settings.notificationsUnsupported")}</p>
      )}

      {(status === "on" || status === "off") && (
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {status === "on" ? t("settings.notificationsOn") : t("settings.notificationsOff")}
          </span>
          <button
            onClick={handleToggle}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${
              status === "on" ? "border border-border text-foreground" : "bg-primary text-white"
            }`}
          >
            {status === "on" ? t("settings.notificationsTurnOff") : t("settings.notificationsTurnOn")}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
