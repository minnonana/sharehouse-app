import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 掲示板への投稿を作成する。
// 翻訳は第3段階で自動翻訳APIに差し替える前提のプレースホルダー実装
// （今は原文をそのまま両言語欄にコピーしておく）。
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

  const { data: post, error } = await supabase
    .from("board_posts")
    .insert({
      house_id: ctx.house.id,
      author_id: ctx.member.id,
      original_lang: originalLang,
      body_original: body,
      // TODO(第3段階): 自動翻訳APIに置き換える
      body_ja: originalLang === "ja" ? body : null,
      body_en: originalLang === "en" ? body : null,
      is_important: !!isImportant,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post });
}
