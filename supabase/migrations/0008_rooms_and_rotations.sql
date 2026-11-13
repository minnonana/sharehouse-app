-- 先魁・北溟対応（docs/plan-dorms.md の手順2）: 部屋と、当番の組み方の区切りを表で持つ。
-- このマイグレーションは「追加」だけを行う。今の画面はまだ従来の計算で動くので、
-- 実行しても当番表の表示は変わらない。

-- 寮の種類（担当のひな形と、代表者の確認が必要になる人数の判定に使う）
alter table houses add column if not exists dorm_type text not null default 'sakigake'
  check (dorm_type in ('sakigake', 'hokumei'));

-- =========================================================
-- rooms: ユニットの部屋。空室かどうかは代表者が切り替える
-- =========================================================
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  room_number text not null,
  is_vacant boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (house_id, room_number)
);

alter table rooms enable row level security;

create policy "select rooms of own house" on rooms
  for select using (house_id in (select auth_house_ids()));
create policy "owners insert rooms" on rooms
  for insert with check (house_id in (select auth_house_ids()) and (select auth_is_owner()));
create policy "owners update rooms" on rooms
  for update using (house_id in (select auth_house_ids()) and (select auth_is_owner()));
create policy "owners delete rooms" on rooms
  for delete using (house_id in (select auth_house_ids()) and (select auth_is_owner()));

-- 住人と部屋のひも付け（room_number は当面そのまま残す）
alter table members add column if not exists room_id uuid references rooms(id);

-- 人数が足りないときの担当のまとめ方（代表者があとから変えられる）
alter table duty_types add column if not exists merge_into_id uuid references duty_types(id) on delete set null;
alter table duty_types add column if not exists merge_order int;

-- =========================================================
-- duty_rotations: 「いつから、どの部屋で、どの担当で回すか」の区切り
--   room_ids: 回す部屋（入居中）の並び
--   slots:    1週目に各部屋が受け持つ担当。[[担当id, ...], ...]。空の配列は「休み」。
--             毎週、部屋ごとに1つ前の枠へずれていく。
-- =========================================================
create table if not exists duty_rotations (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  starts_on date not null, -- 日曜日
  room_ids uuid[] not null,
  slots jsonb not null,
  confirmed_by uuid references members(id),
  created_at timestamptz not null default now(),
  unique (house_id, starts_on)
);

alter table duty_rotations enable row level security;

create policy "select duty rotations of own house" on duty_rotations
  for select using (house_id in (select auth_house_ids()));
create policy "owners insert duty rotations" on duty_rotations
  for insert with check (house_id in (select auth_house_ids()) and (select auth_is_owner()));
create policy "owners update duty rotations" on duty_rotations
  for update using (house_id in (select auth_house_ids()) and (select auth_is_owner()));
create policy "owners delete duty rotations" on duty_rotations
  for delete using (house_id in (select auth_house_ids()) and (select auth_is_owner()));

-- =========================================================
-- 今あるハウスを、今と同じ値で移す（111〜118、基準週 2026-09-27、7担当＋休み）
-- =========================================================
insert into rooms (house_id, room_number, sort_order)
select h.id, r.room_number, r.sort_order
from houses h
cross join (
  values ('111', 0), ('112', 1), ('113', 2), ('114', 3), ('115', 4), ('116', 5), ('117', 6), ('118', 7)
) as r(room_number, sort_order)
on conflict (house_id, room_number) do nothing;

update members m
set room_id = r.id
from rooms r
where r.house_id = m.house_id and r.room_number = m.room_number and m.room_id is null;

-- まとめ方の初期値（先魁の案）: 玄関→2Fトイレ、水金→木のゴミ、月のゴミ→木のゴミ、
-- 2Fトイレ→1Fトイレ、1Fトイレ→1Fキッチン、木のゴミ→1Fキッチン の順
update duty_types d
set merge_into_id = t.id, merge_order = v.merge_order
from (
  values
    ('entrance', 'toilet_2f', 1),
    ('wed_fri', 'thu_trash', 2),
    ('mon_trash', 'thu_trash', 3),
    ('toilet_2f', 'toilet_1f', 4),
    ('toilet_1f', 'kitchen_1f', 5),
    ('thu_trash', 'kitchen_1f', 6)
) as v(from_key, into_key, merge_order),
duty_types t
where d.key = v.from_key and t.key = v.into_key and t.house_id = d.house_id
  and d.merge_order is null;

insert into duty_rotations (house_id, starts_on, room_ids, slots)
select
  h.id,
  date '2026-09-27',
  (select array_agg(r.id order by r.sort_order) from rooms r where r.house_id = h.id),
  (
    select jsonb_agg(
      case when d.key = 'rest' then '[]'::jsonb else jsonb_build_array(d.id) end
      order by d.sort_order
    )
    from duty_types d where d.house_id = h.id
  )
from houses h
where exists (select 1 from duty_types d where d.house_id = h.id)
on conflict (house_id, starts_on) do nothing;
