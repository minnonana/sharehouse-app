"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LeaveButton } from "@/components/LeaveButton";

// 設定画面のメンバー1行。名前の変更、代表者による復旧コードの発行、退去をまとめる。
export function MemberManageRow({
  memberId,
  name,
  roomNumber,
  isOwner,
  isSelf,
  viewerIsOwner,
}: {
  memberId: string;
  name: string;
  roomNumber: string;
  isOwner: boolean;
  isSelf: boolean;
  viewerIsOwner: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = isSelf || viewerIsOwner;
  const dateLocale = locale === "ja" ? "ja-JP" : "en-US";

  function showError(codeOrMessage: string) {
    const key = `errors.${codeOrMessage}`;
    setError(t(key) !== key ? t(key) : codeOrMessage);
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/${memberId}/name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? "failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function makeOwner() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/${memberId}/owner`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? "failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function issueRecoveryCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/member/${memberId}/handover`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error ?? "failed");
        return;
      }
      setCode(data.handoverCode.code);
      setExpiresAt(data.handoverCode.expires_at);
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span>
          {roomNumber} {name}
        </span>
        <span className="flex items-center gap-2">
          {isOwner && (
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary-dark">
              {t("settings.ownerBadge")}
            </span>
          )}
          {canManage && (
            <button onClick={() => setOpen((v) => !v)} className="text-xs text-primary-dark underline">
              {open ? t("settings.manageClose") : t("settings.manage")}
            </button>
          )}
        </span>
      </div>

      {open && canManage && (
        <div className="flex flex-col gap-3 rounded-lg bg-surface-muted p-3">
          <form onSubmit={rename} className="flex items-center gap-2">
            <input
              required
              maxLength={40}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label={t("settings.renameLabel")}
              className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading || newName.trim() === name}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {t("settings.rename")}
            </button>
          </form>

          {viewerIsOwner && !isSelf && (
            <div>
              <p className="mb-2 text-xs text-foreground/60">{t("settings.recoveryHint")}</p>
              {code && (
                <div className="mb-2">
                  <p className="text-2xl font-bold tracking-widest text-primary-dark">{code}</p>
                  {expiresAt && (
                    <p className="text-xs text-foreground/60">
                      {t("settings.inviteExpiry", {
                        date: new Date(expiresAt).toLocaleString(dateLocale, { timeZone: "Asia/Tokyo" }),
                      })}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={issueRecoveryCode}
                disabled={loading}
                className="rounded-full border border-primary px-4 py-2 text-xs font-bold text-primary-dark disabled:opacity-50"
              >
                {code ? t("settings.reissue") : t("settings.recoveryIssue")}
              </button>
            </div>
          )}

          {viewerIsOwner && !isOwner && (
            <div>
              <p className="mb-2 text-xs text-foreground/60">{t("settings.makeOwnerHint")}</p>
              <button
                onClick={makeOwner}
                disabled={loading}
                className="rounded-full border border-primary px-4 py-2 text-xs font-bold text-primary-dark disabled:opacity-50"
              >
                {t("settings.makeOwner")}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end">
            <LeaveButton memberId={memberId} isSelf={isSelf} />
          </div>
        </div>
      )}
    </li>
  );
}
