/**
 * @x2/auth
 *
 * Auth.js v5 인증 모듈.
 * - Google OAuth
 * - 개발용 Credentials (AUTH_DEV_LOGIN=true 시 활성화)
 * - Prisma Adapter
 * - JWT 세션
 */

export { auth, handlers, signIn, signOut } from "./config";
export type { Session } from "next-auth";
