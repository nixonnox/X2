import type { StrategyReport, InsightSummary, Insight } from "./types";

export function buildInsightSummary(insights: Insight[]): InsightSummary {
  const criticalCount = insights.filter(
    (i) => i.priority === "critical",
  ).length;
  const keyFindings = insights.filter(
    (i) => i.category === "key_finding",
  ).length;
  const growthOpportunities = insights.filter(
    (i) => i.category === "growth_opportunity",
  ).length;
  const riskSignals = insights.filter(
    (i) => i.category === "risk_signal",
  ).length;
  const strategySuggestions = insights.filter(
    (i) => i.category === "strategy_suggestion",
  ).length;

  // Score: 0-100 based on opportunities vs risks
  const positiveSignals = keyFindings + growthOpportunities;
  const negativeSignals = riskSignals + criticalCount;
  const total = positiveSignals + negativeSignals || 1;
  const score = Math.round((positiveSignals / total) * 100);
  const scoreLabel =
    score >= 70 ? "Healthy" : score >= 40 ? "Needs Attention" : "At Risk";

  return {
    totalInsights: insights.length,
    criticalCount,
    keyFindings,
    growthOpportunities,
    riskSignals,
    strategySuggestions,
    overallScore: score,
    scoreLabel,
  };
}

export function generateReport(): StrategyReport {
  return {
    id: "rpt-001",
    title: "Weekly Strategic Analysis Report",
    generatedAt: "2026-03-08",
    period: "2026-03-01 ~ 2026-03-07",
    sections: [
      {
        title: "Executive Summary",
        content:
          "이번 주 분석 결과, 숏폼 콘텐츠 참여율이 지속적으로 상승하고 있으며 TikTok에서의 브랜드 언급이 35% 증가했습니다. 반면, 부정 댓글 비율이 12%로 증가하여 즉각적인 대응이 필요합니다. 전체적으로 채널 건강도는 양호하며, 숏폼 전략 강화와 댓글 대응 개선을 통해 성장 모멘텀을 유지할 수 있습니다.",
      },
      {
        title: "Key Metrics",
        content:
          "구독자: 125.4K (+3.8%), 참여율: 4.2% (업계 평균 대비 +1.5pp), 월간 조회수: 1.85M, 업로드 빈도: 12회/월. 경쟁 채널 대비 참여율은 우위이나, 업로드 빈도에서 격차가 벌어지고 있습니다.",
      },
      {
        title: "Opportunities",
        content:
          "1) TikTok 오가닉 노출 급증 활용 - 전용 콘텐츠 시리즈 필요. 2) 일본 시장 성장 - 자막/현지화 투자 적기. 3) 'AI 마케팅 도구' 트렌드 키워드 선점 가능.",
      },
      {
        title: "Risks & Mitigations",
        content:
          "1) 부정 댓글 증가 - 24시간 SLA 설정 및 AI 답변 활용. 2) 경쟁 채널 업로드 증가 - 효율적 콘텐츠 제작 워크플로우 구축. 3) 성장률 둔화 - 숏폼 비중 확대로 대응.",
      },
      {
        title: "Recommended Actions",
        content:
          "즉시: Shorts 주 3회 업로드, 고위험 댓글 24h 대응. 이번 주: AI 마케팅 도구 콘텐츠 제작. 이번 달: 일본어 자막 추가, Shorts 비중 40% 확대. 분기 내: 커뮤니티 기능 강화, 라이브 스트리밍 월 2회.",
      },
    ],
  };
}
