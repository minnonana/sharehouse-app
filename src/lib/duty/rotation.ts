// 掃除当番・ゴミ出し当番のローテーション計算（第1段階のコアロジック）
// 仕様: docs/仕様書 第1段階（8週で一周、毎週日曜切り替え、空室なしの8部屋）
//
// 基準週: 2026-09-27（日）
//   111=1Fキッチン, 112=1Fトイレ, 113=2Fトイレ, 114=玄関,
//   115=月, 116=木, 117=水金, 118=休み
// 翌週から部屋番号が若い順に1つずつ担当がずれる。

export const ROOM_NUMBERS = [
  "111",
  "112",
  "113",
  "114",
  "115",
  "116",
  "117",
  "118",
] as const;

export type RoomNumber = (typeof ROOM_NUMBERS)[number];

export type DutyKey =
  | "kitchen_1f"
  | "toilet_1f"
  | "toilet_2f"
  | "entrance"
  | "mon_trash"
  | "thu_trash"
  | "wed_fri"
  | "rest";

// 基準週（week index 0）で部屋番号順に割り当たる担当
export const DUTY_ORDER: DutyKey[] = [
  "kitchen_1f",
  "toilet_1f",
  "toilet_2f",
  "entrance",
  "mon_trash",
  "thu_trash",
  "wed_fri",
  "rest",
];

export const DUTY_LABELS: Record<DutyKey, { ja: string; en: string; short: string }> = {
  kitchen_1f: { ja: "1Fキッチン", en: "1F Kitchen", short: "K1" },
  toilet_1f: { ja: "1Fトイレ", en: "1F Toilet", short: "T1" },
  toilet_2f: { ja: "2Fトイレ", en: "2F Toilet", short: "T2" },
  entrance: { ja: "玄関", en: "Entrance", short: "G" },
  mon_trash: { ja: "月", en: "Mon", short: "M" },
  thu_trash: { ja: "木", en: "Thu", short: "Th" },
  wed_fri: { ja: "水金", en: "Wed/Fri", short: "WF" },
  rest: { ja: "休み", en: "Rest", short: "-" },
};

export const BASE_WEEK_START = "2026-09-27"; // 日曜日

/** YYYY-MM-DD を UTC 正午の Date にする（タイムゾーンによる日付ズレを避ける） */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** 任意の日付が属する週の開始日（日曜日）を YYYY-MM-DD で返す */
export function getWeekStartDate(dateStr: string): string {
  const date = parseDate(dateStr);
  const dow = date.getUTCDay(); // 0 = 日曜
  return formatDate(addDays(date, -dow));
}

