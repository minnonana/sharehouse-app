// 動作確認用の一時プレビュー（Supabase未接続でも見た目を確認できる）。実装完了後に削除する。
export default function PreviewBoardPage() {
  const posts = [
    {
      id: 1,
      author: "さくら（113）",
      time: "9/27 18:20",
      important: true,
      body: "来週水曜日に修理業者さんが給湯器を見に来ます。10時〜12時の間、在宅の方は対応をお願いします。",
      read: false,
    },
    {
      id: 2,
      author: "Li（114）",
      time: "9/26 21:05",
      important: false,
      body: "トイレットペーパーが切れました",
      read: true,
    },
    {
      id: 3,
      author: "nanami（116）",
      time: "9/25 09:40",
      important: false,
      body: "来週友達が1泊遊びに来る予定です！よろしくお願いします🙏",
      read: true,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-primary-dark">掲示板</h1>

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm">
        <textarea
          placeholder="全員に伝えたいことを書いてください"
          className="min-h-20 rounded-lg border border-border p-3 text-sm"
          readOnly
        />
        <div className="flex flex-wrap gap-2">
          {["トイレットペーパーが切れました", "来客の予定があります", "修理業者が来ます"].map((t) => (
            <span key={t} className="rounded-full border border-primary px-3 py-1 text-xs text-primary-dark">
              {t}
            </span>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" readOnly />
          重要な連絡として送る
        </label>
        <button className="rounded-full bg-primary px-4 py-2 font-bold text-white">投稿する</button>
      </section>

      <ul className="flex flex-col gap-3">
        {posts.map((post) => (
          <li
            key={post.id}
            className={`rounded-xl border p-4 shadow-sm ${
              post.important ? "border-primary bg-primary-light" : "border-border bg-white"
            }`}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
              <span>{post.author}</span>
              <span>{post.time}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{post.body}</p>
            {post.important && (
              <div className="mt-3">
                {post.read ? (
                  <span className="text-xs text-success">✓ 読んだ</span>
                ) : (
                  <button className="rounded-full border border-primary px-3 py-1 text-xs text-primary-dark">
                    読んだ
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-white">
        <div className="mx-auto flex max-w-md">
          {[
            { icon: "🏠", label: "ホーム" },
            { icon: "🧹", label: "当番" },
            { icon: "📋", label: "掲示板", active: true },
            { icon: "⚙️", label: "設定" },
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
