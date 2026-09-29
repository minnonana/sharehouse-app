import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { sendPushToMember } from "@/lib/push/send";
import { localize, pushMessages } from "@/lib/push/messages";

// 「行けるよ」: 最初に押した1人が担当になる
export async function POST(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { itemId } = await params;
  const supabase = await createClient();

  // pending の場合だけ更新できるようにし、二重に担当がつくのを防ぐ
  const { data: item, error } = await supabase
    .from("shopping_items")
    .update({ status: "in_progress", assignee_id: ctx.member.id, claimed_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("house_id", ctx.house.id)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "already_claimed_or_not_found" }, { status: 409 });
  }

  await sendPushToMember(
    supabase,
    item.created_by,
    localize(pushMessages.shoppingItemClaimed(ctx.member.name, item.name)),
  );

  return NextResponse.json({ item });
}
