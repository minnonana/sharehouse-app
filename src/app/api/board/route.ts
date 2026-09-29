import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { sendPushToHouse } from "@/lib/push/send";
import { pushMessages, localize } from "@/lib/push/messages";
import { translateText } from "@/lib/translate/translate";

// 掲示板への投稿を作成する。日本語⇄英語を自動翻訳して両方保存する。
export async function POST(request: Request) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { body, isImportant } = (await request.json()) as {
    body: string;
    isImportant: boolean;
  };

  if (!body?.trim()) {
    return NextResponse.json({ error: "empty_body" }, { status: 400 });
  }

  const supabase = await createClient();
  const originalLang = ctx.member.display_language;
  const targetLang = originalLang === "ja" ? "en" : "ja";
  const translated = await translateText(body, targetLang);

  const { data: post, error } = await supabase
    .from("board_posts")
    .insert({
      house_id: ctx.house.id,
      author_id: ctx.member.id,
      original_lang: originalLang,
      body_original: body,
      body_ja: originalLang === "ja" ? body : translated,
      body_en: originalLang === "en" ? body : translated,
      is_important: !!isImportant,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isImportant) {
    // 重要な連絡は投稿した瞬間に全員へ通知（自分以外）
    await sendPushToHouse(
      supabase,
      ctx.house.id,
      localize(pushMessages.boardImportant(ctx.member.name, body)),
      ctx.member.id,
    );
  }

  return NextResponse.json({ post });
}
