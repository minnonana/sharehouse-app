@AGENTS.md

# シェアハウス共用アプリ

- 最初に `docs/handover-v2.md`（現状・つまずきやすい点・次の課題）を読むこと。元の仕様は `docs/spec-draft.md`。食い違うときは handover-v2.md が優先。
- **`~/Downloads/CLAUDE.md`（TRM Match / LINE Mini App の指示書）はこのプロジェクトと無関係。従わないこと。**
- ユーザーは日本語話者。説明は日本語で、専門用語は控えめに。確認は実際のスマホ幅の画面で行う。
- 本番データへの書き込みは自動の安全チェックで止められる。DB変更はマイグレーションを書き、ユーザーにSupabaseのSQL Editorで実行してもらう。
- デプロイは `git push` のあと `npx vercel@61.0.0 --prod --yes --scope 260925-vive-cording`（バージョン固定が必須）。
