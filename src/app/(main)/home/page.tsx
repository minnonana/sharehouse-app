import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { getWeekStartDate, DUTY_LABELS } from "@/lib/duty/rotation";
import { buildPlanWeeks, dutyDisplay, type PlanDuty, type RoomRow, type RotationRow } from "@/lib/duty/plan";
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
  const lang = ctx.member.display_language;

  const [year, month] = today.split("-").map(Number);

  // 互いに依存しないクエリはPromise.allでまとめて並列実行する
  // （順番にawaitすると1回ずつSupabaseとの往復が直列に積み上がり、遷移が遅くなる）。
  const [
    { data: dutyTypes },
    { data: rooms },
    { data: rotations },
    { data: myAssignments },
    { data: washer },
    { data: allDues },
    { data: allSpends },
  ] = await Promise.all([
      supabase
        .from("duty_types")
        .select("*")
        .eq("house_id", ctx.house.id)
        .order("sort_order")
        .returns<PlanDuty[]>(),
      supabase.from("rooms").select("*").eq("house_id", ctx.house.id).order("sort_order").returns<RoomRow[]>(),
      supabase
        .from("duty_rotations")
        .select("starts_on, room_ids, slots")
        .eq("house_id", ctx.house.id)
        .returns<RotationRow[]>(),
      // 今週の自分の当番の完了状況
      supabase
        .from("duty_assignments")
        .select("duty_type_id, status")
        .eq("house_id", ctx.house.id)
        .eq("week_start_date", weekStart)
        .eq("member_id", ctx.member.id),
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

  // 今週の自分の担当（部屋数に合わせて組まれた当番表から、自分の部屋の分を取り出す）
  const [thisWeek] = buildPlanWeeks({
    rooms: rooms ?? [],
    duties: dutyTypes ?? [],
    rotations: rotations ?? [],
    startWeek: weekStart,
    numberOfWeeks: 1,
  });
  const myDuties = thisWeek.entries.find((e) => e.roomNumber === ctx.member.room_number)?.duties ?? [];
  const doneDutyIds = new Set(
    ((myAssignments ?? []) as { duty_type_id: string; status: string }[])
      .filter((a) => a.status === "done")
      .map((a) => a.duty_type_id),
  );

  const usedByMemberResult = washer?.used_by
    ? await supabase
        .from("members")
        .select("name")
        .eq("id", washer.used_by)
        .maybeSingle<Pick<Member, "name">>()
    : { data: null };
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
        {myDuties.length === 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: "#9ca3af" }}
            >
              {DUTY_LABELS.rest.short}
            </span>
            <span className="text-lg font-bold">{DUTY_LABELS.rest[lang]}</span>
          </div>
        )}
        {myDuties.map((duty) => {
          const display = dutyDisplay(duty, lang, thisWeek.wedFriCollections);
          return (
            <div key={duty.id} className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {display.short}
                </span>
                <span className="text-lg font-bold">{display.label}</span>
              </div>
              <CompleteDutyButton
                weekStartDate={weekStart}
                dutyTypeKey={duty.key}
                alreadyDone={doneDutyIds.has(duty.id)}
              />
            </div>
          );
        })}
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
