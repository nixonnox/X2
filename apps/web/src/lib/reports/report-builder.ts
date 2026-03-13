// ─────────────────────────────────────────────────────────────
// Report Builder — 리포트 생성 파이프라인
// ─────────────────────────────────────────────────────────────

import type {
  Report,
  ReportSection,
  ReportKpiSummary,
  ReportInsight,
  ReportActionRecommendation,
  ReportCreateInput,
  ReportGenerationResult,
  SectionType,
} from "./types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Section Composers ──

function composeOverview(input: ReportCreateInput): ReportSection {
  return {
    id: uid(),
    type: "overview",
    title: "리포트 개요",
    order: 0,
    enabled: true,
    content: `${input.projectName} 프로젝트의 ${input.periodStart} ~ ${input.periodEnd} 기간 분석 리포트입니다. 이 리포트는 채널 성과, 콘텐츠 분석, 댓글 감성, 경쟁 분석 등 종합적인 인사이트를 제공합니다.`,
    highlights: [
      `분석 기간: ${input.periodStart} ~ ${input.periodEnd}`,
      `대상: ${input.projectName}`,
      `생성일: ${new Date().toLocaleDateString("ko-KR")}`,
    ],
  };
}

function composeKpiSection(): ReportSection {
  return {
    id: uid(),
    type: "kpi_summary",
    title: "핵심 KPI",
    order: 1,
    enabled: true,
    content: "이번 기간의 핵심 성과 지표를 요약합니다.",
    highlights: [
      "총 조회수가 전 기간 대비 12.5% 증가했습니다.",
      "참여율이 4.2%로 업계 평균(3.1%)을 상회합니다.",
      "구독자가 1,240명 순증했습니다.",
    ],
  };
}

function composeKeyFindings(): ReportSection {
  return {
    id: uid(),
    type: "key_findings",
    title: "주요 발견",
    order: 2,
    enabled: true,
    content: "이번 기간에 발견된 핵심 변화와 주목할 점입니다.",
    highlights: [
      "쇼츠 콘텐츠의 평균 조회수가 긴 영상 대비 2.3배 높았습니다.",
      "수요일/목요일 업로드 콘텐츠의 참여율이 가장 높았습니다.",
      "댓글 중 '가격' 관련 문의가 전 기간 대비 45% 증가했습니다.",
      "경쟁 채널 대비 업로드 빈도가 20% 낮은 상황입니다.",
    ],
  };
}

function composeChannelAnalysis(): ReportSection {
  return {
    id: uid(),
    type: "channel_analysis",
    title: "채널 분석 요약",
    order: 3,
    enabled: true,
    content:
      "등록된 채널의 전반적인 성과를 분석합니다. 구독자 성장, 조회수 추이, 콘텐츠 유형별 성과를 확인하세요.",
    highlights: [
      "YouTube 메인 채널: 구독자 125,400명 (+2.1%)",
      "Instagram: 팔로워 45,200명 (+3.5%)",
      "TikTok: 팔로워 28,900명 (+8.2%, 가장 빠른 성장)",
    ],
  };
}

function composeCommentAnalysis(): ReportSection {
  return {
    id: uid(),
    type: "comment_analysis",
    title: "댓글 분석 요약",
    order: 4,
    enabled: true,
    content: "수집된 댓글의 감성 분포와 주요 토픽을 분석합니다.",
    highlights: [
      "긍정 댓글 비율: 62% (전 기간 58%에서 상승)",
      "부정 댓글 비율: 8% (안정적 수준)",
      "주요 토픽: 제품 문의(34%), 칭찬(28%), 개선 요청(15%)",
      "고위험 댓글 3건 발견 — 즉시 대응 권장",
    ],
  };
}

