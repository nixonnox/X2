import { db } from "@x2/db";
import { notFound } from "next/navigation";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // TODO: 실데이터 연결 완료 — DB에서 shareToken으로 직접 조회
  const report = await db.insightReport.findUnique({
    where: { shareToken: token },
    include: {
      sections: { orderBy: { createdAt: "asc" } },
      project: { select: { name: true } },
    },
  });

  if (!report || report.status !== "PUBLISHED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="p-10 text-center">
          <h1 className="mb-2 text-[16px] font-semibold text-[var(--foreground)]">
            리포트를 찾을 수 없어요
          </h1>
          <p className="text-[13px] text-[var(--muted-foreground)]">
            링크가 만료되었거나 비활성화되었을 수 있어요.
          </p>
        </div>
      </div>
    );
  }

  // 공유 토큰 만료 검사 (30일)
  const tokenAge = Date.now() - new Date(report.updatedAt).getTime();
  const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  if (tokenAge > MAX_AGE) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="p-10 text-center">
          <h1 className="mb-2 text-[16px] font-semibold text-[var(--foreground)]">
            공유 링크가 만료되었어요
          </h1>
          <p className="text-[13px] text-[var(--muted-foreground)]">
            이 리포트의 공유 링크는 30일이 지나 만료되었어요.
          </p>
        </div>
      </div>
    );
  }

  const content = report.content as Record<string, unknown> | null;
  const kpiSummary = (content?.kpiSummary as Record<string, unknown>[]) ?? [];
  const insights =
    (content?.insights as {
      id: string;
      title: string;
      description: string;
    }[]) ?? [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-1 text-[11px] text-[var(--muted-foreground)]">
            {report.project?.name ?? ""}
          </p>
          <h1 className="text-[22px] font-bold text-[var(--foreground)]">
            {report.title}
          </h1>
          {report.period && (
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              {report.period}
            </p>
          )}
          {report.summary && (
            <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
              {report.summary}
            </p>
          )}
        </div>

        {/* KPI Summary */}
        {kpiSummary.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpiSummary.map((kpi: any, i: number) => (
              <div key={i} className="card p-4 text-center">
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {kpi.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                  {kpi.value}
                </p>
                {kpi.change && (
                  <p
                    className={`mt-1 text-[11px] ${kpi.changeType === "positive" ? "text-emerald-600" : kpi.changeType === "negative" ? "text-red-600" : "text-[var(--muted-foreground)]"}`}
                  >
                    {kpi.change}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="card p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
              핵심 인사이트
            </h2>
            <div className="space-y-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 rounded-md bg-[var(--secondary)] p-3"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-[12px] font-medium text-[var(--foreground)]">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {insight.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {report.sections.length > 0 && (
          <div className="space-y-3">
            {report.sections.map((section) => (
              <div key={section.id} className="card p-5">
                <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
                  {section.title}
                </h3>
                {section.narrative && (
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                    {section.narrative}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 데이터 없을 때 */}
        {kpiSummary.length === 0 &&
          insights.length === 0 &&
          report.sections.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {report.summary || "리포트 내용이 아직 생성되지 않았어요."}
              </p>
            </div>
          )}

        {/* Footer */}
        <div className="border-t border-[var(--border)] pt-6 text-center">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            이 리포트는 X2에 의해 자동 생성되었어요.
          </p>
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
            생성일: {new Date(report.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>
    </div>
  );
}
