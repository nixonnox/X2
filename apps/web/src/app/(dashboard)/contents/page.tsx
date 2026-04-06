"use client";
export default function ContentsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)] py-20">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
        <span className="text-2xl">📄</span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-[var(--foreground)]">
        콘텐츠는 채널 상세에서 확인하세요
      </h3>
      <p className="mt-2 max-w-sm text-center text-[13px] text-[var(--muted-foreground)]">
        각 채널의 상세 페이지에서 콘텐츠 목록과 성과를 확인할 수 있어요.
      </p>
      <a
        href="/channels"
        className="btn-primary mt-5 inline-flex items-center px-5 py-2.5 text-sm font-medium"
      >
        채널 목록으로 이동
      </a>
    </div>
  );
}
