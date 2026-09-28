-- シェアハウス共用アプリ 第2段階: プッシュ通知(Web Push)
-- 対象: push_subscriptions / notification_log

-- =========================================================
-- push_subscriptions: 端末ごとのWeb Push購読情報
-- =========================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_member on push_subscriptions(member_id);

-- =========================================================
-- notification_log: 定時通知の二重送信を防ぐための送信済み記録
-- key の例: "trash_evening:2026-09-28:member_id" のように
-- 「通知の種類 + 対象日 + 対象member」を組み合わせた一意な文字列にする
-- =========================================================
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references houses(id) on delete cascade,
  key text not null,
  created_at timestamptz not null default now(),
  unique (house_id, key)
);

alter table push_subscriptions enable row level security;
alter table notification_log enable row level security;

create policy "select own push subscriptions" on push_subscriptions
  for select using (member_id = (select auth_member_id()));
create policy "manage own push subscriptions" on push_subscriptions
  for all using (member_id = (select auth_member_id()))
  with check (member_id = (select auth_member_id()));

-- notification_log はサーバー(Edge Function)からのみ読み書きする想定だが、
-- 通常のクライアントからは読み書きさせない
create policy "no client access to notification log" on notification_log
  for all using (false) with check (false);

grant select, insert, update, delete on push_subscriptions to anon, authenticated;

-- =========================================================
-- 通知送信用のヘルパー関数（SECURITY DEFINER）
--
-- 「掲示板の重要投稿を全員に通知する」のように、送信者が自分以外の
-- メンバーの購読情報を読む必要がある操作は、push_subscriptions の
-- 通常のRLS（自分の購読だけ見れる）では実現できない。
-- そのため、呼び出し元が同じハウスのメンバーであることを関数内で
-- 確認した上で、必要な範囲だけを返す関数を用意する。
-- =========================================================
-- display_language も一緒に返すことで、通知文面を各自の表示言語に出し分けられるようにする
create or replace function get_push_subscriptions_for_house(
  p_house_id uuid,
  p_exclude_member_id uuid default null
)
returns table (member_id uuid, endpoint text, p256dh text, auth text, display_language text)
language sql
security definer
stable
as $$
  select s.member_id, s.endpoint, s.p256dh, s.auth, m.display_language
  from push_subscriptions s
  join members m on m.id = s.member_id
  where s.house_id = p_house_id
    and s.enabled = true
    and (p_exclude_member_id is null or s.member_id <> p_exclude_member_id)
    and p_house_id in (select auth_house_ids()); -- 呼び出し元が同じハウスの所属者であることを確認
$$;

create or replace function get_push_subscriptions_for_member(
  p_member_id uuid
)
returns table (endpoint text, p256dh text, auth text, display_language text)
language sql
security definer
stable
as $$
  select s.endpoint, s.p256dh, s.auth, m.display_language
  from push_subscriptions s
  join members m on m.id = s.member_id
  where s.member_id = p_member_id
    and s.enabled = true
    and s.house_id in (select auth_house_ids()); -- 呼び出し元が同じハウスの所属者であることを確認
$$;

-- 送信に失敗した(410 Goneなど)購読を無効化する。他人の購読行でも無効化できる必要がある。
create or replace function disable_push_subscription(p_endpoint text)
returns void
language sql
security definer
as $$
  update push_subscriptions set enabled = false where endpoint = p_endpoint;
$$;
