import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InviteCodeCard } from "@/components/InviteCodeCard";
import { HandoverCodeCard } from "@/components/HandoverCodeCard";
import { LeaveButton } from "@/components/LeaveButton";
import { NotificationSettings } from "@/components/NotificationSettings";
import { T } from "@/components/T";
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
      <T k="settings.title" as="h1" className="text-xl font-bold text-primary-dark" />

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <T k="settings.language" as="h2" className="mb-2 font-bold" />
        <LanguageSwitcher initialLocale={ctx.member.display_language} />
      </section>

      <NotificationSettings />

      {ctx.member.is_owner && <InviteCodeCard />}

      <HandoverCodeCard />

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <T k="settings.members" as="h2" className="mb-2 font-bold" />
        <ul className="flex flex-col gap-2 text-sm">
          {(members ?? []).map((m) => {
            const isSelf = m.id === ctx.member.id;
            const canLeave = isSelf || ctx.member.is_owner;
            return (
              <li key={m.id} className="flex items-center justify-between">
                <span>
                  {m.room_number} {m.name}
                </span>
                <span className="flex items-center gap-2">
                  {m.is_owner && (
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs text-primary-dark">
                      <T k="settings.ownerBadge" />
                    </span>
                  )}
                  {canLeave && <LeaveButton memberId={m.id} isSelf={isSelf} />}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-center text-xs text-foreground/50">
        <T k="settings.dadsCreditPrefix" />
        <a
          href="https://design.digital.go.jp/dads/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          <T k="settings.dadsCreditLinkText" />
        </a>
        <T k="settings.dadsCreditSuffix" />
      </p>
    </div>
  );
}
