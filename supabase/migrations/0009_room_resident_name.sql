-- アプリに未参加の住人の名前を、部屋に登録できるようにする。
-- 当番表では、その部屋にアプリの参加者がいないときに、この名前を表示する
-- （参加者がいるときは、参加者の名前が優先）。
alter table rooms add column if not exists resident_name text;
