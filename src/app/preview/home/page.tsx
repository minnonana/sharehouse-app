// 動作確認用の一時プレビュー（Supabase未接続でも見た目を確認できる）。実装完了後に削除する。
export default function PreviewHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6 pb-24">
      <header>
        <p className="text-sm text-foreground/60">○○ハウス</p>
        <h1 className="text-xl font-bold">きょう（114）</h1>
      </header>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-foreground/70">今日の自分の当番</h2>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              G
            </span>
            <span className="text-lg font-bold">玄関</span>
          </div>
          <button className="rounded-full bg-primary px-6 py-3 font-bold text-white">完了</button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-foreground/70">洗濯機</h2>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-success" />
          <span className="text-lg font-bold">空いています</span>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            終了予定時刻（任意）
            <input type="time" className="rounded-lg border border-border px-3 py-2" />
          </label>
          <button className="w-full rounded-full bg-primary px-4 py-3 font-bold text-white">
            使用中にする
          </button>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-white">
        <div className="mx-auto flex max-w-md">
          {[
            { icon: "🏠", label: "ホーム", active: true },
            { icon: "🧹", label: "当番", active: false },
            { icon: "📋", label: "掲示板", active: false },
            { icon: "⚙️", label: "設定", active: false },
          ].map((tab) => (
            <div
              key={tab.label}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
                tab.active ? "text-primary" : "text-foreground/60"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
