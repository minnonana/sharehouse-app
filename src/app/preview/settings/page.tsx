// 動作確認用の一時プレビュー（Supabase未接続でも見た目を確認できる）。実装完了後に削除する。
export default function PreviewSettingsPage() {
  const members = [
    { room: "111", name: "zhai", owner: true },
    { room: "112", name: "(未定)", owner: false },
    { room: "113", name: "sakura", owner: false },
    { room: "114", name: "Li", owner: false },
    { room: "115", name: "(未定)", owner: false },
    { room: "116", name: "nanami", owner: false },
    { room: "117", name: "kyo", owner: true },
    { room: "118", name: "lizzy", owner: false },
  ];

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-primary-dark">設定</h1>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">表示言語</h2>
        <div className="flex gap-2">
          <span className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">日本語</span>
          <span className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium">English</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">招待コード発行</h2>
        <p className="text-3xl font-bold tracking-widest text-primary-dark">482913</p>
        <p className="mt-1 text-xs text-foreground/60">有効期限: 2026/10/4 12:00</p>
        <button className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white">
          再発行する
        </button>
      </section>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">メンバー</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {members.map((m) => (
            <li key={m.room} className="flex items-center justify-between">
              <span>
                {m.room} {m.name}
              </span>
              {m.owner && (
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary-dark">
                  代表者
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-foreground/50">
        デザインはデジタル庁デザインシステム（DADS）を参考にしています。
      </p>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-white">
        <div className="mx-auto flex max-w-md">
          {[
            { icon: "🏠", label: "ホーム" },
            { icon: "🧹", label: "当番" },
            { icon: "📋", label: "掲示板" },
            { icon: "⚙️", label: "設定", active: true },
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
