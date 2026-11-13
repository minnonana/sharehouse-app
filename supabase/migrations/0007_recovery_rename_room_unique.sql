-- 土台の安定化（docs/plan-dorms.md の手順1）
-- 1. 代表者が、ログインが切れた住人の引き継ぎ（復旧）コードを発行できる
-- 2. 入居中の住人は1部屋1人まで（部屋の二重登録を防ぐ）

-- 代表者（または本人）が、指定した住人の引き継ぎコードを発行する。
-- handover_codes のINSERTポリシーは「自分の分だけ」なので、他人の分は
-- SECURITY DEFINER 関数の中で、同じハウスの代表者であることを確認してから発行する。
create or replace function issue_handover_code_for(p_member_id uuid)
returns handover_codes
language plpgsql
security definer
as $$
declare
  v_house_id uuid;
  v_allowed boolean;
  v_code text;
  v_row handover_codes;
begin
  select house_id into v_house_id
  from members where id = p_member_id and left_at is null;

  if v_house_id is null then
    raise exception 'member_not_found_or_left';
  end if;

  select exists (
    select 1 from members
    where auth_user_id = auth.uid() and left_at is null
      and house_id = v_house_id
      and (is_owner or id = p_member_id)
  ) into v_allowed;

  if not v_allowed then
    raise exception 'forbidden';
  end if;

  for i in 1..10 loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into handover_codes (member_id, code, expires_at)
      values (p_member_id, v_code, now() + interval '24 hours')
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      -- コードが重複したら引き直す
    end;
  end loop;

  raise exception 'issue_failed';
end;
$$;

-- 入居中（left_at が空）の住人は、同じハウスの同じ部屋に1人まで。
-- 参加前の人には他の住人の行が見えず、アプリ側の確認では防げないため、DBで保証する。
create unique index if not exists uniq_members_house_room_active
  on members (house_id, room_number)
  where left_at is null;
