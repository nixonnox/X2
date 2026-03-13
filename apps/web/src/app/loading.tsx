export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-blue-600" />
        <p className="text-[13px] text-[var(--muted-foreground)]">로딩 중...</p>
      </div>
    </div>
  );
}
