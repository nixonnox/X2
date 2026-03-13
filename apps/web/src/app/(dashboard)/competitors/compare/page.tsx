"use client";

const CHANNELS = [
  {
    name: "우리 채널",
    subs: "125,400",
    growth: "+2.1%",
    views: "845,200",
    engagement: "4.5%",
    uploads: "주 2회",
    isOwn: true,
  },
  {
    name: "경쟁사 A",
    subs: "142,800",
    growth: "+1.5%",
    views: "912,400",
    engagement: "3.2%",
    uploads: "주 3회",
    isOwn: false,
  },
  {
    name: "경쟁사 B",
    subs: "98,200",
    growth: "+2.8%",
    views: "623,100",
    engagement: "4.1%",
    uploads: "주 2회",
    isOwn: false,
  },
  {
    name: "경쟁사 C",
    subs: "210,500",
    growth: "+0.9%",
    views: "1,105,300",
    engagement: "2.8%",
    uploads: "주 4회",
    isOwn: false,
  },
];

export default function CompetitorComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          채널 비교
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          경쟁 채널과의 주요 지표를 비교합니다.
        </p>
      </div>

      {/* Comparison Chart Placeholder */}
      <div className="card p-6">
        <h2 className="mb-4 text-[14px] font-semibold text-[var(--foreground)]">
          구독자 성장 추이 비교
        </h2>
        <div className="flex h-64 items-center justify-center rounded-lg bg-[var(--secondary)]">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            비교 차트 영역 (Recharts 연동 예정)
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                채널
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                구독자
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                성장률
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                총 조회수
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                참여율
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                업로드 빈도
              </th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((ch) => (
              <tr
                key={ch.name}
                className={`border-b border-[var(--border-subtle)] transition-colors ${
                  ch.isOwn ? "bg-blue-50/30" : "hover:bg-[var(--secondary)]"
                }`}
              >
                <td className="px-4 py-2.5">
                  <span className="font-medium">{ch.name}</span>
                  {ch.isOwn && (
                    <span className="badge ml-2 bg-blue-50 text-[9px] text-blue-600">
                      내 채널
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">{ch.subs}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">
                  {ch.growth}
                </td>
                <td className="px-4 py-2.5 text-right">{ch.views}</td>
                <td className="px-4 py-2.5 text-right">{ch.engagement}</td>
                <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">
                  {ch.uploads}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insights */}
      <div className="card p-5">
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          비교 인사이트
        </h2>
        <ul className="space-y-2">
          {[
            "구독자 성장률은 경쟁 평균(1.7%) 대비 높은 수준입니다.",
            "참여율(4.5%)이 경쟁 평균(3.4%) 대비 우수합니다.",
            "업로드 빈도(주 2회)가 경쟁 평균(주 3회) 대비 낮아 개선이 필요합니다.",
            "경쟁사 C의 구독자 수가 가장 많으나 참여율은 가장 낮습니다.",
          ].map((text, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] text-[var(--muted-foreground)]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
