/**
 * Edge Runtime 전용 Auth 설정.
 *
 * 미들웨어에서 사용하며, Prisma(Node.js 전용)를 import하지 않는다.
 * JWT 세션 검증만 수행한다.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const providers: any[] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

// Naver OAuth
if (process.env.AUTH_NAVER_ID && process.env.AUTH_NAVER_SECRET) {
  providers.push({
    id: "naver",
    name: "Naver",
    type: "oauth" as const,
    clientId: process.env.AUTH_NAVER_ID,
    clientSecret: process.env.AUTH_NAVER_SECRET,
    authorization: {
      url: "https://nid.naver.com/oauth2.0/authorize",
      params: { response_type: "code" },
    },
    token: "https://nid.naver.com/oauth2.0/token",
    userinfo: "https://openapi.naver.com/v1/nid/me",
    profile(profile: any) {
      return {
        id: profile.response.id,
        name: profile.response.name || profile.response.nickname,
        email: profile.response.email,
        image: profile.response.profile_image,
      };
    },
  });
}

// Kakao OAuth
if (process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET) {
  providers.push({
    id: "kakao",
    name: "Kakao",
    type: "oauth" as const,
    clientId: process.env.AUTH_KAKAO_ID,
    clientSecret: process.env.AUTH_KAKAO_SECRET,
    authorization: {
      url: "https://kauth.kakao.com/oauth/authorize",
      params: { response_type: "code" },
    },
    token: "https://kauth.kakao.com/oauth/token",
    userinfo: "https://kapi.kakao.com/v2/user/me",
    profile(profile: any) {
      return {
        id: String(profile.id),
        name: profile.kakao_account?.profile?.nickname,
        email: profile.kakao_account?.email,
        image: profile.kakao_account?.profile?.thumbnail_image_url,
      };
    },
  });
}

// CRITICAL: 프로덕션 환경에서는 절대 활성화되지 않도록 NODE_ENV 가드 필수
if (
  process.env.AUTH_DEV_LOGIN === "true" &&
  process.env.NODE_ENV !== "production"
) {
  providers.push(
    Credentials({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "dev@x2.local" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;
        return {
          id: "dev-user",
          email,
          name: email.split("@")[0],
          image: null,
        };
      },
    }),
  );
}

export const { auth: authEdge } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
});