function composeCompetitorAnalysis(): ReportSection {
  return {
    id: uid(),
    type: "competitor_analysis",
    title: "경쟁 분석 요약",
    order: 5,
    enabled: true,
    content: "등록된 경쟁 채널과의 주요 지표를 비교합니다.",
    highlights: [
      "구독자 성장률: 우리 +2.1% vs 경쟁 평균 +1.8%",
      "참여율: 우리 4.2% vs 경쟁 평균 3.5%",
      "업로드 빈도: 우리 주 2회 vs 경쟁 평균 주 3회 (개선 필요)",
    ],
  };
}

function composeSocialListening(): ReportSection {
  return {
    id: uid(),
    type: "social_listening",
    title: "소셜 리스닝 요약",
    order: 6,
    enabled: true,
    content: "등록된 키워드의 언급량과 감성 추이를 분석합니다.",
    highlights: [
      "브랜드 언급량: 1,240건 (전주 대비 +15%)",
      "긍정 감성 비율: 71%",
      "주요 언급 채널: YouTube(45%), 블로그(30%), 커뮤니티(25%)",
    ],
  };
}

function composeAiInsights(): ReportSection {
  return {
    id: uid(),
    type: "ai_insights",
    title: "AI 전략 인사이트",
    order: 7,
    enabled: true,
    content: "AI가 분석한 데이터 기반 전략적 인사이트입니다.",
    highlights: [
      "쇼츠 콘텐츠 비중을 현재 20%에서 35%로 높이면 총 조회수 25% 향상 예상",
      "수요일 오후 3시 업로드 시 최적 참여율 달성 가능",
      "경쟁사 대비 '튜토리얼' 형식 콘텐츠에서 차별화 기회 존재",
    ],
  };
}

function composeRecommendedActions(): ReportSection {
  return {
    id: uid(),
    type: "recommended_actions",
    title: "추천 액션",
    order: 8,
    enabled: true,
    content: "이번 기간 분석을 바탕으로 실행 가능한 추천 행동입니다.",
    highlights: [
      "쇼츠 콘텐츠 주 1회 → 주 2회로 증가",
      "고위험 댓글 3건 즉시 대응",
      "업로드 시간 최적화 (수/목 오후 3시)",
      "경쟁사 대비 업로드 빈도 격차 축소",
    ],
  };
}

function composeAppendix(): ReportSection {
  return {
    id: uid(),
    type: "appendix",
    title: "부록",
    order: 9,
    enabled: true,
    content: "참고 데이터 및 메타 정보입니다.",
    highlights: [
      "데이터 수집 기간: 분석 기간과 동일",
      "분석 대상 채널: 전체 등록 채널",
      "AI 모델: GPT-4o 기반 전략 분석",
      "리포트 자동 생성: X2 Report Engine v1.0",
    ],
  };
}

const SECTION_COMPOSERS: Record<
  SectionType,
  (input: ReportCreateInput) => ReportSection
> = {
  overview: composeOverview,
  kpi_summary: composeKpiSection,
  key_findings: composeKeyFindings,
  channel_analysis: composeChannelAnalysis,
  comment_analysis: composeCommentAnalysis,
  competitor_analysis: composeCompetitorAnalysis,
  social_listening: composeSocialListening,
  ai_insights: composeAiInsights,
  recommended_actions: composeRecommendedActions,
  appendix: composeAppendix,
};

// ── KPI Builder ──

function buildKpiSummary(): ReportKpiSummary {
  return {
    totalViews: { value: 485200, change: 12.5, changeLabel: "+12.5%" },
    engagementRate: { value: 4.2, change: 0.8, changeLabel: "+0.8%p" },
    followerChange: { value: 1240, change: 15.3, changeLabel: "+15.3%" },
    commentCount: { value: 892, change: -3.2, changeLabel: "-3.2%" },
    negativeRatio: { value: 8, change: -2.0, changeLabel: "-2.0%p" },
    mentionCount: { value: 1240, change: 15.0, changeLabel: "+15.0%" },
  };
}

// ── Insight Builder ──

