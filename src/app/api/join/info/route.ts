import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 招待コードから、参加先のハウス名と選べる部屋番号を返す（参加画面の部屋の選択肢に使う）
export async function POST(request: Request) {
  const { code } = (await request.json()) as { code: string };
  if (!/^[0-9]{6}$/.test(code ?? "")) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_join_info", { p_code: code });
  const rows = (data ?? []) as { house_name: string; room_number: string; occupied: boolean }[];

  if (error || rows.length === 0) {
    return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    houseName: rows[0].house_name,
    rooms: rows.map((r) => ({ roomNumber: r.room_number, occupied: r.occupied })),
  });
}
