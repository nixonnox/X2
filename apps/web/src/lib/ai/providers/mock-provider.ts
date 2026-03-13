// ─────────────────────────────────────────────────────────────
// Mock Provider — 개발/테스트용 모의 프로바이더
// ─────────────────────────────────────────────────────────────

import type {
  IAiProvider,
  AiProviderType,
  AiModelConfig,
  AiGenerateOptions,
  AiGenerateResult,
} from "../types";

// ── Mock 모델 카탈로그 (비용 없음) ──
const MOCK_MODELS: AiModelConfig[] = [
  {
    modelId: "mock-standard",
    provider: "mock",
    tier: "standard",
    displayName: "Mock Standard",
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    supportsStructuredOutput: true,
    supportsStreaming: false,
    defaultTemperature: 0.7,
  },
];

// ── 태스크 유형별 한국어 모의 응답 ──
const MOCK_RESPONSES: Record<string, string> = {
  // 감성 분석
  comment_sentiment_analysis:
    "전반적으로 긍정적인 반응이 우세합니다. 전체 댓글 중 약 68%가 긍정적이며, 부정적 반응은 12%에 불과합니다. 특히 제품 품질과 고객 서비스에 대한 만족도가 높게 나타났습니다. 다만, 배송 속도에 대한 개선 요구가 일부 확인됩니다.",

  // 토픽 분류
  comment_topic_classification:
    "주요 토픽 분류 결과: 제품 리뷰(35%), 고객 서비스(22%), 가격 비교(18%), 이벤트/프로모션(15%), 기타(10%). 최근 1주간 '신제품 출시'와 관련된 언급이 급증하고 있습니다.",

  // 리스크 평가
  comment_risk_assessment:
    "현재 리스크 수준은 '낮음'으로 평가됩니다. 부정적 버즈 비율이 안정적이며, 위기 확산 가능성이 낮은 상태입니다. 다만 경쟁사 마케팅 캠페인 시작 시 모니터링 강화가 권장됩니다.",

  // 답변 제안
  reply_suggestion_generation:
    '다음과 같은 답변을 제안합니다:\n\n1. "안녕하세요! 소중한 의견 감사합니다. 말씀하신 부분은 현재 개선 작업 중이며, 빠른 시일 내에 반영하겠습니다."\n\n2. "고객님의 피드백에 감사드립니다. 더 나은 서비스를 위해 항상 노력하겠습니다."',

  // FAQ 추출
  faq_extraction:
    "자주 묻는 질문 추출 결과:\n\n1. 배송 기간은 얼마나 걸리나요?\n2. 환불 절차는 어떻게 되나요?\n3. 회원 등급별 혜택은 무엇인가요?\n4. 포인트 적립률은 얼마인가요?\n5. A/S 접수 방법을 알려주세요.",

  // 경쟁사 인사이트
  competitor_insight_generation:
    "경쟁사 분석 결과, 주요 경쟁사 A는 최근 소셜 미디어 마케팅 예산을 30% 증가시켰으며, 인플루언서 협업 전략을 강화하고 있습니다. 가격 경쟁력 측면에서는 당사가 우위를 유지하고 있으나, UX 개선에 투자가 필요합니다.",

  // 리스닝 인사이트
  listening_insight_generation:
    "소셜 리스닝 분석 결과, 브랜드 언급량이 전주 대비 15% 증가했습니다. 주요 채널별로 Instagram(40%), Twitter(30%), 블로그(20%), 커뮤니티(10%) 순으로 분포합니다. 긍정적 감성 비율이 72%로 양호한 수준입니다.",

  // 전략 인사이트
  strategy_insight_generation:
    "현재 데이터를 기반으로 다음 전략을 제안합니다:\n\n1. 콘텐츠 전략: 사용자 생성 콘텐츠(UGC) 활용 강화\n2. 타이밍 최적화: 오후 7-9시 게시물 집중\n3. 채널 전략: 단기적으로 Instagram Reels에 집중 투자\n4. 타겟팅: 25-34세 여성 세그먼트 확대",

  // 리포트 요약
  report_summary_generation:
    "분석 기간 동안 주요 지표가 상승 추세를 보였습니다. 총 도달률은 전월 대비 23% 증가하였으며, 참여율(Engagement Rate)은 4.2%로 업계 평균(3.1%)을 상회합니다. 팔로워 증가율은 월 5.8%로 안정적인 성장세를 유지하고 있습니다.",

  // 액션 추천
  report_action_recommendation:
    "즉시 실행 가능한 액션 아이템:\n\n1. [긴급] 부정 댓글 급증 게시물 3건에 대한 즉각 대응 필요\n2. [이번 주] 인기 게시물 형식을 활용한 신규 콘텐츠 3건 제작\n3. [이번 달] 인플루언서 협업 캠페인 기획 및 집행\n4. [장기] 커뮤니티 관리 가이드라인 수립",

  // 대시보드 설명
  dashboard_explanation:
    "이 대시보드는 소셜 미디어 채널별 성과를 종합적으로 보여줍니다. 상단의 핵심 지표(KPI)는 실시간으로 업데이트되며, 하단 차트는 시계열 추이를 나타냅니다. 색상 코드: 녹색은 목표 달성, 황색은 주의, 적색은 미달을 의미합니다.",

  // 사용자 도움 답변
  user_help_answer:
    "도움 요청에 대한 답변입니다. 해당 기능은 설정 > 분석 > 자동 리포트 메뉴에서 활성화할 수 있습니다. 주간/월간 단위로 자동 생성되며, 이메일 알림 설정도 가능합니다. 추가 질문이 있으시면 언제든 문의해 주세요.",
};

