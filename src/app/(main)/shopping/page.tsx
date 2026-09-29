import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/member/getCurrentMember";
import { getTodayJst } from "@/lib/date/jst";
import { buildMonthlyBalance } from "@/lib/shopping/balance";
import { ShoppingItemForm } from "@/components/ShoppingItemForm";
import { ShoppingChecklist } from "@/components/ShoppingChecklist";
import { DuesCard } from "@/components/DuesCard";
import { T } from "@/components/T";
import type { Member, MonthlyDue, ShoppingItem } from "@/types/database";

export default async function ShoppingPage() {
  const ctx = await getCurrentMember();
  if (!ctx) return null;

  const supabase = await createClient();
  const today = getTodayJst();
  const [year, month] = today.split("-").map(Number);

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("house_id", ctx.house.id)
    .is("left_at", null)
    .returns<Member[]>();
  const memberById = new Map((members ?? []).map((m) => [m.id, m]));
  const totalMembers = (members ?? []).length;

  const { data: items } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("house_id", ctx.house.id)
    .order("created_at", { ascending: false })
    .returns<ShoppingItem[]>();

  const { data: allDues } = await supabase
    .from("monthly_dues")
    .select("*")
    .eq("house_id", ctx.house.id)
    .returns<MonthlyDue[]>();

  const { data: allSpends } = await supabase
    .from("shopping_items")
    .select("amount_yen, completed_at")
    .eq("house_id", ctx.house.id)
    .in("status", ["done", "settled"]);

  // 最初の活動月〜今月までの一覧を作る（データがまだ無ければ今月だけ）
  const firstDue = (allDues ?? []).reduce<{ year: number; month: number } | null>((min, d) => {
    if (!min || d.year < min.year || (d.year === min.year && d.month < min.month)) {
      return { year: d.year, month: d.month };
    }
    return min;
  }, null);
  const startYear = firstDue?.year ?? year;
  const startMonth = firstDue?.month ?? month;

  const monthlyRows = buildMonthlyBalance(allDues ?? [], allSpends ?? [], startYear, startMonth, year, month);

  const myDue = (allDues ?? []).find((d) => d.member_id === ctx.member.id && d.year === year && d.month === month);
  const thisMonthDues = (allDues ?? []).filter((d) => d.year === year && d.month === month);
  const paidCount = thisMonthDues.filter((d) => d.paid).length;
  const paidMemberIds = new Set(thisMonthDues.filter((d) => d.paid).map((d) => d.member_id));
  const unpaidNames = (members ?? [])
    .filter((m) => !paidMemberIds.has(m.id))
    .map((m) => m.name);

  const activeItems = (items ?? []).filter((i) => i.status !== "settled");
  const settledItems = (items ?? []).filter((i) => i.status === "settled");

  return (
    <div className="flex flex-col">
      <T k="shopping.title" as="h1" className="mb-4 text-xl font-bold text-primary-dark" />

      <DuesCard
        year={year}
        month={month}
        amountYen={500}
        myPaid={myDue?.paid ?? false}
        paidCount={paidCount}
        totalMembers={totalMembers}
        unpaidNames={unpaidNames}
        monthlyRows={monthlyRows}
      />

      <ShoppingItemForm />

      <ShoppingChecklist
        rows={activeItems.map((item) => ({
          item,
          assigneeName: item.assignee_id ? memberById.get(item.assignee_id)?.name ?? null : null,
          createdByName: memberById.get(item.created_by)?.name ?? "?",
        }))}
        canSettle={ctx.member.is_owner}
      />

      {settledItems.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-foreground/60">
            <T k="shopping.showSettled" />
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {settledItems.map((item) => (
              <li key={item.id} className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-foreground/60">
                {item.name} — ¥{item.amount_yen?.toLocaleString()}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
