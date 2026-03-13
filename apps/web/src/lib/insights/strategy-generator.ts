import type { Strategy } from "./types";

/**
 * Rule-based strategy generator.
 * Produces short/mid/long-term strategies based on aggregated data signals.
 */
export function generateStrategies(): Strategy[] {
  return [
    // ── Short Term (Next 2 weeks) ──
    {
      id: "str-st-001",
      timeframe: "short_term",
      title: "Shorts 콘텐츠 업로드 증가",
      description:
        "숏폼 참여율이 롱폼 대비 2.3배 높은 상황입니다. 다음 2주간 Shorts/Reels 업로드를 주 3회로 유지하고, 'AI 도구 리뷰' 시리즈를 시작하세요.",
      impact: "high",
      effort: "low",
      actions: [
        "Shorts 업로드 주 3회 유지",
        "'AI 도구 리뷰' 시리즈 기획",
        "최적 업로드 시간(20-22시) 준수",
      ],
      expectedOutcome: "참여율 40% 증가, 신규 구독자 5K+ 예상",
      confidence: 87,
    },
    {
      id: "str-st-002",
      timeframe: "short_term",
      title: "댓글 대응 강화",
      description:
        "부정 댓글 비율이 12%로 증가 추세입니다. AI 추천 답변을 활용한 24시간 내 응답 체계를 구축하여 커뮤니티 신뢰를 회복하세요.",
      impact: "high",
      effort: "medium",
      actions: [
        "댓글 응답 SLA 24시간 설정",
        "AI 추천 답변 활용 워크플로우 구축",
        "고위험 댓글 우선 대응 규칙 설정",
      ],
      expectedOutcome: "부정 댓글 비율 8% 이하로 감소 예상",
      confidence: 82,
    },
    {
      id: "str-st-003",
      timeframe: "short_term",
      title: "인기 키워드 콘텐츠 제작",
      description:
        "'AI 마케팅 도구' 검색량이 120% 증가했습니다. 이 키워드를 타겟으로 한 콘텐츠를 즉시 제작하여 검색 트래픽을 확보하세요.",
      impact: "medium",
      effort: "low",
      actions: [
        "'AI 마케팅 도구 TOP 5' 영상 제작",
        "SEO 최적화된 제목/설명 작성",
        "관련 키워드 태그 추가",
      ],
      expectedOutcome: "검색 유입 30% 증가 예상",
      confidence: 79,
    },

    // ── Mid Term (1-3 months) ──
    {
      id: "str-mt-001",
      timeframe: "mid_term",
      title: "콘텐츠 포맷 다양화",
      description:
        "현재 90%가 영상 콘텐츠입니다. 인포그래픽, 쓰레드, 라이브 스트리밍을 추가하여 다양한 소비 패턴의 시청자를 확보하세요.",
      impact: "high",
      effort: "medium",
      actions: [
        "월 2회 라이브 스트리밍 시작",
        "주요 콘텐츠 인포그래픽 버전 제작",
        "X(트위터) 쓰레드 콘텐츠 주 1회 발행",
      ],
      expectedOutcome: "신규 팔로워 채널 30% 다각화",
      confidence: 74,
    },
    {
      id: "str-mt-002",
      timeframe: "mid_term",
      title: "팬 커뮤니티 강화",
      description:
        "댓글 응답률이 경쟁 채널 대비 2.3배 높은 점이 핵심 차별화 포인트입니다. 이를 활용한 커뮤니티 기능을 강화하세요.",
      impact: "high",
      effort: "high",
      actions: [
        "커뮤니티 탭 활성화",
        "월 1회 Q&A 라이브 진행",
        "팬 투표 기반 콘텐츠 기획",
        "우수 팬 기여자 인정 프로그램",
      ],
      expectedOutcome: "구독자 충성도 40% 향상, 이탈률 감소",
      confidence: 71,
    },
    {
      id: "str-mt-003",
      timeframe: "mid_term",
      title: "일본 시장 콘텐츠 현지화",
      description:
        "일본 시청자가 15%로 급성장 중입니다. 자막 추가 및 일본어 콘텐츠 제작으로 이 시장을 적극 공략하세요.",
      impact: "very_high",
      effort: "high",
      actions: [
        "인기 콘텐츠 일본어 자막 추가",
        "일본 트렌드 키워드 분석",
        "일본 크리에이터 콜라보 기획",
      ],
      expectedOutcome: "일본 시청자 비중 25%까지 확대 예상",
      confidence: 68,
    },

    // ── Long Term (6-12 months) ──
    {
      id: "str-lt-001",
      timeframe: "long_term",
      title: "글로벌 팬 확보 전략",
      description:
        "한국(42%), 일본(15%), 동남아(12%) 중심의 시청자 구성을 글로벌로 확대합니다. 영어 콘텐츠와 현지화 전략으로 해외 비중을 50% 이상으로 확대하세요.",
      impact: "very_high",
      effort: "high",
      actions: [
        "영어 전용 콘텐츠 채널 개설",
        "다국어 자막 자동화 파이프라인 구축",
        "해외 크리에이터 네트워크 구축",
        "글로벌 트렌드 모니터링 강화",
      ],
      expectedOutcome: "해외 시청자 50% 달성, 글로벌 브랜드 인지도 확보",
      confidence: 62,
    },
    {
      id: "str-lt-002",
      timeframe: "long_term",
      title: "브랜드 캠페인 및 수익화 강화",
      description:
        "안정적인 구독자 기반을 활용하여 브랜드 파트너십과 유료 멤버십을 통한 수익 다각화를 추진하세요.",
      impact: "very_high",
      effort: "high",
      actions: [
        "유료 멤버십 티어 설계",
        "브랜드 파트너십 미디어킷 제작",
        "프리미엄 콘텐츠 기획",
        "스폰서십 단가 벤치마킹",
      ],
      expectedOutcome: "월 수익 3배 증가, 수익원 다각화",
      confidence: 58,
    },
  ];
}
