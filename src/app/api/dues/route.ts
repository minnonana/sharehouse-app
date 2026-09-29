import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 今月の共用費を「払った」と自己チェックする
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { year, month, paid } = (await request.json()) as {
    year: number;
    month: number;
    paid: boolean;
  };

  const supabase = await createClient();
  const { data: due, error } = await supabase
    .from("monthly_dues")
    .upsert(
      {
        house_id: ctx.house.id,
        member_id: ctx.member.id,
        year,
        month,
        paid,
        paid_at: paid ? new Date().toISOString() : null,
      },
      { onConflict: "house_id,member_id,year,month" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ due });
}
