import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { BoardPostForm } from "@/components/BoardPostForm";
import { MarkReadButton } from "@/components/MarkReadButton";
import { BoardPostBody } from "@/components/BoardPostBody";
import { T } from "@/components/T";
import type { BoardPost, Member } from "@/types/database";

export default async function BoardPage() {
  const ctx = await getCurrentMember();
  if (!ctx) return null;

  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("board_posts")
    .select("*")
    .eq("house_id", ctx.house.id)
    .order("created_at", { ascending: false })
    .returns<BoardPost[]>();

  const { data: reads } = await supabase
    .from("board_post_reads")
    .select("post_id")
    .eq("member_id", ctx.member.id);
  const readPostIds = new Set((reads ?? []).map((r) => r.post_id));

  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .eq("house_id", ctx.house.id)
    .returns<Pick<Member, "id" | "name">[]>();
  const memberNameById = new Map((members ?? []).map((m) => [m.id, m.name]));

  const dateLocale = ctx.member.display_language === "ja" ? "ja-JP" : "en-US";

  return (
    <div className="flex flex-col">
      <T k="board.title" as="h1" className="mb-4 text-xl font-bold text-primary-dark" />

      <BoardPostForm />

      <ul className="flex flex-col gap-3">
        {(posts ?? []).map((post) => {
          const body =
            ctx.member.display_language === "ja" ? post.body_ja ?? post.body_original : post.body_en ?? post.body_original;
          return (
            <li
              key={post.id}
              className={`rounded-xl border p-4 shadow-sm ${
                post.is_important ? "border-primary bg-primary-light" : "border-border bg-white"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs text-foreground/60">
                <span>{memberNameById.get(post.author_id) ?? "?"}</span>
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
