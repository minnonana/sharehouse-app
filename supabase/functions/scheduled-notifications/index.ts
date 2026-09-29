// 第2段階: 定時のプッシュ通知（Web Push）
//
// Supabase Edge Function として5分おきに実行する想定（pg_cron から呼び出す）。
// docs の「通知の仕組み」表にある1つ目の表（第2段階分）を実装する。
//
// デプロイ方法は README / docs/PUSH_NOTIFICATIONS.md を参照。
//
// 必要な環境変数（Supabase Edge Functionsのsecretsとして設定する）:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const ROOM_NUMBERS = ["111", "112", "113", "114", "115", "116", "117", "118"] as const;
type RoomNumber = (typeof ROOM_NUMBERS)[number];
type DutyKey =
  | "kitchen_1f"
  | "toilet_1f"
  | "toilet_2f"
  | "entrance"
  | "mon_trash"
  | "thu_trash"
  | "wed_fri"
  | "rest";

const DUTY_ORDER: DutyKey[] = [
  "kitchen_1f",
  "toilet_1f",
  "toilet_2f",
  "entrance",
  "mon_trash",
  "thu_trash",
  "wed_fri",
  "rest",
];

const DUTY_LABELS: Record<DutyKey, { ja: string; en: string }> = {
  kitchen_1f: { ja: "1Fキッチン", en: "1F Kitchen" },
  toilet_1f: { ja: "1Fトイレ", en: "1F Toilet" },
  toilet_2f: { ja: "2Fトイレ", en: "2F Toilet" },
  entrance: { ja: "玄関", en: "Entrance" },
  mon_trash: { ja: "月曜の燃やすごみ", en: "Monday burnable trash" },
  thu_trash: { ja: "木曜の燃やすごみ", en: "Thursday burnable trash" },
  wed_fri: { ja: "水金の収集", en: "Wed/Fri collection" },
  rest: { ja: "休み", en: "Rest" },
};

const BASE_WEEK_START = "2026-09-27";

function toJstDate(date: Date): Date {
  // JSTのその日の日付・時刻を扱うため、UTC+9でシフトしたDateを作る
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStartDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - dow);
  return formatDateUTC(date);
}

