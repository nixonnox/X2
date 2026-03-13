export const metadata = { title: "서비스 점검 중" };

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-amber-50">
          <svg
            className="h-8 w-8 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
            />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-[var(--foreground)]">
          서비스 점검 중
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
          더 나은 서비스를 위해 시스템 점검을 진행하고 있습니다.
          <br />
          빠른 시간 내에 정상화될 예정입니다.
        </p>
        <div className="card mt-6 inline-block p-4">
          <p className="text-[12px] text-[var(--muted-foreground)]">
            예상 완료 시간
          </p>
          <p className="mt-1 text-[16px] font-semibold text-[var(--foreground)]">
            2026년 3월 8일 오후 6:00 (KST)
          </p>
        </div>
        <p className="mt-6 text-[12px] text-[var(--muted-foreground)]">
          문의: support@x2.app
        </p>
      </div>
    </div>
  );
}
