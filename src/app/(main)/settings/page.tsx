import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InviteCodeCard } from "@/components/InviteCodeCard";
import type { Member } from "@/types/database";

export default async function SettingsPage() {
  const ctx = await getCurrentMember();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("house_id", ctx.house.id)
    .is("left_at", null)
    .order("room_number")
    .returns<Member[]>();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-primary-dark">設定</h1>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">表示言語</h2>
        <LanguageSwitcher initialLocale={ctx.member.display_language} />
      </section>

      {ctx.member.is_owner && <InviteCodeCard />}

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">メンバー</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between">
              <span>
                {m.room_number} {m.name}
              </span>
              {m.is_owner && (
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary-dark">
                  代表者
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-foreground/50">
        デザインは
        <a
          href="https://design.digital.go.jp/dads/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          デジタル庁デザインシステム（DADS）
        </a>
        を参考にしています。
      </p>
    </div>
  );
}
