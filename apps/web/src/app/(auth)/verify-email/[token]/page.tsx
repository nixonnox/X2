import Link from "next/link";

export const metadata = { title: "이메일 인증" };

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-white">
          X2
        </div>
        <h1 className="mt-4 text-2xl font-bold">이메일 인증 완료</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          이메일이 성공적으로 인증되었습니다.
        </p>
      </div>

      <div className="card space-y-4 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg
            className="h-8 w-8 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)]">
          이제 모든 기능을 이용하실 수 있습니다.
        </p>
        <Link
          href="/login"
          className="inline-block w-full rounded-md bg-blue-600 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
        >
          로그인하기
        </Link>
      </div>
    </div>
  );
}
