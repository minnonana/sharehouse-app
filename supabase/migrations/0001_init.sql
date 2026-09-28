-- シェアハウス共用アプリ 初期スキーマ（第1段階）
-- 対象: houses / members / invite_codes / handover_codes
--       duty_types / duty_assignments / duty_swap_requests / absences / substitutions
--       washer_status / board_posts / board_post_reads

create extension if not exists "pgcrypto";

-- =========================================================
-- houses: ハウス本体
-- =========================================================
create table if not exists houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- members: 住人（Supabase匿名ログインの auth.users と1:1）
-- =========================================================
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  room_number text not null,
  display_language text not null default 'ja' check (display_language in ('ja', 'en')),
  is_owner boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create index if not exists idx_members_house on members(house_id);

-- =========================================================
-- invite_codes: 招待コード（6桁・7日間有効）
-- =========================================================
create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references members(id),
  expires_at timestamptz not null,
  used_by uuid references members(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- handover_codes: 引き継ぎコード（機種変更用・24時間有効）
-- =========================================================
create table if not exists handover_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- duty_types: 掃除・ゴミ当番の担当種類（設定画面で編集可）
-- =========================================================
create table if not exists duty_types (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  key text not null, -- 'kitchen_1f' 等の識別子
  label_ja text not null,
  label_en text not null,
  short_label text not null, -- 表示用の短い文字（例: K, T1, T2, G, M, Th, WF）
  category text not null default 'chore' check (category in ('chore', 'trash', 'rest')),
  color text not null default '#9A4B12',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (house_id, key)
);

-- =========================================================
-- duty_assignments: 週ごとの当番割り当て
-- =========================================================
create table if not exists duty_assignments (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  week_start_date date not null, -- その週の日曜日
  member_id uuid not null references members(id) on delete cascade,
  duty_type_id uuid not null references duty_types(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'done', 'incomplete')),
  completed_at timestamptz,
  photo_url text,
  covered_by uuid references members(id), -- 代行してくれた人
  created_at timestamptz not null default now(),
  unique (house_id, week_start_date, member_id, duty_type_id)
);

create index if not exists idx_duty_assignments_week on duty_assignments(house_id, week_start_date);

