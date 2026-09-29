import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { getTodayJst } from "@/lib/date/jst";
import {
  buildDutySchedule,
  DUTY_LABELS,
  ROOM_NUMBERS,
  TRASH_LABELS,
  getWeekStartDate,
  type DutyKey,
  type RoomNumber,
} from "@/lib/duty/rotation";
import { AbsenceForm } from "@/components/AbsenceForm";
import { SwapRequestForm } from "@/components/SwapRequestForm";
import { SwapRequestInbox } from "@/components/SwapRequestInbox";
import { SubstituteButton } from "@/components/SubstituteButton";
import { T } from "@/components/T";
import type { DutyAssignment, DutyType, Member } from "@/types/database";

export default async function DutyPage() {
  const ctx = await getCurrentMember();
  if (!ctx) return null;

  const lang = ctx.member.display_language;
  const dutyLabel = (key: DutyKey) => DUTY_LABELS[key][lang];
  const trashLabel = (kind: keyof typeof TRASH_LABELS) => TRASH_LABELS[kind][lang];

  const supabase = await createClient();
  const today = getTodayJst();
  const currentWeekStart = getWeekStartDate(today);
  const weeks = buildDutySchedule(currentWeekStart, 8);
  const currentWeek = weeks[0];

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("house_id", ctx.house.id)
    .is("left_at", null)
    .returns<Member[]>();
  const memberByRoom = new Map((members ?? []).map((m) => [m.room_number, m]));

  const { data: dutyTypes } = await supabase
    .from("duty_types")
    .select("*")
    .eq("house_id", ctx.house.id)
    .returns<DutyType[]>();
  const dutyTypeByKey = new Map((dutyTypes ?? []).map((d) => [d.key, d]));

  // 今週の割り当て状況（完了/未完了）
  const { data: currentAssignments } = await supabase
    .from("duty_assignments")
    .select("*")
    .eq("house_id", ctx.house.id)
    .eq("week_start_date", currentWeekStart)
    .returns<DutyAssignment[]>();

  const statusByMemberDuty = new Map(
    (currentAssignments ?? []).map((a) => [`${a.member_id}:${a.duty_type_id}`, a.status]),
  );

  // 自分宛の交換リクエスト（保留中）
  const { data: pendingSwaps } = await supabase
    .from("duty_swap_requests")
    .select(
      "id, status, from_assignment:from_assignment_id(member_id, duty_type_id), to_assignment:to_assignment_id(member_id, duty_type_id)",
    )
    .eq("house_id", ctx.house.id)
    .eq("status", "pending");

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));
  const dutyTypeById = new Map((dutyTypes ?? []).map((d) => [d.id, d]));

  const inboxItems = (pendingSwaps ?? [])
    .filter((s) => {
      const to = s.to_assignment as unknown as { member_id: string; duty_type_id: string };
      return to?.member_id === ctx.member.id;
    })
    .map((s) => {
      const from = s.from_assignment as unknown as { member_id: string; duty_type_id: string };
      const to = s.to_assignment as unknown as { member_id: string; duty_type_id: string };
      return {
        id: s.id as string,
        fromMemberName: memberById.get(from.member_id)?.name ?? "?",
        fromDutyKey: (dutyTypeById.get(from.duty_type_id)?.key ?? "rest") as DutyKey,
        toDutyKey: (dutyTypeById.get(to.duty_type_id)?.key ?? "rest") as DutyKey,
      };
    });

  // 今週「休み」の部屋（代行できる人）
  const restRoom = (Object.entries(currentWeek.assignments) as [RoomNumber, DutyKey][]).find(
    ([, duty]) => duty === "rest",
  )?.[0];
  const isRestMember = ctx.member.room_number === restRoom;

  // 完了回数・代行回数の集計
  const { data: allDoneAssignments } = await supabase
    .from("duty_assignments")
    .select("member_id")
    .eq("house_id", ctx.house.id)
    .eq("status", "done");
  const { data: allSubstitutions } = await supabase
    .from("substitutions")
    .select("covering_member_id")
    .eq("house_id", ctx.house.id);

  const completedCountByMember = new Map<string, number>();
  (allDoneAssignments ?? []).forEach((a) => {
    completedCountByMember.set(a.member_id, (completedCountByMember.get(a.member_id) ?? 0) + 1);
  });
  const substituteCountByMember = new Map<string, number>();
  (allSubstitutions ?? []).forEach((s) => {
    substituteCountByMember.set(
      s.covering_member_id,
      (substituteCountByMember.get(s.covering_member_id) ?? 0) + 1,
    );
  });

  const weekEnded = addDays(currentWeekStart, 7) <= today;

  return (
    <div className="flex flex-col gap-4">
      <T k="duty.title" as="h1" className="text-xl font-bold text-primary-dark" />

      <SwapRequestInbox items={inboxItems} />

      {weeks.map((week) => {
        const isCurrent = week.weekStartDate === currentWeekStart;
        const [, month, day] = week.weekStartDate.split("-").map(Number);
        return (
          <section
            key={week.weekStartDate}
            className={`rounded-xl border p-4 shadow-sm ${
              isCurrent ? "border-primary bg-primary-light" : "border-border bg-white"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">
                <T k="duty.weekLabel" params={{ month, day }} />
                {isCurrent && (
                  <span className="ml-2 text-xs text-primary-dark">
                    <T k="duty.thisWeek" />
                  </span>
                )}
              </h2>
            </div>

            <ul className="flex flex-col gap-1">
              {ROOM_NUMBERS.map((room) => {
                const dutyKey = week.assignments[room];
                const isMine = room === ctx.member.room_number;
                const roomMember = memberByRoom.get(room);
                const dutyType = dutyTypeByKey.get(dutyKey);
                const status =
                  isCurrent && roomMember && dutyType
                    ? statusByMemberDuty.get(`${roomMember.id}:${dutyType.id}`) ?? "pending"
                    : undefined;
                const isDone = status === "done";
                const isPendingDisplay = isCurrent && dutyKey !== "rest" && !isDone;
                const isOverdue = isPendingDisplay && weekEnded;

                // 完了済みは薄く目立たなくし、まだの人が自然と浮き上がるようにする
                const faded = isCurrent && dutyKey !== "rest" && isDone;

                return (
                  <li
                    key={room}
                    className={`flex flex-col gap-1 rounded-lg px-3 py-2 text-sm transition-opacity ${
                      isMine ? "border-l-4 border-primary bg-surface-muted" : "bg-surface-muted"
                    } ${faded ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {room} {roomMember?.name ?? ""}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {DUTY_LABELS[dutyKey].short}
                        </span>
                        {dutyLabel(dutyKey)}
                        {isDone && <span aria-label={dutyLabel(dutyKey)}>✓</span>}
                        {isOverdue && (
                          <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                            <T k="duty.incomplete" />
                          </span>
                        )}
                        {isPendingDisplay && !isOverdue && (
                          <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-white">
                            <T k="duty.notYet" />
                          </span>
                        )}
                      </span>
                    </div>

                    {isCurrent && isMine && dutyKey !== "rest" && (
                      <SwapRequestForm
                        weekStartDate={currentWeekStart}
                        myDutyTypeKey={dutyKey}
                        candidates={ROOM_NUMBERS.filter((r) => r !== room)
                          .map((r) => {
                            const m = memberByRoom.get(r);
                            const dk = week.assignments[r];
                            if (!m || dk === "rest") return null;
                            return { room: r, memberId: m.id, memberName: m.name, dutyKey: dk };
                          })
                          .filter((v): v is NonNullable<typeof v> => v !== null)}
                      />
                    )}

                    {isCurrent &&
                      isRestMember &&
                      !isMine &&
                      dutyKey !== "rest" &&
                      status !== "done" &&
                      roomMember && (
                        <div>
                          <SubstituteButton
                            weekStartDate={currentWeekStart}
                            originalMemberId={roomMember.id}
                            dutyTypeKey={dutyKey}
                          />
                        </div>
                      )}
                  </li>
                );
              })}
            </ul>

            {week.wedFriCollections.length > 0 && (
              <p className="mt-3 text-xs text-foreground/70">
                <T k="duty.wedFriCollectionLabel" />{" "}
                {week.wedFriCollections
                  .map((c) => `${formatMonthDay(c.date)}(${trashLabel(c.kind)})`)
                  .join(lang === "ja" ? "、" : ", ")}
              </p>
            )}

            {isCurrent && (
              <div className="mt-3">
                <AbsenceForm />
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <T k="duty.completedSubstituteHeading" as="h2" className="mb-2 font-bold" />
        <ul className="flex flex-col gap-1 text-sm">
          {(members ?? [])
            .sort((a, b) => a.room_number.localeCompare(b.room_number))
            .map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>
                  {m.room_number} {m.name}
                </span>
                <span className="text-foreground/60">
                  <T k="duty.completedInline" /> {completedCountByMember.get(m.id) ?? 0} / <T k="duty.substituteInline" />{" "}
                  {substituteCountByMember.get(m.id) ?? 0}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function formatMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
