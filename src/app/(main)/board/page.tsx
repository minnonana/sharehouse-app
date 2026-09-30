import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { BoardPostForm } from "@/components/BoardPostForm";
import { MarkReadButton } from "@/components/MarkReadButton";
import { BoardPostBody } from "@/components/BoardPostBody";
import { T } from "@/components/T";
import { getServerTranslator } from "@/lib/i18n/server";
import type { BoardPost, BoardPostCategory, Member } from "@/types/database";

const CATEGORY_TABS: { value: BoardPostCategory | "all"; icon: string; labelKey: string }[] = [
  { value: "all", icon: "🗂", labelKey: "board.categoryAll" },
  { value: "rule", icon: "📌", labelKey: "board.categoryRule" },
  { value: "guest", icon: "🙋", labelKey: "board.categoryGuest" },
  { value: "repair", icon: "🔧", labelKey: "board.categoryRepair" },
  { value: "other", icon: "💬", labelKey: "board.categoryOther" },
];

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const ctx = await getCurrentMember();
  if (!ctx) return null;

  const { category: categoryParam } = await searchParams;
  const activeCategory = (
    ["rule", "guest", "repair", "other"] as BoardPostCategory[]
  ).includes(categoryParam as BoardPostCategory)
    ? (categoryParam as BoardPostCategory)
    : "all";

  const supabase = await createClient();

  let query = supabase
    .from("board_posts")
    .select("*")
    .eq("house_id", ctx.house.id)
    .order("created_at", { ascending: false });
  if (activeCategory !== "all") {
    query = query.eq("category", activeCategory);
  }
  // 互いに依存しないクエリはPromise.allでまとめて並列実行する
  // （順番にawaitすると往復が直列に積み上がり、遷移が遅くなる）。
  const [{ data: posts }, { data: reads }, { data: members }] = await Promise.all([
    query.returns<BoardPost[]>(),
    supabase.from("board_post_reads").select("post_id").eq("member_id", ctx.member.id),
    supabase
      .from("members")
      .select("id, name")
      .eq("house_id", ctx.house.id)
      .returns<Pick<Member, "id" | "name">[]>(),
  ]);
  const readPostIds = new Set((reads ?? []).map((r) => r.post_id));
  const memberNameById = new Map((members ?? []).map((m) => [m.id, m.name]));

  const dateLocale = ctx.member.display_language === "ja" ? "ja-JP" : "en-US";
  const t = getServerTranslator(ctx.member.display_language);

  return (
    <div className="flex flex-col">
      <T k="board.title" as="h1" className="mb-4 text-xl font-bold text-primary-dark" />

      <BoardPostForm />

      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => {
          const href = tab.value === "all" ? "/board" : `/board?category=${tab.value}`;
          const active = tab.value === activeCategory;
          return (
            <Link
              key={tab.value}
              href={href}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                active ? "bg-primary text-white" : "bg-surface-muted text-foreground/70"
              }`}
            >
              {tab.icon} {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>

      <ul className="flex flex-col gap-3">
        {(posts ?? []).map((post) => {
          const body =
            ctx.member.display_language === "ja" ? post.body_ja ?? post.body_original : post.body_en ?? post.body_original;
          const tab = CATEGORY_TABS.find((c) => c.value === post.category);
          return (
            <li
              key={post.id}
              className={`rounded-xl border p-4 shadow-sm ${
                post.is_important ? "border-primary bg-primary-light" : "border-border bg-white"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
                <span className="flex items-center gap-1.5">
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-foreground/60">
                    {tab?.icon} {t(tab?.labelKey ?? "board.categoryOther")}
                  </span>
                  {memberNameById.get(post.author_id) ?? "?"}
                </span>
                <span>{new Date(post.created_at).toLocaleString(dateLocale, { timeZone: "Asia/Tokyo" })}</span>
              </div>
              <BoardPostBody
                translatedBody={body}
                originalBody={post.body_original}
                originalLang={post.original_lang}
                viewerLang={ctx.member.display_language}
              />
              {post.is_important && (
                <div className="mt-3">
                  <MarkReadButton postId={post.id} alreadyRead={readPostIds.has(post.id)} />
                </div>
              )}
            </li>
          );
        })}

        {(posts ?? []).length === 0 && <T k="board.noPosts" as="p" className="text-sm text-foreground/50" />}
      </ul>
    </div>
  );
}
