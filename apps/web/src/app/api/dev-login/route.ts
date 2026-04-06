import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { db } from "@x2/db";

export async function GET(request: Request) {
  const email = "dev@x2.local";
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTH_SECRET not set" }, { status: 500 });
  }

  // DB에서 사용자 찾기 또는 생성
  let userId = "dev-user";
  let name = "dev";
  try {
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: { email, name: "dev", emailVerified: new Date() },
      });
    }
    userId = user.id;
    name = user.name ?? "dev";
  } catch {
    // DB 미연결 시 임시값 사용
  }

  // JWT 토큰 생성
  const token = await encode({
    token: {
      sub: userId,
      userId,
      name,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30일
    },
    secret,
    salt: getSessionCookieName(),
  });

  // 세션 쿠키 설정
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30일
  });

  // 대시보드로 리다이렉트
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.redirect(new URL("/dashboard", baseUrl));
}

function getSessionCookieName() {
  const useSecureCookie =
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ||
    process.env.VERCEL === "1";
  return useSecureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}
