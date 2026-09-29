-- 第1段階の残り: 引き継ぎコード（機種変更）・退去処理

-- 新しい端末（まだ住人データに紐づいていない匿名ユーザー）が
-- 引き継ぎコードを検証できるように、未使用・期限内のコードは誰でも参照できるようにする
create policy "select unused handover codes to redeem" on handover_codes
  for select using (used_at is null and expires_at > now());

-- 引き継ぎコードを検証し、対象の members 行の auth_user_id を
-- 新しい端末のユーザーに付け替える。
-- 呼び出し元の auth_user_id への更新であること以外はコード自体が正当性を保証するため
-- SECURITY DEFINER で auth_user_id の書き換えという通常のRLSでは許可されない操作を行う。
create or replace function redeem_handover_code(p_code text, p_new_auth_user_id uuid)
returns members
language plpgsql
security definer
as $$
declare
  v_handover handover_codes;
  v_member members;
begin
  select * into v_handover from handover_codes
  where code = p_code and used_at is null and expires_at > now()
  limit 1;

  if v_handover is null then
    raise exception 'invalid_or_expired_code';
  end if;

  update members
  set auth_user_id = p_new_auth_user_id
  where id = v_handover.member_id and left_at is null
  returning * into v_member;

  if v_member is null then
    raise exception 'member_not_found_or_left';
  end if;

  update handover_codes set used_at = now() where id = v_handover.id;

  return v_member;
end;
$$;

-- =========================================================
-- 退去処理: 代表者がメンバーを退去させる（left_at をセット）。
-- 代表者は常に2人以上、というアプリ側の制約をDB側でも保証する。
-- =========================================================
create or replace function leave_member(p_member_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_house_id uuid;
  v_is_owner boolean;
  v_caller_is_owner boolean;
  v_owner_count int;
begin
  select house_id, is_owner into v_house_id, v_is_owner
  from members where id = p_member_id and left_at is null;

  if v_house_id is null then
    raise exception 'member_not_found';
  end if;

  -- 呼び出し元が同じハウスの代表者であること、または本人であることを確認
  select exists (
    select 1 from members
    where auth_user_id = auth.uid() and house_id = v_house_id and is_owner and left_at is null
  ) into v_caller_is_owner;

  if not v_caller_is_owner and not exists (
    select 1 from members where id = p_member_id and auth_user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  if v_is_owner then
    select count(*) into v_owner_count from members
    where house_id = v_house_id and is_owner and left_at is null;

    if v_owner_count <= 2 then
      raise exception 'owner_count_would_drop_below_two';
    end if;
  end if;

  update members set left_at = now() where id = p_member_id;
end;
$$;
