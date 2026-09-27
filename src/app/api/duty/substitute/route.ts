import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { getRoomForDuty } from "@/lib/duty/rotation";

// その週「休み」の人が、不在・未完了の当番を代行する。
// 代行した人には substitutions レコードで「貸し」を記録する。
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { weekStartDate, originalMemberId, dutyTypeKey } = (await request.json()) as {
    weekStartDate: string;
    originalMemberId: string;
    dutyTypeKey: string;
  };

  // 代行できるのは、その週「休み」の部屋の人だけ
  const restRoom = getRoomForDuty(weekStartDate, "rest");
  if (ctx.member.room_number !== restRoom) {
    return NextResponse.json({ error: "not_this_weeks_rest_member" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: dutyType } = await supabase
    .from("duty_types")
    .select("id")
    .eq("house_id", ctx.house.id)
    .eq("key", dutyTypeKey)
    .maybeSingle();

  if (!dutyType) {
    return NextResponse.json({ error: "duty_type_not_found" }, { status: 404 });
  }

  const { data: assignment, error: upsertError } = await supabase
    .from("duty_assignments")
    .upsert(
      {
        house_id: ctx.house.id,
        week_start_date: weekStartDate,
        member_id: originalMemberId,
        duty_type_id: dutyType.id,
        status: "done",
        completed_at: new Date().toISOString(),
        covered_by: ctx.member.id,
      },
      { onConflict: "house_id,week_start_date,member_id,duty_type_id" },
    )
    .select()
    .single();

  if (upsertError || !assignment) {
    return NextResponse.json({ error: upsertError?.message ?? "failed" }, { status: 500 });
  }

  const { error: subError } = await supabase.from("substitutions").insert({
    house_id: ctx.house.id,
    duty_assignment_id: assignment.id,
    covering_member_id: ctx.member.id,
    original_member_id: originalMemberId,
  });

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
