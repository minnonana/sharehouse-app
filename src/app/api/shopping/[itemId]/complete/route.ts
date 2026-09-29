import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 買った人が「完了」を押して金額を入力する
export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { itemId } = await params;
  const { amountYen, receiptPhotoUrl } = (await request.json()) as {
    amountYen: number;
    receiptPhotoUrl?: string | null;
  };

  if (!Number.isFinite(amountYen) || amountYen <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("shopping_items")
    .update({
      status: "done",
      amount_yen: Math.round(amountYen),
      receipt_photo_url: receiptPhotoUrl ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("house_id", ctx.house.id)
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: error?.message ?? "not_found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}
