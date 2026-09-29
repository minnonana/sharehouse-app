import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { sendPushToHouse } from "@/lib/push/send";
import { localize, pushMessages } from "@/lib/push/messages";
import { translateText } from "@/lib/translate/translate";

// 買い物帳に新しい品目を追加する。品目名も日英を自動翻訳して保存する。
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { name, memo } = (await request.json()) as { name: string; memo?: string | null };
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return NextResponse.json({ error: "empty_name" }, { status: 400 });
  }

  const originalLang = ctx.member.display_language;
  const targetLang = originalLang === "ja" ? "en" : "ja";
  const translatedName = await translateText(trimmedName, targetLang);

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("shopping_items")
    .insert({
      house_id: ctx.house.id,
      name: trimmedName,
      name_ja: originalLang === "ja" ? trimmedName : translatedName,
      name_en: originalLang === "en" ? trimmedName : translatedName,
      memo: memo?.trim() || null,
      created_by: ctx.member.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendPushToHouse(
    supabase,
    ctx.house.id,
    localize(pushMessages.shoppingItemAdded(ctx.member.name, trimmedName)),
    ctx.member.id,
  );

  return NextResponse.json({ item });
}
