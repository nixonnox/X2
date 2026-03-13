"use client";

export default function ChannelPerformancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          채널 성과 분석
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          등록된 채널의 성과 지표를 한눈에 비교합니다.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "총 구독자", value: "199,500", change: "+3.2%" },
          { label: "총 조회수", value: "1,245,800", change: "+12.5%" },
          { label: "평균 참여율", value: "4.2%", change: "+0.8%p" },
          { label: "총 콘텐츠", value: "342", change: "+18" },
        ].map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {kpi.label}
            </p>
            <p className="mt-1 text-[20px] font-semibold text-[var(--foreground)]">
              {kpi.value}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-600">{kpi.change}</p>
          </div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="card p-6">
        <h2 className="mb-4 text-[14px] font-semibold text-[var(--foreground)]">
          채널별 조회수 추이
        </h2>
        <div className="flex h-64 items-center justify-center rounded-lg bg-[var(--secondary)]">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            차트 영역 (Recharts 연동 예정)
          </p>
        </div>
      </div>

      {/* Channel Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                채널
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                플랫폼
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                구독자
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                조회수
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                참여율
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                성장률
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                name: "메인 채널",
                platform: "YouTube",
                subs: "125,400",
                views: "845,200",
                rate: "4.5%",
                growth: "+2.1%",
              },
              {
                name: "브랜드 계정",
                platform: "Instagram",
                subs: "45,200",
                views: "256,800",
                rate: "3.8%",
                growth: "+3.5%",
              },
              {
                name: "숏폼 채널",
                platform: "TikTok",
                subs: "28,900",
                views: "143,800",
                rate: "5.2%",
                growth: "+8.2%",
              },
            ].map((ch) => (
              <tr
                key={ch.name}
                className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
              >
                <td className="px-4 py-2.5 font-medium">{ch.name}</td>
                <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                  {ch.platform}
                </td>
                <td className="px-4 py-2.5 text-right">{ch.subs}</td>
                <td className="px-4 py-2.5 text-right">{ch.views}</td>
                <td className="px-4 py-2.5 text-right">{ch.rate}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">
                  {ch.growth}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
