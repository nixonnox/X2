import { authEdge } from "@x2/auth/edge";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * 보호된 라우트 미들웨어.
 *
 * 1. API Rate Limiting (IP 기반)
 * 2. 인증되지 않은 사용자는 /login으로 리다이렉트
 * 3. 공개 경로(로그인, API, 정적 파일)는 통과
 *
 * Edge Runtime 호환을 위해 Prisma를 import하지 않는 authEdge를 사용한다.
 */

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth",
  "/api/health",
  "/api/locale",
  "/api/intent",
  "/api/sync",
  "/api/demo",
  "/reports/shared",
  "/terms",
  "/privacy",
  "/maintenance",
];

/** API 요청: 60초당 60회 */
const API_RATE_LIMIT = 60;
const API_RATE_WINDOW = 60 * 1000;

/** 일반 페이지: 60초당 120회 */
const PAGE_RATE_LIMIT = 120;
const PAGE_RATE_WINDOW = 60 * 1000;

export default authEdge((req) => {
  const { pathname } = req.nextUrl;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // ── Rate Limiting ──
  const isApi = pathname.startsWith("/api/");
  const limit = isApi ? API_RATE_LIMIT : PAGE_RATE_LIMIT;
  const window = isApi ? API_RATE_WINDOW : PAGE_RATE_WINDOW;
  const rlKey = `${ip}:${isApi ? "api" : "page"}`;

  const rl = rateLimit(rlKey, limit, window);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
        },
      },
    );
  }

  // Rate limit 헤더 추가
  const response = (() => {
    // 루트 경로(랜딩 페이지)는 공개
    if (pathname === "/") {
      return NextResponse.next();
    }

    // 공개 경로는 통과
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // 미인증 시 로그인 페이지로
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  })();

  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(rl.resetAt / 1000)),
  );

  return response;
});

export const config = {
  matcher: [
    // 정적 파일, _next, favicon 제외
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
