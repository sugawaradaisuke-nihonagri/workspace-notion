import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const { pathname } = req.nextUrl;

  // 未ログイン時: 認証不要のパスを除きリダイレクト
  if (!session?.user) {
    const publicPaths = ["/login", "/api/auth", "/api/trpc"];
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));
    if (!isPublic) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ログイン済みで /login にアクセスした場合はトップへ
  if (session?.user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
