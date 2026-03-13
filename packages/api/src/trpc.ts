import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { db } from "@x2/db";
import type { Session } from "@x2/auth";
import { createRepositories } from "./repositories";
import { createServices, type Services } from "./services";

/**
 * tRPC 컨텍스트.
 * API 라우트에서 세션을 주입한다.
 */
export type TRPCContext = {
  db: typeof db;
  session: Session | null;
  services: Services;
};

/** protectedProcedure 미들웨어를 거친 후 사용 가능한 컨텍스트 */
export type ProtectedTRPCContext = TRPCContext & {
  session: Session;
  userId: string;
};

// 싱글턴: 리포지토리와 서비스는 한 번만 생성
const repositories = createRepositories(db as any);
const services = createServices(repositories, undefined, db as any);

export function createTRPCContext(session: Session | null): TRPCContext {
  return { db, session, services };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * 인증된 사용자만 접근 가능한 프로시저.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
    },
  });
});
