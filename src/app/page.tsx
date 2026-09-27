import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/member/getCurrentMember";

export default async function RootPage() {
  const ctx = await getCurrentMember();
  if (ctx) {
    redirect("/home");
  }
  redirect("/join");
}