-- =========================================================
-- duty_swap_requests: 当番の交換リクエスト
-- =========================================================
create table if not exists duty_swap_requests (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  from_assignment_id uuid not null references duty_assignments(id) on delete cascade,
  to_assignment_id uuid not null references duty_assignments(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- =========================================================
-- absences: 不在期間の登録
-- =========================================================
create table if not exists absences (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- substitutions: 代行の「貸し」記録
-- =========================================================
create table if not exists substitutions (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  duty_assignment_id uuid not null references duty_assignments(id) on delete cascade,
  covering_member_id uuid not null references members(id),
  original_member_id uuid not null references members(id),
  created_at timestamptz not null default now()
);

-- =========================================================
-- washer_status: 洗濯機の状態（1台のみ、ハウスごとに1行運用）
-- =========================================================
create table if not exists washer_status (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null unique references houses(id) on delete cascade,
  status text not null default 'idle' check (status in ('idle', 'in_use')),
  used_by uuid references members(id),
  started_at timestamptz,
  expected_end_at timestamptz,
  reminder_sent boolean not null default false,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- board_posts: 掲示板の投稿
-- =========================================================
create table if not exists board_posts (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  author_id uuid not null references members(id),
  original_lang text not null check (original_lang in ('ja', 'en')),
  body_original text not null,
  body_ja text,
  body_en text,
  is_important boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_board_posts_house on board_posts(house_id, created_at desc);

-- =========================================================
-- board_post_reads: 既読管理
-- =========================================================
create table if not exists board_post_reads (
  post_id uuid not null references board_posts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

-- =========================================================
-- RLS: 自分のハウスのデータだけ読み書きできるようにする
-- =========================================================
alter table houses enable row level security;
alter table members enable row level security;
alter table invite_codes enable row level security;
alter table handover_codes enable row level security;
alter table duty_types enable row level security;
alter table duty_assignments enable row level security;
alter table duty_swap_requests enable row level security;
alter table absences enable row level security;
alter table substitutions enable row level security;
alter table washer_status enable row level security;
alter table board_posts enable row level security;
alter table board_post_reads enable row level security;

-- 自分が所属する house_id の一覧を返すヘルパー関数
create or replace function auth_house_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select house_id from members
  where auth_user_id = auth.uid() and left_at is null;
$$;

create or replace function auth_member_id()
returns uuid
language sql
security definer
stable
as $$
  select id from members
  where auth_user_id = auth.uid() and left_at is null
  limit 1;
$$;

-- 自分が代表者(is_owner)かどうかを返すヘルパー関数。
-- members テーブル自身のポリシーの中で「自分が代表者か」を判定する場合、
-- inline のサブクエリ（select ... from members ...）を直接書くと
-- 同じテーブルのポリシー評価を再帰的に呼び出してしまい
-- "infinite recursion detected in policy for relation members" になる。
-- SECURITY DEFINER 関数を経由することでこれを回避する。
create or replace function auth_is_owner()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from members
    where auth_user_id = auth.uid() and is_owner and left_at is null
  );
$$;

create policy "select own house" on houses
  for select using (id in (select auth_house_ids()));
-- 認証済み（匿名ログイン含む）であれば、代表者として新しいハウスを作成できる
create policy "create house" on houses
  for insert with check (true);

create policy "select members of own house" on members
  for select using (house_id in (select auth_house_ids()));
create policy "update own member row" on members
  for update using (auth_user_id = auth.uid());
-- ハウス作成・招待コード参加の直後に自分自身の住人レコードを作れるようにする
-- （招待コードそのものの有効性チェックはアプリケーション側で行う）
create policy "self insert member row" on members
  for insert with check (auth_user_id = auth.uid());
create policy "owners update members" on members
  for update using (
    house_id in (select auth_house_ids())
    and (select auth_is_owner())
  );

create policy "select invite codes of own house" on invite_codes
  for select using (house_id in (select auth_house_ids()));
-- 参加前のユーザーが招待コードの有効性を確認できるように、未使用・期限内のコードは誰でも参照できる
create policy "select unused invite codes to join" on invite_codes
  for select using (used_by is null and expires_at > now());
create policy "owners issue invite codes" on invite_codes
  for insert with check (
    house_id in (
      select m.house_id from members m
      where m.auth_user_id = auth.uid() and m.is_owner and m.left_at is null
    )
  );
create policy "owners delete invite codes" on invite_codes
  for delete using (
    house_id in (
      select m.house_id from members m
      where m.auth_user_id = auth.uid() and m.is_owner and m.left_at is null
    )
  );
-- 参加処理の最後に、参加したばかりの本人がそのコードを使用済みにできる
create policy "consume invite code on join" on invite_codes
  for update using (used_by is null and expires_at > now())
  with check (used_by = (select auth_member_id()));

create policy "select own handover codes" on handover_codes
  for select using (member_id = (select auth_member_id()));
create policy "manage own handover codes" on handover_codes
  for all using (member_id = (select auth_member_id()));

create policy "select duty types of own house" on duty_types
  for select using (house_id in (select auth_house_ids()));
create policy "owners manage duty types" on duty_types
  for insert with check (
    house_id in (select m.house_id from members m where m.auth_user_id = auth.uid() and m.is_owner and m.left_at is null)
  );
create policy "owners update duty types" on duty_types
  for update using (
    house_id in (select m.house_id from members m where m.auth_user_id = auth.uid() and m.is_owner and m.left_at is null)
  );
create policy "owners delete duty types" on duty_types
  for delete using (
    house_id in (select m.house_id from members m where m.auth_user_id = auth.uid() and m.is_owner and m.left_at is null)
  );

create policy "select duty assignments of own house" on duty_assignments
  for select using (house_id in (select auth_house_ids()));
create policy "members update duty assignments in own house" on duty_assignments
  for update using (house_id in (select auth_house_ids()));
create policy "members insert own duty assignments" on duty_assignments
  for insert with check (
    house_id in (select auth_house_ids())
    and (
      member_id = (select auth_member_id())
      or covered_by = (select auth_member_id()) -- 代行登録: 代行する本人が代わりに作成する
      or house_id in (select m.house_id from members m where m.auth_user_id = auth.uid() and m.is_owner and m.left_at is null)
    )
  );

create policy "select swap requests of own house" on duty_swap_requests
  for select using (house_id in (select auth_house_ids()));
create policy "members manage swap requests in own house" on duty_swap_requests
  for all using (house_id in (select auth_house_ids()));

create policy "select absences of own house" on absences
  for select using (house_id in (select auth_house_ids()));
create policy "members manage own absences" on absences
  for all using (house_id in (select auth_house_ids()) and member_id = (select auth_member_id()));

create policy "select substitutions of own house" on substitutions
  for select using (house_id in (select auth_house_ids()));
create policy "members insert substitutions in own house" on substitutions
  for insert with check (house_id in (select auth_house_ids()));

create policy "select washer status of own house" on washer_status
  for select using (house_id in (select auth_house_ids()));
create policy "members update washer status in own house" on washer_status
  for update using (house_id in (select auth_house_ids()));
create policy "members insert washer status in own house" on washer_status
  for insert with check (house_id in (select auth_house_ids()));

create policy "select board posts of own house" on board_posts
  for select using (house_id in (select auth_house_ids()));
create policy "members insert board posts in own house" on board_posts
  for insert with check (house_id in (select auth_house_ids()));

create policy "select board post reads of own house" on board_post_reads
  for select using (
    post_id in (select id from board_posts where house_id in (select auth_house_ids()))
  );
create policy "members insert own board post reads" on board_post_reads
  for insert with check (member_id = (select auth_member_id()));

-- =========================================================
-- 権限付与: SQL Editor で直接テーブルを作成した場合、
-- anon / authenticated ロールへの GRANT が自動では行われないため明示する。
-- （実際のアクセス制御は上記の RLS ポリシーが担う）
-- =========================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
