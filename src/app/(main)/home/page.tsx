import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { getDutyForRoom, getWeekStartDate, DUTY_LABELS, type DutyKey } from "@/lib/duty/rotation";
import { getTodayJst } from "@/lib/date/jst";
import { WasherCard } from "@/components/WasherCard";
import { CompleteDutyButton } from "@/components/CompleteDutyButton";
import { HomeTexts } from "./HomeTexts";
import type { Member, WasherStatusRow } from "@/types/database";

export default async function HomePage() {
  const ctx = await getCurrentMember();
  if (!ctx) return null;

  const supabase = await createClient();
  const today = getTodayJst();
  const weekStart = getWeekStartDate(today);
  const dutyKey = getDutyForRoom(weekStart, ctx.member.room_number as never) as DutyKey;
  const dutyLabel = DUTY_LABELS[dutyKey];

  const { data: dutyType } = await supabase
    .from("duty_types")
    .select("id")
    .eq("house_id", ctx.house.id)
    .eq("key", dutyKey)
    .maybeSingle();

  let alreadyDone = false;
  if (dutyType) {
    const { data: assignment } = await supabase
      .from("duty_assignments")
      .select("status")
      .eq("house_id", ctx.house.id)
      .eq("week_start_date", weekStart)
      .eq("member_id", ctx.member.id)
      .eq("duty_type_id", dutyType.id)
      .maybeSingle();
    alreadyDone = assignment?.status === "done";
  }

  const { data: washer } = await supabase
    .from("washer_status")
    .select("*")
    .eq("house_id", ctx.house.id)
    .maybeSingle<WasherStatusRow>();

  let usedByName: string | null = null;
  if (washer?.used_by) {
    const { data: usedByMember } = await supabase
      .from("members")
      .select("name")
      .eq("id", washer.used_by)
      .maybeSingle<Pick<Member, "name">>();
    usedByName = usedByMember?.name ?? null;
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-foreground/60">{ctx.house.name}</p>
        <h1 className="text-xl font-bold">
          {ctx.member.name}（{ctx.member.room_number}）
        </h1>
      </header>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <HomeTexts labelKey="home.todayDuty" />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: dutyKey === "rest" ? "#9ca3af" : "var(--color-primary)" }}
            >
              {dutyLabel.short}
            </span>
            <span className="text-lg font-bold">{dutyLabel.ja}</span>
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
    </div>
  );
}
