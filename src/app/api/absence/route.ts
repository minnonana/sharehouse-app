import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 不在期間を登録する
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { startDate, endDate } = (await request.json()) as {
    startDate: string;
    endDate: string;
  };

  if (!startDate || !endDate || startDate > endDate) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("absences")
    .insert({
      house_id: ctx.house.id,
      member_id: ctx.member.id,
      start_date: startDate,
      end_date: endDate,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ absence: data });
}
