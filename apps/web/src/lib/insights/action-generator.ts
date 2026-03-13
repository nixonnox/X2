import type { ActionRecommendation } from "./types";

/**
 * Generates prioritized, actionable recommendations
 * derived from insights and strategies.
 */
export function generateActions(): ActionRecommendation[] {
  return [
    {
      id: "act-001",
      action: "TikTok Shorts 주 3회 업로드",
      description:
        "숏폼 참여율이 2.3배 높은 데이터를 기반으로, TikTok/Shorts 업로드 빈도를 주 3회로 유지합니다.",
      priority: "critical",
      expectedImpact: "참여율 40% 향상",
      category: "Content",
      dueLabel: "This week",
      completed: false,
    },
    {
      id: "act-002",
      action: "고위험 댓글 24시간 내 응답",
      description:
        "부정 댓글 비율 증가에 대응하여 고위험 댓글에 24시간 내 응답하는 SLA를 설정합니다.",
      priority: "critical",
      expectedImpact: "부정 비율 4pp 감소",
      category: "Community",
      dueLabel: "Today",
      completed: false,
    },
    {
      id: "act-003",
      action: "'AI 마케팅 도구' 키워드 콘텐츠 제작",
      description:
        "검색량 120% 증가한 트렌딩 키워드를 타겟으로 SEO 최적화 콘텐츠를 제작합니다.",
      priority: "high",
      expectedImpact: "검색 유입 30% 증가",
      category: "SEO",
      dueLabel: "This week",
      completed: false,
    },
    {
      id: "act-004",
      action: "업로드 시간 20-22시 KST 고정",
      description: "데이터 분석 결과 해당 시간대의 초기 조회수가 45% 높습니다.",
      priority: "high",
      expectedImpact: "초기 조회수 45% 향상",
      category: "Scheduling",
      dueLabel: "Ongoing",
      completed: false,
    },
    {
      id: "act-005",
      action: "인기 콘텐츠 일본어 자막 추가",
      description:
        "일본 시청자 비율이 15%로 급성장 중이므로 상위 10개 콘텐츠에 자막을 추가합니다.",
      priority: "high",
      expectedImpact: "일본 시청자 +10pp",
      category: "Localization",
      dueLabel: "Next 2 weeks",
      completed: false,
    },
    {
      id: "act-006",
      action: "Shorts 콘텐츠 비중 40%로 확대",
      description:
        "현재 25%인 숏폼 비중을 40%로 확대하여 플랫폼 알고리즘 노출을 극대화합니다.",
      priority: "medium",
      expectedImpact: "신규 구독자 +5K/월",
      category: "Content",
      dueLabel: "This month",
      completed: false,
    },
    {
      id: "act-007",
      action: "경쟁 채널 콘텐츠 전략 월간 리뷰",
      description:
        "주요 경쟁 채널의 콘텐츠 트렌드를 월 1회 분석하여 차별화 기회를 발굴합니다.",
      priority: "medium",
      expectedImpact: "전략 적시성 향상",
      category: "Competitive",
      dueLabel: "Monthly",
      completed: false,
    },
    {
      id: "act-008",
      action: "커뮤니티 탭 주간 투표 시작",
      description:
        "팬 참여도를 높이기 위해 커뮤니티 탭에서 주간 투표를 진행합니다.",
      priority: "low",
      expectedImpact: "팬 참여도 20% 향상",
      category: "Community",
      dueLabel: "Next month",
      completed: false,
    },
  ];
}
