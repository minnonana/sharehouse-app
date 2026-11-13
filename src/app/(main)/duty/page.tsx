import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { getTodayJst } from "@/lib/date/jst";
import { DUTY_LABELS, TRASH_LABELS, getWeekStartDate, type DutyKey } from "@/lib/duty/rotation";
import { buildPlanWeeks, dutyDisplay, type RoomRow, type RotationRow } from "@/lib/duty/plan";
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
  const trashLabel = (kind: keyof typeof TRASH_LABELS) => TRASH_LABELS[kind][lang];

  const supabase = await createClient();
  const today = getTodayJst();
  const currentWeekStart = getWeekStartDate(today);

  // 互いに依存しないクエリはPromise.allでまとめて並列実行する
  // （順番にawaitすると往復が直列に積み上がり、遷移が遅くなる）。
  const [
    { data: members },
    { data: dutyTypes },
    { data: currentAssignments },
    { data: pendingSwaps },
    { data: allDoneAssignments },
    { data: allSubstitutions },
    { data: rooms },
    { data: rotations },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .eq("house_id", ctx.house.id)
      .is("left_at", null)
      .returns<Member[]>(),
    supabase.from("duty_types").select("*").eq("house_id", ctx.house.id).returns<DutyType[]>(),
    // 今週の割り当て状況（完了/未完了）
    supabase
      .from("duty_assignments")
      .select("*")
      .eq("house_id", ctx.house.id)
      .eq("week_start_date", currentWeekStart)
      .returns<DutyAssignment[]>(),
    // 自分宛の交換リクエスト（保留中）
    supabase
      .from("duty_swap_requests")
      .select(
        "id, status, from_assignment:from_assignment_id(member_id, duty_type_id), to_assignment:to_assignment_id(member_id, duty_type_id)",
      )
      .eq("house_id", ctx.house.id)
      .eq("status", "pending"),
    // 完了回数・代行回数の集計
    supabase
      .from("duty_assignments")
      .select("member_id")
      .eq("house_id", ctx.house.id)
      .eq("status", "done"),
    supabase.from("substitutions").select("covering_member_id").eq("house_id", ctx.house.id),
    // 部屋（アプリ未参加の住人の名前を含む）と、当番の組み方の区切り
    supabase.from("rooms").select("*").eq("house_id", ctx.house.id).order("sort_order").returns<RoomRow[]>(),
    supabase
      .from("duty_rotations")
      .select("starts_on, room_ids, slots")
      .eq("house_id", ctx.house.id)
      .returns<RotationRow[]>(),
  ]);

  const weeks = buildPlanWeeks({
    rooms: rooms ?? [],
    duties: dutyTypes ?? [],
    rotations: rotations ?? [],
    startWeek: currentWeekStart,
    numberOfWeeks: 8,
  });
  const currentWeek = weeks[0];

  const memberByRoom = new Map((members ?? []).map((m) => [m.room_number, m]));

  const statusByMemberDuty = new Map(
    (currentAssignments ?? []).map((a) => [`${a.member_id}:${a.duty_type_id}`, a.status]),
  );

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
  const isRestMember =
    currentWeek.entries.find((e) => e.roomNumber === ctx.member.room_number)?.duties.length === 0;

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
              {week.entries.map((entry) => {
                const room = entry.roomNumber;
                const isRest = entry.duties.length === 0;
                const isMine = room === ctx.member.room_number;
                const roomMember = memberByRoom.get(room);
                const dutyStatuses = entry.duties.map((duty) => ({
                  duty,
                  display: dutyDisplay(duty, lang, week.wedFriCollections),
                  done:
                    isCurrent && roomMember
                      ? statusByMemberDuty.get(`${roomMember.id}:${duty.id}`) === "done"
                      : false,
                }));
                const isDone = !isRest && dutyStatuses.every((d) => d.done);
                const isPendingDisplay = isCurrent && !isRest && !isDone;
                const isOverdue = isPendingDisplay && weekEnded;

                // 完了済みは薄く目立たなくし、まだの人が自然と浮き上がるようにする
                const faded = isCurrent && isDone;
                const rowLabel = dutyStatuses.map((d) => d.display.label).join(lang === "ja" ? "・" : " / ");

                return (
                  <li
                    key={room}
                    className={`flex flex-col gap-1 rounded-lg px-3 py-2 text-sm transition-opacity ${
                      isMine ? "border-l-4 border-primary bg-surface-muted" : "bg-surface-muted"
                    } ${faded ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {room} {roomMember?.name ?? entry.residentName ?? ""}
                      </span>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        {isRest && (
                          <>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                              {DUTY_LABELS.rest.short}
                            </span>
                            {DUTY_LABELS.rest[lang]}
                          </>
                        )}
                        {dutyStatuses.map(({ duty, display }) => (
                          <span key={duty.id} className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                              {display.short}
                            </span>
                            {display.label}
                          </span>
                        ))}
                        {isDone && <span aria-label={rowLabel}>✓</span>}
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

                    {/* 交換は、担当が1つの人どうしでだけ行う（まとめた担当の交換は未対応） */}
                    {isCurrent && isMine && entry.duties.length === 1 && (
                      <SwapRequestForm
                        weekStartDate={currentWeekStart}
                        myDutyTypeKey={entry.duties[0].key as DutyKey}
                        candidates={week.entries
                          .filter((e) => e.roomNumber !== room)
                          .map((e) => {
                            const m = memberByRoom.get(e.roomNumber);
                            if (!m || e.duties.length !== 1) return null;
                            return {
                              room: e.roomNumber,
                              memberId: m.id,
                              memberName: m.name,
                              dutyKey: e.duties[0].key as DutyKey,
                            };
                          })
                          .filter((v): v is NonNullable<typeof v> => v !== null)}
                      />
                    )}

                    {isCurrent &&
                      isRestMember &&
                      !isMine &&
                      roomMember &&
                      dutyStatuses
                        .filter((d) => !d.done)
                        .map(({ duty }) => (
                          <div key={duty.id}>
                            <SubstituteButton
                              weekStartDate={currentWeekStart}
                              originalMemberId={roomMember.id}
                              dutyTypeKey={duty.key}
                            />
                          </div>
                        ))}
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
