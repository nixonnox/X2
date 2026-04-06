import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@x2/db";

/**
 * Auth.js v5 설정.
 *
 * - Google OAuth: 프로덕션 인증
 * - Credentials: 개발 모드 전용 (AUTH_DEV_LOGIN=true)
 *   Google 키 없이도 로컬 개발 가능하도록 제공
 */

const providers: any[] = [];

// Google OAuth: 프로덕션 인증 (키가 설정된 경우에만 활성화)
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

// 개발 모드: Credentials provider (항상 등록, authorize 내부에서 환경변수 체크)
providers.push(
  Credentials({
    name: "Dev Login",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "dev@x2.local" },
    },
    async authorize(credentials) {
      // 환경변수 체크를 런타임에 수행
      if (process.env.AUTH_DEV_LOGIN !== "true") return null;

      const email = credentials?.email as string;
      if (!email) return null;

      try {
        // DB에서 사용자 찾기 또는 생성
        let user = await db.user.findUnique({ where: { email } });
        if (!user) {
          user = await db.user.create({
            data: {
              email,
              name: email.split("@")[0],
              emailVerified: new Date(),
            },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      } catch {
        // DB 미연결 시 임시 사용자 반환 (개발 전용)
        return {
          id: "dev-user",
          email,
          name: email.split("@")[0],
          image: null,
        };
      }
    },
  }),
);

// OAuth 사용 시에만 어댑터 활성화 (계정 연동에 필요)
const hasOAuth =
  process.env.AUTH_GOOGLE_ID ||
  process.env.AUTH_NAVER_ID ||
  process.env.AUTH_KAKAO_ID;

// 명시적 NextAuthResult 타입 annotation으로 TS2742 (portable types) 회피.
// destructure export를 쓰면 inferred type이 next-auth 내부 경로를 참조해서
// 컴포지트 빌드에서 portable하지 않다는 에러가 남.
const result: NextAuthResult = NextAuth({
  ...(hasOAuth ? { adapter: PrismaAdapter(db) as any } : {}),
  providers,
  trustHost: true,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    /**
     * JWT에 userId를 포함시켜 세션에서 사용할 수 있게 한다.
     */
    jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },

    /**
     * 세션에 userId를 노출한다.
     */
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});

export const handlers: NextAuthResult["handlers"] = result.handlers;
export const auth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;
