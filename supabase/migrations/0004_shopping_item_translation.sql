-- 買い物帳の品目名も掲示板と同様に日英を自動翻訳して保存できるようにする

alter table shopping_items add column if not exists name_ja text;
alter table shopping_items add column if not exists name_en text;

-- 既存データは翻訳できないので、とりあえず原文をそのまま両言語欄にコピーしておく
update shopping_items set name_ja = coalesce(name_ja, name), name_en = coalesce(name_en, name);