function buildInsights(): ReportInsight[] {
  return [
    {
      id: uid(),
      category: "positive",
      title: "쇼츠 콘텐츠 성과 급등",
      description:
        "쇼츠 형식 콘텐츠의 평균 조회수가 긴 영상 대비 2.3배 높은 성과를 기록했습니다.",
      impact: "high",
      source: "콘텐츠 분석",
    },
    {
      id: uid(),
      category: "opportunity",
      title: "튜토리얼 콘텐츠 블루오션",
      description:
        "경쟁사 대비 '튜토리얼' 형식 콘텐츠에서 차별화 기회가 있습니다. 관련 검색량은 높으나 콘텐츠 공급은 부족합니다.",
      impact: "high",
      source: "경쟁 분석",
    },
    {
      id: uid(),
      category: "caution",
      title: "가격 문의 댓글 급증",
      description:
        "가격 관련 문의 댓글이 전 기간 대비 45% 증가했습니다. FAQ 콘텐츠 또는 고정 댓글로 대응을 권장합니다.",
      impact: "medium",
      source: "댓글 분석",
    },
    {
      id: uid(),
      category: "positive",
      title: "브랜드 언급 긍정 비율 상승",
      description:
        "소셜 미디어 내 브랜드 언급 중 긍정 감성 비율이 71%로 전 기간(65%) 대비 상승했습니다.",
      impact: "medium",
      source: "소셜 리스닝",
    },
    {
      id: uid(),
      category: "risk",
      title: "업로드 빈도 경쟁 격차",
      description:
        "경쟁 채널 대비 주간 업로드 빈도가 20% 낮습니다. 알고리즘 노출에 부정적 영향을 줄 수 있습니다.",
      impact: "high",
      source: "경쟁 분석",
    },
  ];
}

// ── Action Builder ──

function buildActions(): ReportActionRecommendation[] {
  return [
    {
      id: uid(),
      action: "쇼츠 콘텐츠 주 2회 발행",
      reason: "쇼츠의 평균 조회수가 긴 영상 대비 2.3배 높음",
      priority: "high",
      expectedImpact: "총 조회수 25% 향상 예상",
      deadline: "이번 주",
    },
    {
      id: uid(),
      action: "고위험 댓글 3건 즉시 대응",
      reason: "부정적 확산 방지 및 커뮤니티 관리",
      priority: "critical",
      expectedImpact: "부정 감성 비율 2%p 감소 예상",
      deadline: "오늘",
    },
    {
      id: uid(),
      action: "수/목 오후 3시 업로드 시간 최적화",
      reason: "데이터 기반 최적 참여율 시간대",
      priority: "medium",
      expectedImpact: "참여율 0.5%p 향상 예상",
      deadline: "다음 주",
    },
    {
      id: uid(),
      action: "튜토리얼 시리즈 기획",
      reason: "경쟁사 대비 차별화 기회",
      priority: "high",
      expectedImpact: "신규 구독자 유입 증가 예상",
      deadline: "2주 내",
    },
    {
      id: uid(),
      action: "가격 FAQ 콘텐츠 또는 고정 댓글 추가",
      reason: "가격 문의 댓글 45% 증가",
      priority: "medium",
      expectedImpact: "반복 문의 30% 감소 예상",
      deadline: "이번 주",
    },
  ];
}

// ── Main Builder ──

export function buildReport(input: ReportCreateInput): Report {
  const sections = input.sections.map((sectionType) => {
    const composer = SECTION_COMPOSERS[sectionType];
    return composer ? composer(input) : composeOverview(input);
  });

  const report: Report = {
    id: `rpt-${uid()}`,
    title: input.title,
    description: input.description,
    type: input.type,
    status: "ready",
    projectName: input.projectName,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    sections,
    kpiSummary: buildKpiSummary(),
    insights: buildInsights(),
    actions: buildActions(),
    shareLink: null,
    deliveries: [],
    scheduleId: null,
    generatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return report;
}

export function getGenerationResult(
  report: Report,
  startTime: number,
): ReportGenerationResult {
  return {
    success: report.status !== "failed",
    reportId: report.id,
    durationMs: Date.now() - startTime,
    sectionCount: report.sections.length,
  };
}
