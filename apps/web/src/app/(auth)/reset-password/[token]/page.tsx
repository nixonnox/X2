import Link from "next/link";

export const metadata = { title: "비밀번호 재설정" };

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
          X2
        </div>
        <h1 className="mt-4 text-2xl font-bold">비밀번호 재설정</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          새 비밀번호를 입력해 주세요.
        </p>
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">
            새 비밀번호
          </label>
          <input
            type="password"
            placeholder="8자 이상"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">
            비밀번호 확인
          </label>
          <input
            type="password"
            placeholder="비밀번호를 다시 입력"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-md bg-blue-600 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
        >
          비밀번호 변경
        </button>
      </div>

      <p className="text-center text-[13px] text-[var(--muted-foreground)]">
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  );
}
