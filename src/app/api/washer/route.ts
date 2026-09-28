import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { sendPushToHouse } from "@/lib/push/send";
import { pushMessages, localize } from "@/lib/push/messages";

// action: "start" | "finish"
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { action, expectedEndAt } = (await request.json()) as {
    action: "start" | "finish";
    expectedEndAt?: string | null;
  };

  const supabase = await createClient();

  if (action === "start") {
    const { error } = await supabase
      .from("washer_status")
      .update({
        status: "in_use",
        used_by: ctx.member.id,
        started_at: new Date().toISOString(),
        expected_end_at: expectedEndAt ?? null,
        reminder_sent: false,
        updated_at: new Date().toISOString(),
      })
      .eq("house_id", ctx.house.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "finish") {
    const { error } = await supabase
      .from("washer_status")
      .update({
        status: "idle",
        used_by: null,
        started_at: null,
        expected_end_at: null,
        reminder_sent: false,
        updated_at: new Date().toISOString(),
      })
      .eq("house_id", ctx.house.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 空いたことを全員に通知（自分以外）
    await sendPushToHouse(supabase, ctx.house.id, localize(pushMessages.washerAvailable()), ctx.member.id);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
