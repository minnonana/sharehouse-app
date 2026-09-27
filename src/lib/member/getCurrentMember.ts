import { createClient } from "@/lib/supabase/server";
import type { House, Member } from "@/types/database";

export interface CurrentMemberContext {
  member: Member;
  house: House;
}

/** 現在ログイン中（匿名ログイン含む）のユーザーに紐づく住人情報を返す。未参加なら null */
export async function getCurrentMember(): Promise<CurrentMemberContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!member) return null;

  const { data: house } = await supabase
    .from("houses")
    .select("*")
    .eq("id", member.house_id)
    .maybeSingle();

  if (!house) return null;

  return { member, house };
}
