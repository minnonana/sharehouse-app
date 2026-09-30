import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { House, Member } from "@/types/database";

export interface CurrentMemberContext {
  member: Member;
  house: House;
}

/**
 * 現在ログイン中（匿名ログイン含む）のユーザーに紐づく住人情報を返す。未参加なら null。
 *
 * - member と house を1回のクエリ（外部キーのembed）にまとめ、Supabaseへの往復を減らす。
 * - React の cache() でリクエスト単位にメモ化し、同じリクエスト内で
 *   layout とページの両方から呼ばれても実際の問い合わせは1回だけにする
 *   （これをしないと layout→page で毎回2重に auth+DB 往復が発生し、画面遷移が体感で遅くなる）。
 */
export const getCurrentMember = cache(async (): Promise<CurrentMemberContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("members")
    .select("*, house:houses(*)")
    .eq("auth_user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!member) return null;

  const { house, ...memberRest } = member as Member & { house: House | null };
  if (!house) return null;

  return { member: memberRest as Member, house };
});
