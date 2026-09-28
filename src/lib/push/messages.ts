import type { Language } from "@/types/database";
import type { PushPayload } from "./send";

/** 通知文面（第2段階）。各自の表示言語で送るため、言語ごとの関数として定義する。 */
export const pushMessages = {
  boardImportant: (authorName: string, body: string): Record<Language, PushPayload> => {
    const excerpt = body.length > 80 ? `${body.slice(0, 80)}…` : body;
    return {
      ja: { title: `📋 ${authorName}さんから重要な連絡`, body: excerpt, url: "/board" },
      en: { title: `📋 Important notice from ${authorName}`, body: excerpt, url: "/board" },
    };
  },

  washerAvailable: (): Record<Language, PushPayload> => ({
    ja: { title: "🧺 洗濯機が空きました", body: "洗濯機が使えるようになりました。", url: "/home" },
    en: { title: "🧺 Washer is available", body: "The washer is free to use now.", url: "/home" },
  }),

  washerFinishedReminder: (): Record<Language, PushPayload> => ({
    ja: { title: "🧺 洗濯終了予定の時刻です", body: "洗濯物を取り出しましたか？", url: "/home" },
    en: { title: "🧺 Your laundry should be done", body: "Have you taken out your laundry?", url: "/home" },
  }),

  washerLeftUnattended: (): Record<Language, PushPayload> => ({
    ja: {
      title: "🧺 洗濯物が取り出されていません",
      body: "終了予定から30分たっています。取り出しをお願いします。",
      url: "/home",
    },
    en: {
      title: "🧺 Laundry left in the washer",
      body: "It's been 30 minutes past the expected end time.",
      url: "/home",
    },
  }),

  swapRequested: (fromName: string): Record<Language, PushPayload> => ({
    ja: { title: "🔄 当番の交換をお願いされました", body: `${fromName}さんから交換のお願いが届いています。`, url: "/duty" },
    en: { title: "🔄 Someone wants to swap duties", body: `${fromName} sent you a swap request.`, url: "/duty" },
  }),

  substitutedForYou: (coveringName: string): Record<Language, PushPayload> => ({
    ja: { title: "🙏 当番を代行してもらいました", body: `${coveringName}さんが代わりに担当してくれました。`, url: "/duty" },
    en: { title: "🙏 Someone covered your duty", body: `${coveringName} covered your duty for you.`, url: "/duty" },
  }),

  weeklyDutyAnnouncement: (): Record<Language, PushPayload> => ({
    ja: { title: "🧹 今週の当番", body: "当番表を確認してください。", url: "/duty" },
    en: { title: "🧹 This week's duties", body: "Check the duty schedule.", url: "/duty" },
  }),

  trashReminder: (label: string): Record<Language, PushPayload> => ({
    ja: { title: `🗑 ${label}の日です`, body: "忘れずに出してください。", url: "/duty" },
    en: { title: `🗑 It's ${label} day`, body: "Don't forget to take it out.", url: "/duty" },
  }),

  choreIncomplete: (label: string): Record<Language, PushPayload> => ({
    ja: { title: "🧹 当番が未完了です", body: `${label}がまだ完了していません。`, url: "/duty" },
    en: { title: "🧹 Duty not done yet", body: `${label} hasn't been marked done yet.`, url: "/duty" },
  }),

  substituteRequestForRestRoom: (label: string): Record<Language, PushPayload> => ({
    ja: {
      title: "🙏 代行のお願い",
      body: `今週「休み」の方へ: ${label}の代行をお願いできますか？`,
      url: "/duty",
    },
    en: {
      title: "🙏 Substitute needed",
      body: `You're "resting" this week — could you cover ${label}?`,
      url: "/duty",
    },
  }),
} as const;

export function localize(map: Record<Language, PushPayload>) {
  return (lang: Language) => map[lang] ?? map.ja;
}
