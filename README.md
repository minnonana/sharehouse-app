# シェアハウス共用アプリ

最大8人の多国籍シェアハウス向けの掃除当番・洗濯機・掲示板アプリ（Next.js + Supabase）。

仕様の元になったドラフトは `docs/spec-draft.md` を参照してください。

## 第1段階（実装済み）

- ハウス作成・招待コード参加（Supabase匿名ログイン、6桁コード・7日有効）
- 掃除当番: 7種類の担当を毎週1部屋ずつローテーション（8週で一周）。ゴミ収集カレンダー（燃やさない/資源/プラのみ/あきびん）も自動算出
- 完了報告、交換リクエスト（承諾で入れ替え）、不在登録、代行（その週「休み」の人が代行し「貸し」を記録）
- 洗濯機の使用中／空いた表示
- 掲示板（投稿・定型文・重要連絡の既読管理）
- 設定（表示言語、メンバー一覧、招待コード発行）
- 日本語・英語の完全な表示切り替え（当番名・日時表記・ボタン文言すべて対応、選択言語はDBに保存され次回起動時も維持）

## 第2段階（実装済み・一部要デプロイ作業）

- **即時通知**（実装済み・動作確認可能）:
  - 掲示板の重要投稿 → 全員へ（投稿者以外）
  - 洗濯機の「空いた」 → 全員へ（操作者以外）
  - 当番の交換リクエスト → 相手へ
  - 代行してもらった → 元の担当者へ
  - 通知文面は受け取る人の表示言語（日本語 / 英語）で自動的に出し分け
- **定時通知**（コードは実装済みだが、Supabase Edge Functionとpg_cronのデプロイが別途必要。下記「定時通知のデプロイ」参照）:
  - 洗濯終了予定時刻の通知、30分放置のリマインド
  - ゴミ出し（月・木・水金）の前夜20時・当日朝7時通知、当日9時に未完了ならその週「休み」の人へ代行依頼
  - 掃除当番が木曜20時・日曜10時に未完了なら本人へ
  - 日曜朝9時に全員へ今週の当番
- 設定画面で通知のオン・オフを切り替え可能。iPhoneはホーム画面に追加していない場合、案内文を表示

未実装（第3段階、詳細は `docs/spec-draft.md` 参照）:

- 買い物帳・共用費
- 掲示板の自動翻訳（現状は原文をそのまま表示するプレースホルダー）
- 引き継ぎコード、退去処理のUI
- PWAアイコン画像（`public/manifest.json` が参照する `icons/icon-192.png` 等は未生成）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) でアカウントを作成し、新しいプロジェクトを作る（リージョンは東京 = ap-northeast-1）
2. `Authentication > Sign In / Providers` で **Anonymous Sign-Ins** を有効にする
3. SQL Editor で `supabase/migrations/0001_init.sql`、続けて `supabase/migrations/0002_push_notifications.sql` の内容を実行する

### 3. 環境変数

`.env.example` を `.env.local` にコピーし、値を設定する。

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx

# 第2段階（プッシュ通知）に必要
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx
VAPID_SUBJECT=mailto:admin@example.com
```

VAPIDキーは以下のコマンドで生成できる。

```bash
npx web-push generate-vapid-keys --json
```

### 4. 開発サーバー起動

```bash
npm run dev
```

### 5. テスト

```bash
npm test   # vitest（当番ローテーション・ゴミ収集カレンダーのロジック）
npm run lint
npm run build
```

## 定時通知のデプロイ（第2段階・任意）

即時通知（掲示板の重要投稿、洗濯機の「空いた」など）はNext.js側だけで動くため追加作業は不要。
定時通知（ゴミ出しリマインド等）は `supabase/functions/scheduled-notifications/index.ts` を
Supabase Edge Functionとしてデプロイし、pg_cronで5分おきに呼び出す必要がある。

1. [Supabase CLI](https://supabase.com/docs/guides/cli) をインストールし、`supabase login` `supabase link` する
2. Edge Functionのsecretsを設定する

   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=xxxxx VAPID_PRIVATE_KEY=xxxxx VAPID_SUBJECT=mailto:admin@example.com
   ```

3. デプロイする

   ```bash
   supabase functions deploy scheduled-notifications
   ```

4. SupabaseのSQL Editorで、5分おきに関数を叩くpg_cronジョブを登録する（`pg_cron` と `pg_net` エクステンションを事前に有効化しておく）

   ```sql
   select cron.schedule(
     'scheduled-notifications-every-5-min',
     '*/5 * * * *',
     $$
     select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/scheduled-notifications',
       headers := jsonb_build_object('Authorization', 'Bearer <anon or service_role key>')
     );
     $$
   );
   ```

## Vercelへのデプロイ

1. GitHubにリポジトリを作成しpush
2. Vercelで「GitHubでログイン」しこのリポジトリをImport
3. Vercelのプロジェクト設定 > Environment Variables に `.env.local` と同じ値を設定
4. デプロイ後、Vercelから発行されるURLをそのままPWAとして利用可能

## ディレクトリ構成（抜粋）

```
src/
  app/
    join/                 参加画面
    create-house/         ハウス作成画面（代表者用）
    (main)/               下部タブ配下（ホーム/当番/掲示板/設定）
    api/                  各種API Route（house, invite, join, duty, washer, board, push ...）
  components/              UIコンポーネント（各画面のボタン・フォーム）
  lib/
    duty/rotation.ts       当番ローテーション・ゴミ収集カレンダーのコアロジック（テスト済み）
    supabase/               ブラウザ/サーバー用Supabaseクライアント
    i18n/                   日本語・英語の言語ファイルとProvider（t(key, params)で補間可）
    push/                   Web Push送信（即時通知）・購読クライアント
  middleware.ts             匿名ログインのセッション維持
public/sw.js                 Push通知用サービスワーカー
supabase/migrations/        DBスキーマ・RLSポリシー
supabase/functions/          定時通知用Edge Function（要デプロイ、上記参照）
```
