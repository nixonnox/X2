import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

export default function LoginPage() {
  const isDevLogin = process.env.AUTH_DEV_LOGIN === "true";

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* 로고 */}
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
          X2
        </div>
        <h1 className="mt-4 text-2xl font-bold">X2에 로그인</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          소셜 미디어 분석을 시작하세요
        </p>
      </div>

      <LoginForm isDevLogin={isDevLogin} />

      {isDevLogin && (
        <div className="text-center">
          <Link
            href="/api/dev-login"
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          >
            <span className="text-base">&#128295;</span>
            빠른 개발자 로그인 (dev@x2.local)
          </Link>
        </div>
      )}

      <div className="space-y-2 text-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            회원가입
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        로그인 시{" "}
        <Link
          href="/terms"
          className="underline hover:text-[var(--foreground)]"
        >
          이용약관
        </Link>{" "}
        및{" "}
        <Link
          href="/privacy"
          className="underline hover:text-[var(--foreground)]"
        >
          개인정보처리방침
        </Link>
        에 동의하게 돼요.
      </p>
    </div>
  );
}
