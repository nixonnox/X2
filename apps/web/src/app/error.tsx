"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-[64px] font-bold leading-none text-red-200">500</p>
        <h1 className="mt-4 text-[18px] font-semibold text-[var(--foreground)]">
          오류가 발생했습니다
        </h1>
        <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
          일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        {error.digest && (
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            오류 코드: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
          >
            다시 시도
          </button>
          <a
            href="/dashboard"
            className="rounded-md px-4 py-2 text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            대시보드로 이동
          </a>
        </div>
      </div>
    </div>
  );
}
