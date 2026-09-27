import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

// 交換リクエストの相手（to_assignment の当人）が承諾／却下する
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getCurrentMember();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const { action } = (await request.json()) as { action: "accept" | "decline" };

  const supabase = await createClient();

  const { data: swapRequest } = await supabase
    .from("duty_swap_requests")
    .select("*, from_assignment:from_assignment_id(*), to_assignment:to_assignment_id(*)")
    .eq("id", id)
    .maybeSingle();

  if (!swapRequest) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (swapRequest.status !== "pending") {
    return NextResponse.json({ error: "already_responded" }, { status: 409 });
  }

  const toAssignment = swapRequest.to_assignment as { member_id: string };
  if (toAssignment.member_id !== ctx.member.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action === "decline") {
    await supabase
      .from("duty_swap_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  }

  const fromAssignment = swapRequest.from_assignment as { id: string; duty_type_id: string };
  const to = swapRequest.to_assignment as { id: string; duty_type_id: string };

  const { error: e1 } = await supabase
    .from("duty_assignments")
    .update({ duty_type_id: to.duty_type_id })
    .eq("id", fromAssignment.id);
  const { error: e2 } = await supabase
    .from("duty_assignments")
    .update({ duty_type_id: fromAssignment.duty_type_id })
    .eq("id", to.id);

  if (e1 || e2) {
    return NextResponse.json({ error: (e1 ?? e2)?.message }, { status: 500 });
  }

  await supabase
    .from("duty_swap_requests")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
