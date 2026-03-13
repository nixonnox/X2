"use client";

const MOCK_MENTIONS = [
  {
    keyword: "X2 분석",
    count: 342,
    sentiment: 72,
    trend: "+15%",
    source: "YouTube, 블로그",
  },
  {
    keyword: "소셜 리스닝",
    count: 218,
    sentiment: 68,
    trend: "+8%",
    source: "블로그, 커뮤니티",
  },
  {
    keyword: "브랜드명",
    count: 1240,
    sentiment: 71,
    trend: "+22%",
    source: "전체 플랫폼",
  },
  {
    keyword: "경쟁사 비교",
    count: 89,
    sentiment: 54,
    trend: "-3%",
    source: "YouTube, 커뮤니티",
  },
  {
    keyword: "제품 리뷰",
    count: 456,
    sentiment: 65,
    trend: "+12%",
    source: "YouTube, Instagram",
  },
];

export default function MentionAnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          언급 분석
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          등록된 키워드의 소셜 미디어 언급량과 감성을 분석합니다.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            총 언급량
          </p>
          <p className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">
            2,345
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-600">전주 대비 +18%</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            긍정 감성 비율
          </p>
          <p className="mt-1 text-[22px] font-semibold text-emerald-600">71%</p>
          <p className="mt-0.5 text-[11px] text-emerald-600">+3%p 상승</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            추적 키워드
          </p>
          <p className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">
            5
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            활성 키워드
          </p>
        </div>
      </div>

      {/* Trend Chart Placeholder */}
      <div className="card p-6">
        <h2 className="mb-4 text-[14px] font-semibold text-[var(--foreground)]">
          언급량 추이
        </h2>
        <div className="flex h-48 items-center justify-center rounded-lg bg-[var(--secondary)]">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            언급량 추이 차트 (Recharts 연동 예정)
          </p>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                키워드
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                언급 수
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                긍정 비율
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                추세
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                주요 소스
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_MENTIONS.map((m) => (
              <tr
                key={m.keyword}
                className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
              >
                <td className="px-4 py-2.5 font-medium">{m.keyword}</td>
                <td className="px-4 py-2.5 text-right">
                  {m.count.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right">{m.sentiment}%</td>
                <td
                  className={`px-4 py-2.5 text-right ${m.trend.startsWith("+") ? "text-emerald-600" : "text-red-600"}`}
                >
                  {m.trend}
                </td>
                <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                  {m.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
