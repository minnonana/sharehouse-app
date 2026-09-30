import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Supabase の匿名ログインセッションを毎リクエスト更新する。
// 参考: https://supabase.com/docs/guides/auth/server-side/nextjs
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() は毎回Supabaseの認証サーバーにネットワークで問い合わせるため数百ms単位で遅く、
  // それが全ページ共通のmiddlewareで動くとアプリ全体が遅くなる。
  // getSession() はcookieのJWTをローカルで見て、期限切れの時だけネットワークでリフレッシュする
  // ため、有効なセッションが既にある大半のリクエストではネットワーク往復が発生しない。
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // まだ誰もログインしていなければ匿名ログインさせる
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[middleware] signInAnonymously failed:", error.message);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
