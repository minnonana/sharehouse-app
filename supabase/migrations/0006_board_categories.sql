-- 掲示板にカテゴリ分けを追加する
-- rule: ルールについて, guest: 来客について, repair: 修理・工事について, other: その他

alter table board_posts add column if not exists category text not null default 'other'
  check (category in ('rule', 'guest', 'repair', 'other'));

create index if not exists idx_board_posts_category on board_posts(house_id, category, created_at desc);
