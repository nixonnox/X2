"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <span className="text-[20px]">!</span>
        </div>
        <h2 className="mt-4 text-[16px] font-semibold text-[var(--foreground)]">
          페이지 로드 중 오류 발생
        </h2>
        <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
          데이터를 불러오는 중 문제가 발생했습니다.
        </p>
        {error.digest && (
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            코드: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
