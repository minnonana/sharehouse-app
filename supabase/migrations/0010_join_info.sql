-- 参加前の人が、招待コードから「どのハウスか」「どの部屋が選べるか」を知るための関数。
-- 参加前は rooms / members が見えない（RLS）ため、有効な招待コードを持っている場合に限って
-- ハウス名と部屋番号、埋まっているかどうかだけを返す。
create or replace function get_join_info(p_code text)
returns table (house_name text, dorm_type text, room_id uuid, room_number text, occupied boolean)
language sql
security definer
stable
as $$
  select
    h.name,
    h.dorm_type,
    r.id,
    r.room_number,
    exists (
      select 1 from members m
      where m.house_id = h.id and m.room_number = r.room_number and m.left_at is null
    )
  from invite_codes c
  join houses h on h.id = c.house_id
  join rooms r on r.house_id = h.id
  where c.code = p_code and c.used_by is null and c.expires_at > now() and not r.is_vacant
  order by r.sort_order;
$$;
