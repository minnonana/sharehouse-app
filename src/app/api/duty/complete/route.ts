import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 自分の当番を「完了」にする
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { weekStartDate, dutyTypeKey, photoUrl } = (await request.json()) as {
    weekStartDate: string;
    dutyTypeKey: string;
    photoUrl?: string | null;
  };

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

  // その週の割り当てレコードがまだなければ作成し、完了にする（upsert）
  const { error } = await supabase.from("duty_assignments").upsert(
    {
      house_id: ctx.house.id,
      week_start_date: weekStartDate,
      member_id: ctx.member.id,
      duty_type_id: dutyType.id,
      status: "done",
      completed_at: new Date().toISOString(),
      photo_url: photoUrl ?? null,
    },
    { onConflict: "house_id,week_start_date,member_id,duty_type_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
