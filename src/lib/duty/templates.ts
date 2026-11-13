// 寮ごとの担当のひな形（docs/plan-dorms.md）。ハウス作成時に duty_types へ入れる。
import type { DormType } from "./engine";

export interface TemplateDuty {
  key: string;
  ja: string;
  en: string;
  short: string;
  category: "chore" | "trash";
  /** 人数が足りないときにまとめる先（key）と、まとめる順 */
  mergeInto?: string;
  mergeOrder?: number;
}

export interface DormTemplate {
  nameJa: string;
  nameEn: string;
  /** 1ユニットの最大人数（部屋数） */
  maxRooms: number;
  duties: TemplateDuty[];
}

export const DORM_TEMPLATES: Record<DormType, DormTemplate> = {
  sakigake: {
    nameJa: "先魁",
    nameEn: "Sakigake",
    maxRooms: 8,
    duties: [
      { key: "kitchen_1f", ja: "1Fキッチン", en: "1F Kitchen", short: "K1", category: "chore" },
      { key: "toilet_1f", ja: "1Fトイレ", en: "1F Toilet", short: "T1", category: "chore", mergeInto: "kitchen_1f", mergeOrder: 5 },
      { key: "toilet_2f", ja: "2Fトイレ", en: "2F Toilet", short: "T2", category: "chore", mergeInto: "toilet_1f", mergeOrder: 4 },
      { key: "entrance", ja: "玄関", en: "Entrance", short: "G", category: "chore", mergeInto: "toilet_2f", mergeOrder: 1 },
      { key: "mon_trash", ja: "燃えるゴミ(月)", en: "Burnable trash (Mon)", short: "M", category: "trash", mergeInto: "thu_trash", mergeOrder: 3 },
      { key: "thu_trash", ja: "燃えるゴミ(木)", en: "Burnable trash (Thu)", short: "Th", category: "trash", mergeInto: "kitchen_1f", mergeOrder: 6 },
      { key: "wed_fri", ja: "水金", en: "Wed/Fri", short: "WF", category: "trash", mergeInto: "thu_trash", mergeOrder: 2 },
    ],
  },
  hokumei: {
    nameJa: "北溟",
    nameEn: "Hokumei",
    maxRooms: 5,
    duties: [
      { key: "kitchen_living", ja: "キッチン・リビング", en: "Kitchen & living", short: "KL", category: "chore" },
      { key: "shower_toilet", ja: "シャワー・洗面・トイレ", en: "Shower, sink & toilet", short: "ST", category: "chore", mergeInto: "kitchen_living", mergeOrder: 3 },
      { key: "mon_trash", ja: "燃えるゴミ(月)", en: "Burnable trash (Mon)", short: "M", category: "trash", mergeInto: "thu_trash", mergeOrder: 2 },
      { key: "thu_trash", ja: "燃えるゴミ(木)", en: "Burnable trash (Thu)", short: "Th", category: "trash", mergeInto: "kitchen_living", mergeOrder: 4 },
      { key: "wed_fri", ja: "水金", en: "Wed/Fri", short: "WF", category: "trash", mergeInto: "thu_trash", mergeOrder: 1 },
    ],
  },
};

export function isDormType(value: unknown): value is DormType {
  return value === "sakigake" || value === "hokumei";
}

/** 部屋番号の入力を整える（前後の空白を除き、空欄を捨てる）。問題があれば null */
export function normalizeRoomNumbers(input: unknown, maxRooms: number): string[] | null {
  if (!Array.isArray(input)) return null;
  const rooms = input.map((v) => String(v ?? "").trim()).filter((v) => v !== "");
  if (rooms.length === 0 || rooms.length > maxRooms) return null;
  if (rooms.some((r) => r.length > 10)) return null;
  if (new Set(rooms).size !== rooms.length) return null;
  return rooms;
}
