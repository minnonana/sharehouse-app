import type { PlanDuty, RoomRow, RotationRow } from "./plan";

// supabase-js のクライアント（Database 型は any）。ここでは必要なメソッドだけ使う
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

/** 当番表の組み立てに必要な3つの表を、並列でまとめて読む */
export async function loadPlanData(
  supabase: Client,
  houseId: string,
): Promise<{ rooms: RoomRow[]; duties: PlanDuty[]; rotations: RotationRow[] }> {
  const [{ data: rooms }, { data: duties }, { data: rotations }] = await Promise.all([
    supabase.from("rooms").select("*").eq("house_id", houseId).order("sort_order"),
    supabase.from("duty_types").select("*").eq("house_id", houseId).order("sort_order"),
    supabase.from("duty_rotations").select("starts_on, room_ids, slots").eq("house_id", houseId),
  ]);
  return {
    rooms: (rooms ?? []) as RoomRow[],
    duties: (duties ?? []) as PlanDuty[],
    rotations: (rotations ?? []) as RotationRow[],
  };
}
