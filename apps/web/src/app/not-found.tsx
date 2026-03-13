import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-[64px] font-bold leading-none text-[var(--muted-foreground)]">
          404
        </p>
        <h1 className="mt-4 text-[18px] font-semibold text-[var(--foreground)]">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
          >
            대시보드로 이동
          </Link>
          <Link
            href="/"
            className="rounded-md px-4 py-2 text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
