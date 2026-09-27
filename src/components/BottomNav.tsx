"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const TABS = [
  { href: "/home", key: "nav.home", icon: "🏠" },
  { href: "/duty", key: "nav.duty", icon: "🧹" },
  { href: "/board", key: "nav.board", icon: "📋" },
  { href: "/settings", key: "nav.settings", icon: "⚙️" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-white">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
                active ? "text-primary" : "text-foreground/60"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {tab.icon}
              </span>
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
