import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { BottomNav } from "@/components/BottomNav";
import { LocaleSync } from "@/components/LocaleSync";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentMember();
  if (!ctx) {
    redirect("/join");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LocaleSync locale={ctx.member.display_language} />
      <main
        className="mx-auto w-full max-w-md flex-1 px-4 pt-6"
        style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
