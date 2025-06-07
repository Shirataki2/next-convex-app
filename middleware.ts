import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 認証が必要なルートを定義
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/workspace(.*)",
  "/api/protected(.*)",
]);

// 公開ルート（認証不要）を定義
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // 公開ルートはスキップ
  if (isPublicRoute(req)) {
    return;
  }
  
  // 保護されたルートへのアクセスは認証が必要
  if (isProtectedRoute(req)) {
    const origin = req.nextUrl.origin;
    await auth.protect({
      // カスタムサインインページにリダイレクト（絶対URL）
      unauthenticatedUrl: `${origin}/login`,
    });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};