/** 基準週（2026-09-27）から何週間後かを返す（負数・0も可） */
export function getWeekIndex(weekStartDateStr: string): number {
  const base = parseDate(BASE_WEEK_START);
  const target = parseDate(weekStartDateStr);
  const diffMs = target.getTime() - base.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/** 指定週の部屋ごとの担当を計算する */
export function getDutyAssignmentsForWeek(
  weekStartDateStr: string,
): Record<RoomNumber, DutyKey> {
  const weekIndex = getWeekIndex(weekStartDateStr);
  const result = {} as Record<RoomNumber, DutyKey>;

  ROOM_NUMBERS.forEach((room, roomIndex) => {
    // 週が進むごとに、各部屋の担当は「1つ前の担当」にずれていく
    const dutyIndex = (((roomIndex - weekIndex) % 8) + 8) % 8;
    result[room] = DUTY_ORDER[dutyIndex];
  });

  return result;
}

/** 指定した部屋の指定週の担当を返す */
export function getDutyForRoom(
  weekStartDateStr: string,
  room: RoomNumber,
): DutyKey {
  return getDutyAssignmentsForWeek(weekStartDateStr)[room];
}

/** ある担当がどの部屋かを引く（例: その週「休み」の部屋を探す） */
export function getRoomForDuty(
  weekStartDateStr: string,
  duty: DutyKey,
): RoomNumber {
  const map = getDutyAssignmentsForWeek(weekStartDateStr);
  const entry = (Object.entries(map) as [RoomNumber, DutyKey][]).find(
    ([, d]) => d === duty,
  );
  if (!entry) {
    throw new Error(`duty not found in week: ${duty}`);
  }
  return entry[0];
}

// =========================================================
// ゴミ収集カレンダー
// =========================================================

export type TrashKind =
  | "burnable" // 燃やすごみ（月・木、当番のローテーションで固定）
  | "non_burnable" // 燃やさないごみ（第3金曜）
  | "recyclable" // 資源（あき缶・ペットボトル・プラスチック資源など）（第2・第4金曜）
  | "plastic_only" // 資源（プラスチックのみ）（第5金曜がある月のみ）
  | "bottle"; // あきびん（第1水曜）

export const TRASH_LABELS: Record<TrashKind, { ja: string; en: string }> = {
  burnable: { ja: "燃やすごみ", en: "Burnable trash" },
  non_burnable: { ja: "燃やさないごみ", en: "Non-burnable trash" },
  recyclable: { ja: "資源", en: "Recyclables" },
  plastic_only: { ja: "資源（プラスチックのみ）", en: "Recyclables (plastic only)" },
  bottle: { ja: "あきびん", en: "Empty bottles" },
};

/** その月の第n〇曜日を返す。存在しなければ null（例: 第5金曜がない月） */
function nthWeekdayOfMonth(
  year: number,
  month0: number, // 0-11
  weekday: number, // 0=日 ... 6=土
  n: number,
): Date | null {
  const first = new Date(Date.UTC(year, month0, 1, 12));
  const firstWeekday = first.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  const result = new Date(Date.UTC(year, month0, day, 12));
  if (result.getUTCMonth() !== month0) return null; // その月に収まらない
  return result;
}

interface TrashEvent {
  date: string; // YYYY-MM-DD
  kind: TrashKind;
}

/** 指定週（日曜始まり）の水曜・金曜に該当するゴミ収集イベントを返す */
export function getWedFriCollectionsForWeek(weekStartDateStr: string): TrashEvent[] {
  const weekStart = parseDate(weekStartDateStr);
  const wednesday = addDays(weekStart, 3);
  const friday = addDays(weekStart, 5);

  const events: TrashEvent[] = [];

  // 水曜: あきびん（第1水曜）
  const year = wednesday.getUTCFullYear();
  const month0 = wednesday.getUTCMonth();
  const firstWed = nthWeekdayOfMonth(year, month0, 3, 1);
  if (firstWed && formatDate(firstWed) === formatDate(wednesday)) {
    events.push({ date: formatDate(wednesday), kind: "bottle" });
  }

  // 金曜: 燃やさないごみ（第3）、資源（第2・第4）、プラのみ（第5）
  const fYear = friday.getUTCFullYear();
  const fMonth0 = friday.getUTCMonth();
  const fridayStr = formatDate(friday);

  const third = nthWeekdayOfMonth(fYear, fMonth0, 5, 3);
  const second = nthWeekdayOfMonth(fYear, fMonth0, 5, 2);
  const fourth = nthWeekdayOfMonth(fYear, fMonth0, 5, 4);
  const fifth = nthWeekdayOfMonth(fYear, fMonth0, 5, 5);

  if (third && formatDate(third) === fridayStr) {
    events.push({ date: fridayStr, kind: "non_burnable" });
  }
  if (
    (second && formatDate(second) === fridayStr) ||
    (fourth && formatDate(fourth) === fridayStr)
  ) {
    events.push({ date: fridayStr, kind: "recyclable" });
  }
  if (fifth && formatDate(fifth) === fridayStr) {
    events.push({ date: fridayStr, kind: "plastic_only" });
  }

  return events;
}

/** 8週分の当番表をまとめて生成する（当番表タブでの一覧表示用） */
export function buildDutySchedule(
  startWeekStr: string,
  numberOfWeeks = 8,
): Array<{
  weekStartDate: string;
  assignments: Record<RoomNumber, DutyKey>;
  wedFriCollections: TrashEvent[];
}> {
  const weeks = [];
  let cursor = getWeekStartDate(startWeekStr);
  for (let i = 0; i < numberOfWeeks; i++) {
    weeks.push({
      weekStartDate: cursor,
      assignments: getDutyAssignmentsForWeek(cursor),
      wedFriCollections: getWedFriCollectionsForWeek(cursor),
    });
    cursor = formatDate(addDays(parseDate(cursor), 7));
  }
  return weeks;
}
