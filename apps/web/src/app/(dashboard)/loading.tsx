export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-md bg-[var(--secondary)]" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-[var(--secondary)]" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-[var(--secondary)]" />
    </div>
  );
}
