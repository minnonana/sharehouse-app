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

未実装（第2・第3段階、詳細は `docs/spec-draft.md` 参照）:

- プッシュ通知（即時＋定時）
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
3. SQL Editor で `supabase/migrations/0001_init.sql` の内容を実行する

### 3. 環境変数

`.env.example` を `.env.local` にコピーし、SupabaseプロジェクトのURLとanonキーを設定する。

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
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

## Vercelへのデプロイ

1. GitHubにリポジトリを作成しpush
2. Vercelで「GitHubでログイン」しこのリポジトリをImport
3. Vercelのプロジェクト設定 > Environment Variables に `.env.local` と同じ2つの値を設定
4. デプロイ後、Vercelから発行されるURLをそのままPWAとして利用可能

## ディレクトリ構成（抜粋）

```
src/
  app/
    join/                 参加画面
    create-house/         ハウス作成画面（代表者用）
    (main)/               下部タブ配下（ホーム/当番/掲示板/設定）
    api/                  各種API Route（house, invite, join, duty, washer, board ...）
  components/              UIコンポーネント（各画面のボタン・フォーム）
  lib/
    duty/rotation.ts       当番ローテーション・ゴミ収集カレンダーのコアロジック（テスト済み）
    supabase/               ブラウザ/サーバー用Supabaseクライアント
    i18n/                   日本語・英語の言語ファイルとProvider
  middleware.ts             匿名ログインのセッション維持
supabase/migrations/        DBスキーマ・RLSポリシー
```
