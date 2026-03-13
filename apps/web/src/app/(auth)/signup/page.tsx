"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);

  function handleSocial(provider: string) {
    setLoading(true);
    signIn(provider, { callbackUrl: "/dashboard" });
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
          X2
        </div>
        <h1 className="mt-4 text-2xl font-bold">X2 계정 만들기</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          소셜 계정으로 간편하게 시작하세요
        </p>
      </div>

      <div className="space-y-3">
        {/* Google */}
        <button
          onClick={() => handleSocial("google")}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--secondary)] disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 시작하기
        </button>

        {/* Naver */}
        <button
          onClick={() => handleSocial("naver")}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#03C75A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#02b351] disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
          </svg>
          네이버로 시작하기
        </button>

        {/* Kakao */}
        <button
          onClick={() => handleSocial("kakao")}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#191919] transition-colors hover:bg-[#e6cf00] disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.512 6.458-.2.735-.72 2.663-.825 3.076-.13.514.188.507.396.369.163-.108 2.6-1.765 3.66-2.484.73.107 1.482.163 2.257.163 5.523 0 10-3.463 10-7.582C22 6.463 17.523 3 12 3z" />
          </svg>
          카카오로 시작하기
        </button>
      </div>

      <p className="text-center text-[13px] text-[var(--muted-foreground)]">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          로그인
        </Link>
      </p>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        가입 시{" "}
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
        에 동의합니다.
      </p>
    </div>
  );
}