function getWeekIndex(weekStartDateStr: string): number {
  const [by, bm, bd] = BASE_WEEK_START.split("-").map(Number);
  const base = new Date(Date.UTC(by, bm - 1, bd, 12));
  const [y, m, d] = weekStartDateStr.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d, 12));
  return Math.round((target.getTime() - base.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function getDutyAssignmentsForWeek(weekStartDateStr: string): Record<RoomNumber, DutyKey> {
  const weekIndex = getWeekIndex(weekStartDateStr);
  const result = {} as Record<RoomNumber, DutyKey>;
  ROOM_NUMBERS.forEach((room, roomIndex) => {
    const dutyIndex = (((roomIndex - weekIndex) % 8) + 8) % 8;
    result[room] = DUTY_ORDER[dutyIndex];
  });
  return result;
}

function nthWeekdayOfMonth(year: number, month0: number, weekday: number, n: number): Date | null {
  const first = new Date(Date.UTC(year, month0, 1, 12));
  const firstWeekday = first.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  const result = new Date(Date.UTC(year, month0, day, 12));
  if (result.getUTCMonth() !== month0) return null;
  return result;
}

/** 指定日が「水金」担当の収集日かどうか（あきびん・資源・燃やさない・プラのみ） */
function isWedFriCollectionDay(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = date.getUTCDay();
  if (dow === 3) {
    const firstWed = nthWeekdayOfMonth(y, m - 1, 3, 1);
    return !!firstWed && formatDateUTC(firstWed) === dateStr;
  }
  if (dow === 5) {
    const second = nthWeekdayOfMonth(y, m - 1, 5, 2);
    const third = nthWeekdayOfMonth(y, m - 1, 5, 3);
    const fourth = nthWeekdayOfMonth(y, m - 1, 5, 4);
    const fifth = nthWeekdayOfMonth(y, m - 1, 5, 5);
    return [second, third, fourth, fifth].some((x) => x && formatDateUTC(x) === dateStr);
  }
  return false;
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateUTC(date);
}

function getRoomForDuty(weekStartDateStr: string, duty: DutyKey): RoomNumber | undefined {
  const map = getDutyAssignmentsForWeek(weekStartDateStr);
  return (Object.entries(map) as [RoomNumber, DutyKey][]).find(([, d]) => d === duty)?.[0];
}

// =========================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// deno-lint-ignore no-explicit-any
async function sendToMember(supabase: any, houseId: string, memberId: string, key: string, payload: Record<"ja" | "en", PushPayload>) {
  // 二重送信防止
  const { error: logError } = await supabase
    .from("notification_log")
    .insert({ house_id: houseId, key });
  if (logError) {
    // unique制約違反 = 送信済み
    return;
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, members!inner(display_language)")
    .eq("member_id", memberId)
    .eq("enabled", true);

  for (const sub of subs ?? []) {
    const lang = (sub.members?.display_language ?? "ja") as "ja" | "en";
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload[lang] ?? payload.ja),
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").update({ enabled: false }).eq("endpoint", sub.endpoint);
      } else {
        console.error("push failed", err);
      }
    }
  }
}

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const nowJst = toJstDate(now);
  const todayJst = formatDateUTC(nowJst);
  const hour = nowJst.getUTCHours();
  const minute = nowJst.getUTCMinutes();
  const dow = nowJst.getUTCDay(); // 0=日
  const weekStart = getWeekStartDate(todayJst);

  const { data: houses } = await supabase.from("houses").select("id");

  for (const house of houses ?? []) {
    const houseId = house.id as string;
    const assignments = getDutyAssignmentsForWeek(weekStart);

    const { data: members } = await supabase
      .from("members")
      .select("id, room_number")
      .eq("house_id", houseId)
      .is("left_at", null);
    const memberByRoom = new Map((members ?? []).map((m: { id: string; room_number: string }) => [m.room_number, m]));

    const { data: dutyTypes } = await supabase.from("duty_types").select("id, key").eq("house_id", houseId);
    const dutyTypeByKey = new Map((dutyTypes ?? []).map((d: { id: string; key: string }) => [d.key, d]));

    async function isDone(memberId: string, dutyKey: DutyKey): Promise<boolean> {
      const dutyType = dutyTypeByKey.get(dutyKey);
      if (!dutyType) return false;
      const { data } = await supabase
        .from("duty_assignments")
        .select("status")
        .eq("house_id", houseId)
        .eq("week_start_date", weekStart)
        .eq("member_id", memberId)
        .eq("duty_type_id", (dutyType as { id: string }).id)
        .maybeSingle();
      return (data as { status?: string } | null)?.status === "done";
    }

    // 日曜9:00: 今週の当番を全員に通知
    if (dow === 0 && hour === 9 && minute < 5) {
      for (const m of members ?? []) {
        await sendToMember(supabase, houseId, (m as { id: string }).id, `weekly:${weekStart}:${(m as { id: string }).id}`, {
          ja: { title: "🧹 今週の当番", body: "当番表を確認してください。", url: "/duty" },
          en: { title: "🧹 This week's duties", body: "Check the duty schedule.", url: "/duty" },
        });
      }
    }

    // ゴミ出し: 月・木・水金
    const trashChecks: Array<{ duty: DutyKey; collectionDate: string }> = [
      { duty: "mon_trash", collectionDate: nextWeekday(todayJst, 1) },
      { duty: "thu_trash", collectionDate: nextWeekday(todayJst, 4) },
    ];

    for (const { duty, collectionDate } of trashChecks) {
      const room = getRoomForDuty(weekStart, duty);
      const member = room ? memberByRoom.get(room) : undefined;
      if (!member) continue;
      const isCollectionToday = collectionDate === todayJst;
      const eveningBefore = addDaysStr(collectionDate, -1) === todayJst;

      if (eveningBefore && hour === 20 && minute < 5) {
        await sendTrashReminder(supabase, houseId, (member as { id: string }).id, duty, `trash_eve:${collectionDate}:${duty}`);
      }
      if (isCollectionToday && hour === 7 && minute < 5) {
        await sendTrashReminder(supabase, houseId, (member as { id: string }).id, duty, `trash_am:${collectionDate}:${duty}`);
      }
      if (isCollectionToday && hour === 9 && minute < 5) {
        if (!(await isDone((member as { id: string }).id, duty))) {
          const restRoom = getRoomForDuty(weekStart, "rest");
          const restMember = restRoom ? memberByRoom.get(restRoom) : undefined;
          if (restMember) {
            await sendToMember(
              supabase,
              houseId,
              (restMember as { id: string }).id,
              `trash_substitute:${collectionDate}:${duty}`,
              {
                ja: { title: "🙏 代行のお願い", body: `${DUTY_LABELS[duty].ja}がまだ完了していません。代行をお願いできますか？`, url: "/duty" },
                en: { title: "🙏 Substitute needed", body: `${DUTY_LABELS[duty].en} isn't done yet — could you cover it?`, url: "/duty" },
              },
            );
          }
        }
      }
    }

    // 水金
    if (isWedFriCollectionDay(todayJst) || isWedFriCollectionDay(addDaysStr(todayJst, 1))) {
      const room = getRoomForDuty(weekStart, "wed_fri");
      const member = room ? memberByRoom.get(room) : undefined;
      if (member) {
        if (isWedFriCollectionDay(addDaysStr(todayJst, 1)) && hour === 20 && minute < 5) {
          await sendTrashReminder(supabase, houseId, (member as { id: string }).id, "wed_fri", `trash_eve:${addDaysStr(todayJst, 1)}:wed_fri`);
        }
        if (isWedFriCollectionDay(todayJst) && hour === 7 && minute < 5) {
          await sendTrashReminder(supabase, houseId, (member as { id: string }).id, "wed_fri", `trash_am:${todayJst}:wed_fri`);
        }
        if (isWedFriCollectionDay(todayJst) && hour === 9 && minute < 5) {
          if (!(await isDone((member as { id: string }).id, "wed_fri"))) {
            const restRoom = getRoomForDuty(weekStart, "rest");
            const restMember = restRoom ? memberByRoom.get(restRoom) : undefined;
            if (restMember) {
              await sendToMember(
                supabase,
                houseId,
                (restMember as { id: string }).id,
                `trash_substitute:${todayJst}:wed_fri`,
                {
                  ja: { title: "🙏 代行のお願い", body: "水金の収集がまだ完了していません。代行をお願いできますか？", url: "/duty" },
                  en: { title: "🙏 Substitute needed", body: "Wed/Fri collection isn't done yet — could you cover it?", url: "/duty" },
                },
              );
            }
          }
        }
      }
    }

    // その他の担当（掃除）: 木曜20時・日曜10時に未完了なら本人へ
    if ((dow === 4 && hour === 20 && minute < 5) || (dow === 0 && hour === 10 && minute < 5)) {
      const choreDuties: DutyKey[] = ["kitchen_1f", "toilet_1f", "toilet_2f", "entrance"];
      for (const duty of choreDuties) {
        const room = getRoomForDuty(weekStart, duty);
        const member = room ? memberByRoom.get(room) : undefined;
        if (!member) continue;
        if (!(await isDone((member as { id: string }).id, duty))) {
          await sendToMember(
            supabase,
            houseId,
            (member as { id: string }).id,
            `chore_reminder:${weekStart}:${duty}:${dow === 4 ? "thu" : "sun"}`,
            {
              ja: { title: "🧹 当番が未完了です", body: `${DUTY_LABELS[duty].ja}がまだ完了していません。`, url: "/duty" },
              en: { title: "🧹 Duty not done yet", body: `${DUTY_LABELS[duty].en} hasn't been marked done yet.`, url: "/duty" },
            },
          );
        }
      }
    }

    // 買い物帳: 追加から3日たっても誰も「行けるよ」を押していなければ全員に再通知
    const threeDaysAgoIso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleItems } = await supabase
      .from("shopping_items")
      .select("id, name_ja, name_en, created_at")
      .eq("house_id", houseId)
      .eq("status", "pending")
      .lte("created_at", threeDaysAgoIso);

    for (const item of staleItems ?? []) {
      const nameJa = (item as { name_ja?: string; name?: string }).name_ja ?? (item as { name?: string }).name ?? "";
      const nameEn = (item as { name_en?: string; name?: string }).name_en ?? (item as { name?: string }).name ?? "";
      for (const m of members ?? []) {
        await sendToMember(
          supabase,
          houseId,
          (m as { id: string }).id,
          `shopping_unclaimed:${(item as { id: string }).id}`,
          {
            ja: { title: "🛒 まだ誰も対応していません", body: `「${nameJa}」に誰も「行けるよ」を押していません。`, url: "/shopping" },
            en: { title: "🛒 Still unclaimed", body: `No one has claimed "${nameEn}" yet.`, url: "/shopping" },
          },
        );
      }
    }

    // 共用費: 毎月1日9時に全員へ今月の共用費を通知
    const [year, month] = todayJst.split("-").map(Number);
    if (nowJst.getUTCDate() === 1 && hour === 9 && minute < 5) {
      for (const m of members ?? []) {
        await sendToMember(supabase, houseId, (m as { id: string }).id, `dues_announce:${year}-${month}:${(m as { id: string }).id}`, {
          ja: { title: "💰 今月の共用費", body: "今月の共用費 500円をお願いします。", url: "/shopping" },
          en: { title: "💰 This month's shared fee", body: "Please pay this month's shared fee (¥500).", url: "/shopping" },
        });
      }
    }

    // 共用費: 毎月5日20時に未払いなら本人にだけ通知
    if (nowJst.getUTCDate() === 5 && hour === 20 && minute < 5) {
      const { data: dues } = await supabase
        .from("monthly_dues")
        .select("member_id, paid")
        .eq("house_id", houseId)
        .eq("year", year)
        .eq("month", month);
      const paidMemberIds = new Set((dues ?? []).filter((d: { paid: boolean }) => d.paid).map((d: { member_id: string }) => d.member_id));
      for (const m of members ?? []) {
        const memberId = (m as { id: string }).id;
        if (paidMemberIds.has(memberId)) continue;
        await sendToMember(supabase, houseId, memberId, `dues_unpaid:${year}-${month}:${memberId}`, {
          ja: { title: "💰 共用費が未払いです", body: "今月の共用費 500円がまだ未払いです。", url: "/shopping" },
          en: { title: "💰 Shared fee unpaid", body: "This month's shared fee (¥500) is still unpaid.", url: "/shopping" },
        });
      }
    }

    // 洗濯機: 終了予定時刻 / 放置リマインド
    const { data: washer } = await supabase.from("washer_status").select("*").eq("house_id", houseId).maybeSingle();
    if (washer && washer.status === "in_use" && washer.used_by && washer.expected_end_at) {
      const expectedEnd = new Date(washer.expected_end_at);
      if (now >= expectedEnd && !washer.reminder_sent) {
        await sendToMember(supabase, houseId, washer.used_by, `washer_end:${washer.id}:${washer.expected_end_at}`, {
          ja: { title: "🧺 洗濯終了予定の時刻です", body: "洗濯物を取り出しましたか？", url: "/home" },
          en: { title: "🧺 Your laundry should be done", body: "Have you taken out your laundry?", url: "/home" },
        });
        await supabase.from("washer_status").update({ reminder_sent: true }).eq("id", washer.id);
      }
      const thirtyMinPast = new Date(expectedEnd.getTime() + 30 * 60 * 1000);
      if (now >= thirtyMinPast) {
        await sendToMember(supabase, houseId, washer.used_by, `washer_overdue:${washer.id}:${washer.expected_end_at}`, {
          ja: { title: "🧺 洗濯物が取り出されていません", body: "終了予定から30分たっています。", url: "/home" },
          en: { title: "🧺 Laundry left in the washer", body: "It's been 30 minutes past the expected end time.", url: "/home" },
        });
      }
    }
  }

  return new Response("ok");
});

function nextWeekday(fromDateStr: string, targetDow: number): string {
  const [y, m, d] = fromDateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const diff = (targetDow - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + diff);
  return formatDateUTC(date);
}

// deno-lint-ignore no-explicit-any
async function sendTrashReminder(supabase: any, houseId: string, memberId: string, duty: DutyKey, key: string) {
  await sendToMember(supabase, houseId, memberId, key, {
    ja: { title: `🗑 ${DUTY_LABELS[duty].ja}の日です`, body: "忘れずに出してください。", url: "/duty" },
    en: { title: `🗑 It's ${DUTY_LABELS[duty].en} day`, body: "Don't forget to take it out.", url: "/duty" },
  });
}
