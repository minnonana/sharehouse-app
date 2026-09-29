import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { sendPushToHouse } from "@/lib/push/send";
import { localize, pushMessages } from "@/lib/push/messages";

// 買い物帳に新しい品目を追加する
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { name, memo } = (await request.json()) as { name: string; memo?: string | null };
  if (!name?.trim()) {
    return NextResponse.json({ error: "empty_name" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("shopping_items")
    .insert({
      house_id: ctx.house.id,
      name: name.trim(),
      memo: memo?.trim() || null,
      created_by: ctx.member.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendPushToHouse(
    supabase,
    ctx.house.id,
    localize(pushMessages.shoppingItemAdded(ctx.member.name, name.trim())),
    ctx.member.id,
  );

  return NextResponse.json({ item });
}