// ── 구조화된 출력용 모의 데이터 ──
const MOCK_STRUCTURED_RESPONSES: Record<string, Record<string, unknown>> = {
  comment_sentiment_analysis: {
    summary: "전반적으로 긍정적인 반응이 우세합니다.",
    confidence: 0.85,
    bullets: ["긍정 댓글 비율 68%", "부정 댓글 비율 12%", "중립 댓글 비율 20%"],
    recommendations: [
      "긍정 댓글을 활용한 UGC 콘텐츠 제작",
      "부정 댓글 패턴 분석 및 개선",
    ],
  },
  strategy_insight_generation: {
    title: "전략 인사이트 분석 결과",
    summary: "현재 데이터를 기반으로 다음 전략을 제안합니다.",
    confidence: 0.78,
    bullets: [
      "UGC 활용 강화 필요",
      "오후 7-9시 최적 게시 시간",
      "Instagram Reels 집중 투자 권장",
    ],
    recommendations: [
      "콘텐츠 캘린더 수립",
      "인플루언서 협업 확대",
      "A/B 테스트 진행",
    ],
    riskFlags: ["경쟁사 캠페인 시작으로 인한 주의 필요"],
  },
  report_summary_generation: {
    title: "월간 리포트 요약",
    summary: "분석 기간 동안 주요 지표가 상승 추세를 보였습니다.",
    confidence: 0.92,
    bullets: [
      "도달률 전월 대비 23% 증가",
      "참여율 4.2% (업계 평균 3.1%)",
      "팔로워 증가율 월 5.8%",
    ],
    recommendations: [
      "성과 좋은 콘텐츠 유형 확대 제작",
      "참여율 높은 시간대 집중 운영",
    ],
  },
};

export class MockProvider implements IAiProvider {
  readonly type: AiProviderType = "mock";
  readonly displayName = "Mock (개발용)";

  private latencyMs: number;

  constructor(latencyMs = 500) {
    this.latencyMs = latencyMs;
  }

  // ── 지연 시뮬레이션 ──
  private async simulateLatency(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }

  // ── 태스크 타입 추론: 메시지 내용에서 태스크 힌트 추출 ──
  private detectTaskType(messages: { content: string }[]): string {
    const combined = messages
      .map((m) => m.content)
      .join(" ")
      .toLowerCase();

    if (combined.includes("sentiment") || combined.includes("감성"))
      return "comment_sentiment_analysis";
    if (combined.includes("topic") || combined.includes("토픽"))
      return "comment_topic_classification";
    if (combined.includes("risk") || combined.includes("리스크"))
      return "comment_risk_assessment";
    if (combined.includes("reply") || combined.includes("답변"))
      return "reply_suggestion_generation";
    if (combined.includes("faq") || combined.includes("자주"))
      return "faq_extraction";
    if (combined.includes("competitor") || combined.includes("경쟁"))
      return "competitor_insight_generation";
    if (combined.includes("listening") || combined.includes("리스닝"))
      return "listening_insight_generation";
    if (combined.includes("strategy") || combined.includes("전략"))
      return "strategy_insight_generation";
    if (combined.includes("report") || combined.includes("리포트"))
      return "report_summary_generation";
    if (combined.includes("action") || combined.includes("액션"))
      return "report_action_recommendation";
    if (combined.includes("dashboard") || combined.includes("대시보드"))
      return "dashboard_explanation";
    if (combined.includes("help") || combined.includes("도움"))
      return "user_help_answer";

    return "report_summary_generation"; // 기본값
  }

  // ── 텍스트 생성: 태스크 유형별 모의 응답 반환 ──
  async generateText(options: AiGenerateOptions): Promise<AiGenerateResult> {
    await this.simulateLatency();

    const taskType = this.detectTaskType(options.messages);
    const text =
      MOCK_RESPONSES[taskType] ??
      MOCK_RESPONSES["report_summary_generation"] ??
      "Mock 응답입니다.";

    // 모의 토큰 수 계산 (대략적)
    const inputTokens = options.messages.reduce(
      (acc, m) => acc + m.content.length,
      0,
    );
    const outputTokens = text.length;

    return {
      text: text as string,
      inputTokens,
      outputTokens,
      model: options.model || "mock-standard",
      finishReason: "stop",
    };
  }

  // ── 구조화된 출력 생성: 태스크 유형별 모의 JSON 반환 ──
  async generateStructuredOutput<T>(
    options: AiGenerateOptions,
    _schema: Record<string, unknown>,
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
    await this.simulateLatency();

    const taskType = this.detectTaskType(options.messages);
    const structured = MOCK_STRUCTURED_RESPONSES[taskType] ??
      MOCK_STRUCTURED_RESPONSES["report_summary_generation"] ?? {
        summary: "모의 분석 결과입니다.",
        confidence: 0.8,
        bullets: ["항목 1", "항목 2", "항목 3"],
        recommendations: ["추천 사항 1", "추천 사항 2"],
      };

    const inputTokens = options.messages.reduce(
      (acc, m) => acc + m.content.length,
      0,
    );
    const outputTokens = JSON.stringify(structured).length;

    return {
      data: structured as T,
      inputTokens,
      outputTokens,
    };
  }

  // ── 헬스체크: 항상 정상 ──
  async healthCheck(): Promise<boolean> {
    return true;
  }

  // ── 비용 추정: 항상 무료 ──
  estimateCost(
    _inputTokens: number,
    _outputTokens: number,
    _model: string,
  ): number {
    return 0;
  }

  // ── 가용성: 항상 사용 가능 ──
  isAvailable(): boolean {
    return true;
  }

  // ── 모델 목록 반환 ──
  getModels(): AiModelConfig[] {
    return MOCK_MODELS;
  }
}
