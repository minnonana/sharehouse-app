/** 6桁の招待コード・引き継ぎコードを生成する（数字のみ、紛らわしさを避けるためゼロ埋め） */
export function generateSixDigitCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}
