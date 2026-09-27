import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 当番の交換リクエストを作成する。
// from: 自分の当番（まだ割り当てレコードが無ければ作成される）
// to: 交換したい相手の当番
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { weekStartDate, myDutyTypeKey, targetMemberId, targetDutyTypeKey } =
    (await request.json()) as {
      weekStartDate: string;
      myDutyTypeKey: string;
      targetMemberId: string;
      targetDutyTypeKey: string;
    };

  const supabase = await createClient();

  const { data: dutyTypes } = await supabase
    .from("duty_types")
    .select("id, key")
    .eq("house_id", ctx.house.id)
    .in("key", [myDutyTypeKey, targetDutyTypeKey]);

  const myDutyType = dutyTypes?.find((d) => d.key === myDutyTypeKey);
  const targetDutyType = dutyTypes?.find((d) => d.key === targetDutyTypeKey);

  if (!myDutyType || !targetDutyType) {
    return NextResponse.json({ error: "duty_type_not_found" }, { status: 404 });
  }

  const { data: fromAssignment } = await supabase
    .from("duty_assignments")
    .upsert(
      {
        house_id: ctx.house.id,
        week_start_date: weekStartDate,
        member_id: ctx.member.id,
        duty_type_id: myDutyType.id,
      },
      { onConflict: "house_id,week_start_date,member_id,duty_type_id", ignoreDuplicates: false },
    )
    .select()
    .single();

  const { data: toAssignment } = await supabase
    .from("duty_assignments")
    .upsert(
      {
        house_id: ctx.house.id,
        week_start_date: weekStartDate,
        member_id: targetMemberId,
        duty_type_id: targetDutyType.id,
      },
      { onConflict: "house_id,week_start_date,member_id,duty_type_id", ignoreDuplicates: false },
    )
    .select()
    .single();

  if (!fromAssignment || !toAssignment) {
    return NextResponse.json({ error: "assignment_lookup_failed" }, { status: 500 });
  }

  const { data: swapRequest, error } = await supabase
    .from("duty_swap_requests")
    .insert({
      house_id: ctx.house.id,
      from_assignment_id: fromAssignment.id,
      to_assignment_id: toAssignment.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ swapRequest });
}
