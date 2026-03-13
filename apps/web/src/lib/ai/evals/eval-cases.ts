// ─────────────────────────────────────────────────────────────
// AI Eval Cases — 태스크별 샘플 평가 케이스
// ─────────────────────────────────────────────────────────────

import type { AiEvalCase } from "../types";

export const SAMPLE_EVAL_CASES: AiEvalCase[] = [
  // ── 1. 댓글 감성 분석 ──
  {
    id: "eval-comment_sentiment_analysis-001",
    taskType: "comment_sentiment_analysis",
    language: "ko",
    name: "댓글 감성 분석 기본 테스트",
    description:
      "긍정/부정/중립이 혼합된 댓글 세트의 감성 분류 정확도를 평가합니다.",
    sampleInput: {
      comments: [
        "이 제품 정말 좋아요! 피부가 확 달라졌어요",
        "배송이 너무 느려요. 일주일이나 걸렸습니다",
        "가격 대비 괜찮은 것 같아요",
        "다시는 안 삽니다. 품질이 너무 떨어져요",
        "선물로 샀는데 포장이 예뻐서 좋았습니다",
      ],
    },
    expectedOutputStyle:
      "각 댓글의 감성을 긍정/부정/중립으로 분류하고, 전체 감성 분포 요약을 포함",
    criteria: {
      relevance: {
        weight: 0.3,
        description: "각 댓글의 감성이 올바르게 분류되었는가",
      },
      clarity: {
        weight: 0.2,
        description: "분석 결과가 명확하고 이해하기 쉬운가",
      },
      actionability: {
        weight: 0.1,
        description: "분석 결과로 개선점을 도출할 수 있는가",
      },
      safety: { weight: 0.1, description: "편향 없이 객관적으로 분석했는가" },
      koreanNaturalness: {
        weight: 0.15,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: {
        weight: 0.15,
        description: "출력 JSON 구조가 올바른가",
      },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 2. 댓글 주제 분류 ──
  {
    id: "eval-comment_topic_classification-001",
    taskType: "comment_topic_classification",
    language: "ko",
    name: "댓글 주제 분류 기본 테스트",
    description:
      "다양한 주제의 댓글을 올바른 카테고리로 분류하는 능력을 평가합니다.",
    sampleInput: {
      comments: [
        "가격이 너무 비싸요",
        "고객센터 전화 응대가 친절했어요",
        "제품 색상이 사진과 달라요",
        "환불 절차가 너무 복잡합니다",
        "신제품 출시일이 언제인가요?",
      ],
      categories: ["가격", "고객서비스", "제품품질", "배송", "문의"],
    },
    expectedOutputStyle:
      "각 댓글을 적절한 카테고리에 분류하고, 카테고리별 댓글 수 통계를 제공",
    criteria: {
      relevance: { weight: 0.35, description: "주제 분류가 정확한가" },
      clarity: {
        weight: 0.2,
        description: "분류 결과가 명확하게 제시되었는가",
      },
      actionability: {
        weight: 0.1,
        description: "분류 결과가 업무에 활용 가능한가",
      },
      safety: { weight: 0.05, description: "분류에 편향이 없는가" },
      koreanNaturalness: {
        weight: 0.15,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: {
        weight: 0.15,
        description: "출력 JSON 구조가 올바른가",
      },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 3. 댓글 위험도 평가 ──
  {
    id: "eval-comment_risk_assessment-001",
    taskType: "comment_risk_assessment",
    language: "ko",
    name: "댓글 위험도 평가 테스트",
    description:
      "혐오 발언, 개인 공격 등 위험 댓글을 정확히 식별하는 능력을 평가합니다.",
    sampleInput: {
      comments: [
        "이 브랜드 정말 최악이에요",
        "관계자 나와라 당장! 집 알아냈다",
        "소비자를 우롱하는 사기 업체",
        "제품은 괜찮은데 배송이 좀 늦었네요",
        "불매운동 합시다. 링크 공유해주세요",
      ],
    },
    expectedOutputStyle:
      "각 댓글의 위험 수준(높음/중간/낮음)을 판정하고, 위험 유형(혐오, 협박, 허위정보 등)을 분류",
    criteria: {
      relevance: { weight: 0.3, description: "위험 댓글을 정확히 식별했는가" },
      clarity: { weight: 0.15, description: "위험 판정 근거가 명확한가" },
      actionability: { weight: 0.15, description: "대응 방안이 제시되었는가" },
      safety: { weight: 0.2, description: "과잉 판정 없이 적절히 평가했는가" },
      koreanNaturalness: {
        weight: 0.1,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 4. 답변 제안 생성 ──
  {
    id: "eval-reply_suggestion_generation-001",
    taskType: "reply_suggestion_generation",
    language: "ko",
    name: "답변 제안 생성 테스트",
    description:
      "고객 댓글에 대한 브랜드 톤 맞춤 답변 제안의 품질을 평가합니다.",
    sampleInput: {
      comment: "제품 받았는데 파손되어 왔어요. 환불해주세요.",
      brandTone: "정중하고 공감적인 톤",
      brandName: "뷰티코리아",
    },
    expectedOutputStyle:
      "2~3개의 답변 후보를 생성하며, 공감 표현과 해결 방안을 포함한 브랜드 친화적 톤",
    criteria: {
      relevance: {
        weight: 0.25,
        description: "고객 불만에 적절히 대응하는 답변인가",
      },
      clarity: { weight: 0.2, description: "답변이 명확하고 이해하기 쉬운가" },
      actionability: {
        weight: 0.2,
        description: "구체적 해결 방안을 제시하는가",
      },
      safety: { weight: 0.15, description: "브랜드 안전한 표현을 사용하는가" },
      koreanNaturalness: {
        weight: 0.1,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 5. FAQ 추출 ──
  {
    id: "eval-faq_extraction-001",
    taskType: "faq_extraction",
    language: "ko",
    name: "FAQ 추출 테스트",
    description: "댓글에서 자주 묻는 질문을 정확히 추출하는 능력을 평가합니다.",
    sampleInput: {
      comments: [
        "이 제품 민감성 피부에도 괜찮나요?",
        "성분표 어디서 확인할 수 있어요?",
        "유통기한이 어떻게 되나요?",
        "민감한 피부인데 사용해도 될까요?",
        "성분이 궁금해요. 어디서 볼 수 있나요?",
        "제품 너무 좋아요!",
        "피부 트러블 나면 교환 가능한가요?",
      ],
    },
    expectedOutputStyle:
      "중복 질문을 병합하여 3~5개의 FAQ 항목으로 정리하고 빈도순 정렬",
    criteria: {
      relevance: {
        weight: 0.3,
        description: "주요 질문을 빠짐없이 추출했는가",
      },
      clarity: { weight: 0.25, description: "FAQ가 명확하게 정리되었는가" },
      actionability: { weight: 0.15, description: "답변 작성에 활용 가능한가" },
      safety: { weight: 0.05, description: "민감 정보가 포함되지 않았는가" },
      koreanNaturalness: {
        weight: 0.1,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: {
        weight: 0.15,
        description: "출력 JSON 구조가 올바른가",
      },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 6. 경쟁사 인사이트 ──
  {
    id: "eval-competitor_insight_generation-001",
    taskType: "competitor_insight_generation",
    language: "ko",
    name: "경쟁사 인사이트 생성 테스트",
    description:
      "경쟁사 관련 데이터에서 유의미한 인사이트를 도출하는 능력을 평가합니다.",
    sampleInput: {
      competitorName: "글로벌뷰티",
      mentions: [
        { text: "글로벌뷰티 신제품 가격이 확 올랐네요", sentiment: "negative" },
        { text: "글로벌뷰티 리뉴얼 디자인 예쁘다", sentiment: "positive" },
        { text: "글로벌뷰티 성분 논란 기사 봤어요", sentiment: "negative" },
      ],
      period: "2026-02",
    },
    expectedOutputStyle:
      "경쟁사의 강점/약점, 소비자 반응 트렌드, 시사점을 구조화하여 제시",
    criteria: {
      relevance: {
        weight: 0.3,
        description: "경쟁사 분석이 데이터에 기반하는가",
      },
      clarity: { weight: 0.2, description: "인사이트가 명확하게 전달되는가" },
      actionability: {
        weight: 0.2,
        description: "전략 수립에 활용 가능한 인사이트인가",
      },
      safety: { weight: 0.1, description: "근거 없는 단정을 피하는가" },
      koreanNaturalness: {
        weight: 0.1,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 7. 리스닝 인사이트 ──
  {
    id: "eval-listening_insight_generation-001",
    taskType: "listening_insight_generation",
    language: "ko",
    name: "소셜 리스닝 인사이트 테스트",
    description:
      "소셜 미디어 데이터에서 트렌드와 인사이트를 도출하는 능력을 평가합니다.",
    sampleInput: {
      brandName: "뷰티코리아",
      mentionCount: 1520,
      sentimentDistribution: { positive: 0.45, neutral: 0.35, negative: 0.2 },
      topKeywords: ["보습", "가성비", "트러블", "향기", "패키지"],
      period: "2026-02",
    },
    expectedOutputStyle:
      "핵심 트렌드 3~5개와 각 트렌드의 근거 데이터, 권장 대응 방안을 포함",
    criteria: {
      relevance: { weight: 0.25, description: "데이터에 기반한 인사이트인가" },
      clarity: { weight: 0.2, description: "트렌드가 명확하게 설명되었는가" },
      actionability: {
        weight: 0.25,
        description: "실행 가능한 대응 방안을 제시하는가",
      },
      safety: { weight: 0.1, description: "과도한 확신이나 편향이 없는가" },
      koreanNaturalness: {
        weight: 0.1,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 8. 전략 인사이트 ──
  {
    id: "eval-strategy_insight_generation-001",
    taskType: "strategy_insight_generation",
    language: "ko",
    name: "전략 인사이트 생성 테스트",
    description:
      "분석 데이터를 기반으로 마케팅 전략 인사이트를 생성하는 능력을 평가합니다.",
    sampleInput: {
      brandName: "뷰티코리아",
      channelStats: {
        instagram: { followers: 52000, engagementRate: 0.035, growth: 0.12 },
        youtube: { subscribers: 15000, avgViews: 8500, growth: 0.08 },
      },
      topPerformingContent: [
        "보습 루틴 영상",
        "성분 비교 카드뉴스",
        "고객 후기 리그램",
      ],
      period: "2026-Q1",
    },
    expectedOutputStyle:
      "채널별 전략 제안, 콘텐츠 방향성, KPI 목표를 근거 데이터와 함께 제시",
    criteria: {
      relevance: { weight: 0.25, description: "데이터에 기반한 전략 제안인가" },
      clarity: { weight: 0.15, description: "전략이 명확하게 구조화되었는가" },
      actionability: {
        weight: 0.25,
        description: "실행 가능한 구체적 전략인가",
      },
      safety: { weight: 0.15, description: "근거 없는 확언을 피하는가" },
      koreanNaturalness: {
        weight: 0.1,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 9. 보고서 요약 ──
  {
    id: "eval-report_summary_generation-001",
    taskType: "report_summary_generation",
    language: "ko",
    name: "보고서 요약 생성 테스트",
    description:
      "상세 분석 보고서를 경영진용 요약으로 압축하는 능력을 평가합니다.",
    sampleInput: {
      reportTitle: "2026년 2월 소셜 미디어 성과 보고서",
      sections: [
        {
          title: "채널 성과",
          content:
            "인스타그램 팔로워 5.2만, 전월 대비 12% 증가. 유튜브 구독자 1.5만, 8% 증가.",
        },
        {
          title: "콘텐츠 분석",
          content:
            "보습 관련 콘텐츠 참여율 최고(4.2%). 릴스 평균 조회수 1.2만.",
        },
        {
          title: "고객 반응",
          content: "긍정 반응 45%, 부정 20%. 주요 불만: 가격 인상, 배송 지연.",
        },
      ],
    },
    expectedOutputStyle:
      "3~5줄의 핵심 요약과 주요 지표 하이라이트, 권장 조치 사항을 포함",
    criteria: {
      relevance: {
        weight: 0.3,
        description: "핵심 내용을 빠짐없이 요약했는가",
      },
      clarity: {
        weight: 0.25,
        description: "경영진이 빠르게 파악 가능한 요약인가",
      },
      actionability: { weight: 0.15, description: "다음 단계 액션이 명확한가" },
      safety: { weight: 0.05, description: "데이터 왜곡이 없는가" },
      koreanNaturalness: {
        weight: 0.15,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 10. 보고서 액션 추천 ──
  {
    id: "eval-report_action_recommendation-001",
    taskType: "report_action_recommendation",
    language: "ko",
    name: "액션 추천 생성 테스트",
    description:
      "분석 결과를 기반으로 구체적 실행 과제를 추천하는 능력을 평가합니다.",
    sampleInput: {
      insights: [
        "인스타그램 릴스 참여율이 일반 게시물 대비 3배 높음",
        "고객 불만 중 '배송 지연' 관련이 35%로 가장 높음",
        "20대 여성 타겟 콘텐츠의 전환율이 가장 높음",
      ],
      currentStrategy: "주 3회 인스타그램 포스팅, 월 2회 유튜브 영상 업로드",
      budget: "월 500만원",
    },
    expectedOutputStyle:
      "우선순위별 3~5개 액션 아이템과 예상 효과, 필요 리소스, 일정을 포함",
    criteria: {
      relevance: { weight: 0.25, description: "인사이트에 기반한 액션인가" },
      clarity: { weight: 0.15, description: "액션이 명확하게 정의되었는가" },
      actionability: {
        weight: 0.3,
        description: "즉시 실행 가능한 구체적 내용인가",
      },
      safety: {
        weight: 0.1,
        description: "과도한 확언이나 비현실적 약속이 없는가",
      },
      koreanNaturalness: {
        weight: 0.1,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 11. 대시보드 설명 ──
  {
    id: "eval-dashboard_explanation-001",
    taskType: "dashboard_explanation",
    language: "ko",
    name: "대시보드 지표 설명 테스트",
    description:
      "대시보드 수치를 비전문가도 이해할 수 있게 설명하는 능력을 평가합니다.",
    sampleInput: {
      metricName: "참여율(Engagement Rate)",
      currentValue: 0.035,
      previousValue: 0.028,
      changePercent: 25,
      context: "인스타그램 채널, 지난 30일 기준",
    },
    expectedOutputStyle:
      "지표의 의미, 변화 원인 추정, 업계 평균과의 비교를 쉬운 한국어로 설명",
    criteria: {
      relevance: { weight: 0.25, description: "지표를 정확하게 설명하는가" },
      clarity: {
        weight: 0.3,
        description: "비전문가도 이해할 수 있는 설명인가",
      },
      actionability: {
        weight: 0.1,
        description: "개선을 위한 힌트를 제공하는가",
      },
      safety: { weight: 0.05, description: "오해를 유발하는 표현이 없는가" },
      koreanNaturalness: {
        weight: 0.2,
        description: "한국어 표현이 자연스러운가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },

  // ── 12. 사용자 도움 답변 ──
  {
    id: "eval-user_help_answer-001",
    taskType: "user_help_answer",
    language: "ko",
    name: "사용자 질문 답변 테스트",
    description:
      "플랫폼 사용 관련 질문에 정확하고 친절하게 답변하는 능력을 평가합니다.",
    sampleInput: {
      question: "인스타그램 채널을 연동하려면 어떻게 해야 하나요?",
      userContext: {
        plan: "pro",
        connectedChannels: ["youtube"],
      },
    },
    expectedOutputStyle:
      "단계별 안내와 함께 주의사항, 관련 도움말 링크 등을 친절한 톤으로 제공",
    criteria: {
      relevance: { weight: 0.3, description: "질문에 정확하게 답변하는가" },
      clarity: { weight: 0.25, description: "단계별 안내가 명확한가" },
      actionability: {
        weight: 0.15,
        description: "사용자가 즉시 따라할 수 있는가",
      },
      safety: { weight: 0.05, description: "잘못된 안내가 없는가" },
      koreanNaturalness: {
        weight: 0.15,
        description: "한국어 표현이 자연스럽고 친절한가",
      },
      schemaValidity: { weight: 0.1, description: "출력 JSON 구조가 올바른가" },
    },
    createdAt: "2026-03-01T00:00:00.000Z",
  },
];
