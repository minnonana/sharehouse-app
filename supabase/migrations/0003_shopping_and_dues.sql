-- シェアハウス共用アプリ 第3段階: 買い物帳・共用費
-- 対象: shopping_items / monthly_dues

-- =========================================================
-- shopping_items: 買い物帳
-- 状態: pending(未対応) -> in_progress(担当中) -> done(完了) -> settled(精算済み)
-- =========================================================
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  name text not null,
  memo text,
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'settled')),
  created_by uuid not null references members(id),
  assignee_id uuid references members(id),
  amount_yen int,
  receipt_photo_url text,
  claimed_at timestamptz,
  completed_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_shopping_items_house on shopping_items(house_id, created_at desc);

-- =========================================================
-- monthly_dues: 毎月の共用費(1人500円)の自己チェック
-- =========================================================
create table if not exists monthly_dues (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount_yen int not null default 500,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (house_id, member_id, year, month)
);

alter table shopping_items enable row level security;
alter table monthly_dues enable row level security;

create policy "select shopping items of own house" on shopping_items
  for select using (house_id in (select auth_house_ids()));
create policy "members insert shopping items in own house" on shopping_items
  for insert with check (house_id in (select auth_house_ids()));
create policy "members update shopping items in own house" on shopping_items
  for update using (house_id in (select auth_house_ids()));

create policy "select monthly dues of own house" on monthly_dues
  for select using (house_id in (select auth_house_ids()));
create policy "members upsert own monthly dues" on monthly_dues
  for insert with check (
    house_id in (select auth_house_ids()) and member_id = (select auth_member_id())
  );
create policy "members update own monthly dues" on monthly_dues
  for update using (
    house_id in (select auth_house_ids()) and member_id = (select auth_member_id())
  );

grant select, insert, update, delete on shopping_items, monthly_dues to anon, authenticated;
