import {
  buildDutySchedule,
  DUTY_LABELS,
  ROOM_NUMBERS,
  TRASH_LABELS,
} from "@/lib/duty/rotation";

// 動作確認用の一時プレビュー（Supabase未接続でも見た目を確認できる）。実装完了後に削除する。
export default function PreviewDutyPage() {
  const currentWeekStart = "2026-09-27";
  const weeks = buildDutySchedule(currentWeekStart, 3);
  const myRoom = "114";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-primary-dark">当番表</h1>
      {weeks.map((week) => {
        const isCurrent = week.weekStartDate === currentWeekStart;
        return (
          <section
            key={week.weekStartDate}
            className={`rounded-xl border p-4 shadow-sm ${
              isCurrent ? "border-primary bg-primary-light" : "border-border bg-white"
            }`}
          >
            <h2 className="mb-3 font-bold">
              {week.weekStartDate}
              {isCurrent && <span className="ml-2 text-xs text-primary-dark">今週</span>}
            </h2>
            <ul className="flex flex-col gap-1">
              {ROOM_NUMBERS.map((room) => {
                const dutyKey = week.assignments[room];
                const label = DUTY_LABELS[dutyKey];
                const isMine = room === myRoom;
                return (
                  <li
                    key={room}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      isMine ? "bg-primary text-white font-bold" : "bg-surface-muted"
                    }`}
                  >
                    <span>{room}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                          isMine ? "bg-white text-primary" : "bg-primary text-white"
                        }`}
                      >
                        {label.short}
                      </span>
                      {label.ja}
                    </span>
                  </li>
                );
              })}
            </ul>
            {week.wedFriCollections.length > 0 && (
              <p className="mt-3 text-xs text-foreground/70">
                水金の収集:{" "}
                {week.wedFriCollections
                  .map((c) => `${c.date}(${TRASH_LABELS[c.kind].ja})`)
                  .join("、")}
              </p>
            )}
          </section>
        );
      })}

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-white">
        <div className="mx-auto flex max-w-md">
          {[
            { icon: "🏠", label: "ホーム" },
            { icon: "🧹", label: "当番", active: true },
            { icon: "📋", label: "掲示板" },
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
