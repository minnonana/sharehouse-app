import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import {
  getDutyForRoom,
  getWeekStartDate,
  getWedFriCollectionsForWeek,
  getWedFriDutyLabel,
  DUTY_LABELS,
  type DutyKey,
} from "@/lib/duty/rotation";
import { getTodayJst } from "@/lib/date/jst";
import { WasherCard } from "@/components/WasherCard";
import { CompleteDutyButton } from "@/components/CompleteDutyButton";
import { T } from "@/components/T";
import { buildMonthlyBalance } from "@/lib/shopping/balance";
import type { Member, MonthlyDue, WasherStatusRow } from "@/types/database";

export default async function HomePage() {
  const ctx = await getCurrentMember();
  if (!ctx) return null;

  const supabase = await createClient();
  const today = getTodayJst();
  const weekStart = getWeekStartDate(today);
  const dutyKey = getDutyForRoom(weekStart, ctx.member.room_number as never) as DutyKey;
  const dutyLabel = DUTY_LABELS[dutyKey];
  const dutyDisplayName =
    dutyKey === "wed_fri"
      ? getWedFriDutyLabel(getWedFriCollectionsForWeek(weekStart), ctx.member.display_language)
      : dutyLabel[ctx.member.display_language];

  const [year, month] = today.split("-").map(Number);

  // 互いに依存しないクエリはPromise.allでまとめて並列実行する
  // （順番にawaitすると1回ずつSupabaseとの往復が直列に積み上がり、遷移が遅くなる）。
  const [{ data: dutyType }, { data: washer }, { data: allDues }, { data: allSpends }] =
    await Promise.all([
      supabase
        .from("duty_types")
        .select("id")
        .eq("house_id", ctx.house.id)
        .eq("key", dutyKey)
        .maybeSingle(),
      supabase
        .from("washer_status")
        .select("*")
        .eq("house_id", ctx.house.id)
        .maybeSingle<WasherStatusRow>(),
      supabase
        .from("monthly_dues")
        .select("*")
        .eq("house_id", ctx.house.id)
        .returns<MonthlyDue[]>(),
      supabase
        .from("shopping_items")
        .select("amount_yen, completed_at")
        .eq("house_id", ctx.house.id)
        .in("status", ["done", "settled"]),
    ]);

  // dutyType.id / washer.used_by に依存する2つも、互いには依存しないので並列実行する
  const [assignmentResult, usedByMemberResult] = await Promise.all([
    dutyType
      ? supabase
          .from("duty_assignments")
          .select("status")
          .eq("house_id", ctx.house.id)
          .eq("week_start_date", weekStart)
          .eq("member_id", ctx.member.id)
          .eq("duty_type_id", dutyType.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    washer?.used_by
      ? supabase
          .from("members")
          .select("name")
          .eq("id", washer.used_by)
          .maybeSingle<Pick<Member, "name">>()
      : Promise.resolve({ data: null }),
  ]);
  const alreadyDone = assignmentResult.data?.status === "done";
  const usedByName = usedByMemberResult.data?.name ?? null;
  const firstDue = (allDues ?? []).reduce<{ year: number; month: number } | null>((min, d) => {
    if (!min || d.year < min.year || (d.year === min.year && d.month < min.month)) {
      return { year: d.year, month: d.month };
    }
    return min;
  }, null);
  const monthlyRows = buildMonthlyBalance(
    allDues ?? [],
    allSpends ?? [],
    firstDue?.year ?? year,
    firstDue?.month ?? month,
    year,
    month,
  );
  const currentBalance = monthlyRows.at(-1)?.balance ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-foreground/60">{ctx.house.name}</p>
        <h1 className="text-xl font-bold">
          {ctx.member.name}（{ctx.member.room_number}）
        </h1>
      </header>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <T k="home.todayDuty" as="h2" className="text-sm font-bold text-foreground/70" />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: dutyKey === "rest" ? "#9ca3af" : "var(--color-primary)" }}
            >
              {dutyLabel.short}
            </span>
            <span className="text-lg font-bold">{dutyDisplayName}</span>
          </div>
          {dutyKey !== "rest" && (
            <CompleteDutyButton
              weekStartDate={weekStart}
              dutyTypeKey={dutyKey}
              alreadyDone={alreadyDone}
            />
          )}
        </div>
      </section>

      <WasherCard washer={washer ?? null} usedByName={usedByName} />

      <a
        href="/shopping"
        className="flex items-center justify-between rounded-xl border border-border bg-white p-4 shadow-sm"
      >
        <T k="shopping.title" as="span" className="text-sm font-bold text-foreground/70" />
        <span className="font-bold text-primary-dark">¥{currentBalance.toLocaleString()}</span>
      </a>
    </div>
  );
}
