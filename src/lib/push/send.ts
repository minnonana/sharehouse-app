import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Language } from "@/types/database";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionRow {
  member_id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  display_language: Language;
}

async function sendOne(
  supabase: SupabaseClient,
  sub: Pick<SubscriptionRow, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // 端末側で購読解除・アプリ削除された等: 無効化しておく
      await supabase.rpc("disable_push_subscription", { p_endpoint: sub.endpoint });
    } else {
      console.error("[push] send failed:", error);
    }
  }
}

/** 表示言語ごとに文面を出し分けて送る。buildPayload(lang) が各言語版のPayloadを返す */
async function sendLocalized(
  supabase: SupabaseClient,
  subscriptions: SubscriptionRow[],
  buildPayload: (lang: Language) => PushPayload,
) {
  if (subscriptions.length === 0) return;
  ensureConfigured();

  await Promise.all(
    subscriptions.map((sub) => sendOne(supabase, sub, buildPayload(sub.display_language))),
  );
}

/** ハウス内の全員（オプションで特定メンバーを除く）に、各自の表示言語で通知を送る */
export async function sendPushToHouse(
  supabase: SupabaseClient,
  houseId: string,
  buildPayload: PushPayload | ((lang: Language) => PushPayload),
  excludeMemberId?: string,
) {
  const { data, error } = await supabase.rpc("get_push_subscriptions_for_house", {
    p_house_id: houseId,
    p_exclude_member_id: excludeMemberId ?? null,
  });
  if (error) {
    console.error("[push] failed to load subscriptions for house:", error.message);
    return;
  }
  const build = typeof buildPayload === "function" ? buildPayload : () => buildPayload;
  await sendLocalized(supabase, (data ?? []) as SubscriptionRow[], build);
}

/** 特定の1人にだけ、その人の表示言語で通知を送る */
export async function sendPushToMember(
  supabase: SupabaseClient,
  memberId: string,
  buildPayload: PushPayload | ((lang: Language) => PushPayload),
) {
  const { data, error } = await supabase.rpc("get_push_subscriptions_for_member", {
    p_member_id: memberId,
  });
  if (error) {
    console.error("[push] failed to load subscriptions for member:", error.message);
    return;
  }
  const build = typeof buildPayload === "function" ? buildPayload : () => buildPayload;
  await sendLocalized(supabase, (data ?? []) as SubscriptionRow[], build);
}
