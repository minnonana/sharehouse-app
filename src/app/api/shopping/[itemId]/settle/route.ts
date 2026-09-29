import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 会計担当が「精算済み」にする。
// 仕様書では「会計担当を誰にするか」は未決事項のため、代表者(is_owner)を会計担当扱いにしている。
export async function POST(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!ctx.member.is_owner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { itemId } = await params;
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("shopping_items")
    .update({ status: "settled", settled_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("house_id", ctx.house.id)
    .eq("status", "done")
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "not_found_or_not_done" }, { status: 409 });
  }

  return NextResponse.json({ item });
}
