// ─────────────────────────────────────────────────────────────
// Intent Engine — Core Types (v2: ListeningMind-grade)
// 검색 의도 분석 · 검색 여정 매핑 · 소셜 콘텐츠 갭 분석
// ─────────────────────────────────────────────────────────────

// ── Enums & Literals ──

export type TemporalPhase = "before" | "current" | "after";

export type IntentCategory =
  | "discovery" // 정보 탐색
  | "comparison" // 비교/리뷰
  | "action" // 구매/행동
  | "troubleshooting" // 문제 해결
  | "unknown";

/** 세분화된 서브인텐트 */
export type SubIntent =
  | "definition" // ~란, ~뜻
  | "how_to" // ~방법, ~하는 법
  | "list" // ~추천, ~순위
  | "review" // 후기, 리뷰
  | "versus" // A vs B
  | "price" // 가격, 비용
  | "purchase" // 구매, 주문
  | "signup" // 가입, 등록
  | "error_fix" // 에러, 오류 해결
  | "refund" // 환불, 교환
  | "alternative" // 대안, 대체
  | "trend" // 트렌드, 동향
  | "experience" // 후기, 체험
  | "tutorial" // 튜토리얼, 가이드
  | "general"; // 일반

export type SocialPlatform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "naver_blog"
  | "google";

export type KeywordSource =
  | "seed"
  | "autocomplete"
  | "related"
  | "trend"
  | "suggestion"
  | "question" // 5W1H 질문형
  | "co_search" // 함께 검색되는 키워드
  | "naver_autocomplete"
  | "seasonal"; // 시즌 키워드

export type AnalysisJobStatus =
  | "queued"
  | "processing"
  | "expanding_keywords"
  | "collecting_volumes"
  | "aggregating_trends"
  | "classifying_intents"
  | "building_graph"
  | "detecting_clusters"
  | "completed"
  | "failed";

export type RelationshipType =
  | "autocomplete" // 자동완성 파생
  | "related" // 연관 검색어
  | "temporal" // 시간적 흐름 (before → current → after)
  | "semantic" // 의미적 유사
  | "co_search" // 함께 검색되는 키워드
  | "derived" // 일반 파생
  | "question" // 질문형 파생
  | "cluster"; // 동일 클러스터 내 연결

// ── Keyword Data ──

export type ExpandedKeyword = {
  keyword: string;
  source: KeywordSource;
  parentKeyword: string | null;
  depth: number; // 재귀 깊이 (seed = 0)
  searchVolume: number; // 월간 추정 검색량
  trend: "rising" | "stable" | "declining";
  trendScore: number; // -1.0 ~ 1.0 (음수: 하락, 양수: 상승)
  isRising: boolean; // 급상승 여부
  questionType?: string; // 5W1H 질문 유형
  seasonalPeak?: string; // 시즌 피크 월 (예: "12월")
};

// ── Trend Data ──

export type TrendDataPoint = {
  period: string; // "2025-01", "2025-02", ...
  volume: number; // 검색량 지수 (0-100)
  normalizedVolume: number; // 정규화 볼륨
};

export type TrendAnalysis = {
  keyword: string;
  dataPoints: TrendDataPoint[];
  overallTrend: "rising" | "stable" | "declining" | "seasonal";
  trendScore: number; // -1.0 ~ 1.0
  seasonality: number; // 0.0 ~ 1.0 (높을수록 시즌성 강함)
  peakMonths: number[]; // 피크 월 (1-12)
  yoyGrowth: number; // YoY 성장률 (%)
  isBreakout: boolean; // 급등 여부
};

// ── Social Volume ──

export type SocialVolumeEntry = {
  platform: SocialPlatform;
  keyword: string;
  contentCount: number; // 해시태그/키워드 관련 콘텐츠 수
  hashtagCount: number; // 해시태그 발행량
  estimatedReach: number; // 추정 도달 범위
  avgEngagement: number; // 평균 참여율 (0-100)
  contentFreshness: number; // 콘텐츠 신선도 (0-1, 최근 30일 비중)
  competitionDensity: number; // 경쟁 밀도 (0-100)
  collectedAt: string;
};

export type AggregatedSocialVolume = {
  keyword: string;
  totalContentCount: number;
  totalHashtagCount: number;
  totalReach: number;
  avgEngagement: number;
  avgFreshness: number;
  avgCompetitionDensity: number;
  platformBreakdown: SocialVolumeEntry[];
};

// ── Intent Classification ──

export type ClassifiedKeyword = {
  keyword: string;
  temporalPhase: TemporalPhase;
  intentCategory: IntentCategory;
  subIntent: SubIntent;
  confidence: number; // 0.0 ~ 1.0
  searchVolume: number;
  socialVolume: number; // 총 소셜 콘텐츠 수
  gapScore: number; // Social Gap Index (0-100, 높을수록 블루오션)
  isRising: boolean;
  source: KeywordSource;
  reasoning?: string; // LLM 분류 근거
  journeyStage?: SearchJourneyStage;
  difficultyScore?: number; // 콘텐츠 생산 난이도 (0-100)
};

/** 검색 여정 단계 */
export type SearchJourneyStage =
  | "awareness" // 인지 단계 (무엇인지 알아보는)
  | "consideration" // 고려 단계 (비교, 검토)
  | "decision" // 결정 단계 (구매, 가입)
  | "retention" // 유지 단계 (사용, 관리)
  | "advocacy"; // 옹호 단계 (추천, 리뷰)

// ── Social Gap Index ──

export type GapAnalysis = {
  keyword: string;
  searchVolume: number;
  socialVolume: number;
  gapScore: number; // 0-100
  gapLevel: "blue_ocean" | "opportunity" | "competitive" | "saturated";
  difficultyScore: number; // 콘텐츠 생산 난이도 (0-100)
  opportunityScore: number; // 종합 기회 점수 (0-100)
  platformGaps: {
    platform: SocialPlatform;
    contentCount: number;
    gapScore: number;
    freshness: number;
    recommendation: string; // 플랫폼별 추천 전략
  }[];
  contentSuggestions: string[]; // 추천 콘텐츠 주제
};

// ── Cluster ──

export type KeywordCluster = {
  id: string;
  name: string; // 클러스터 대표 이름
  keywords: string[];
  centroid: string; // 중심 키워드
  avgGapScore: number;
  avgSearchVolume: number;
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  size: number;
};

// ── Search Journey ──

export type SearchJourney = {
  stages: {
    phase: TemporalPhase;
    keywords: string[];
    dominantIntent: IntentCategory;
    avgGapScore: number;
  }[];
  paths: SearchJourneyPath[];
};

export type SearchJourneyPath = {
  from: string;
  to: string;
  weight: number; // 전환 빈도/강도
  journeyType: "linear" | "branching" | "circular";
};

// ── Content Gap Matrix ──

export type ContentGapMatrix = {
  dimensions: {
    intents: IntentCategory[];
    phases: TemporalPhase[];
  };
  cells: ContentGapCell[];
  hotspots: ContentGapCell[]; // 가장 큰 기회 영역
};

export type ContentGapCell = {
  intent: IntentCategory;
  phase: TemporalPhase;
  keywordCount: number;
  avgGapScore: number;
  avgSearchVolume: number;
  topKeywords: string[];
  recommendation: string;
};

// ── Graph Structures (ECharts force-directed) ──

export type IntentGraphNode = {
  id: string;
  name: string;
  intentCategory: IntentCategory;
  subIntent: SubIntent;
  temporalPhase: TemporalPhase;
  searchVolume: number;
  socialVolume: number;
  gapScore: number;
  isRising: boolean;
  isSeed: boolean;
  depth: number;
  symbolSize: number; // ECharts 노드 크기
  category: number; // ECharts 카테고리 인덱스
  clusterId?: string; // 클러스터 ID
  centrality: number; // 중심성 점수 (0-1)
  journeyStage?: SearchJourneyStage;
};

export type IntentGraphLink = {
  source: string;
  target: string;
  relationshipType: RelationshipType;
  strength: number; // 0.0 ~ 1.0
};

export type IntentGraphCategory = {
  name: string;
  itemStyle: { color: string };
};

export type IntentGraphData = {
  nodes: IntentGraphNode[];
  links: IntentGraphLink[];
  categories: IntentGraphCategory[];
  summary: AnalysisSummary;
  clusters: KeywordCluster[];
  journey: SearchJourney;
  gapMatrix: ContentGapMatrix;
};

// ── Analysis Summary ──

export type AnalysisSummary = {
  seedKeyword: string;
  totalKeywords: number;
  totalNodes: number;
  totalLinks: number;
  totalClusters: number;
  avgGapScore: number;
  topBlueOceans: { keyword: string; gapScore: number; platform?: string }[];
  topRising: { keyword: string; trendScore: number }[];
  topOpportunities: {
    keyword: string;
    opportunityScore: number;
    reason: string;
  }[];
  intentDistribution: Record<IntentCategory, number>;
  temporalDistribution: Record<TemporalPhase, number>;
  journeyStageDistribution: Record<SearchJourneyStage, number>;
  analyzedAt: string;
  durationMs: number;
};

// ── Analysis Job ──

export type AnalysisJob = {
  id: string;
  seedKeyword: string;
  status: AnalysisJobStatus;
  progress: number; // 0-100
  statusMessage: string;
  result: IntentGraphData | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

// ── Analysis Request ──

export type AnalysisRequest = {
  seedKeyword: string;
  maxDepth?: number; // 재귀 확장 깊이 (기본 2)
  maxKeywords?: number; // 최대 키워드 수 (기본 150)
  platforms?: SocialPlatform[];
  useLLM?: boolean; // LLM 분류 사용 여부
  forceRefresh?: boolean; // 캐시 무시
  includeQuestions?: boolean; // 5W1H 질문형 포함
  includeSeasonality?: boolean; // 시즌 분석 포함
};

// ── Cache ──

export type CacheEntry<T> = {
  data: T;
  createdAt: number;
  ttlMs: number;
  key: string;
};

// ── SSE Event ──

export type SSEEvent = {
  type: "progress" | "completed" | "error";
  jobId: string;
  data: {
    status: AnalysisJobStatus;
    progress: number;
    message: string;
    result?: IntentGraphData;
    error?: string;
  };
};

// ── Config ──

export type IntentEngineConfig = {
  maxDepth: number;
  maxKeywords: number;
  defaultPlatforms: SocialPlatform[];
  cacheTTLMs: number; // 기본 24시간
  useLLM: boolean;
  openaiApiKey?: string;
  openaiModel: string;
  redisUrl?: string;
  enableClustering: boolean;
  enableJourneyMapping: boolean;
  enableSeasonality: boolean;
};

export const DEFAULT_CONFIG: IntentEngineConfig = {
  maxDepth: 2,
  maxKeywords: 150,
  defaultPlatforms: ["youtube", "instagram", "tiktok", "naver_blog"],
  cacheTTLMs: 24 * 60 * 60 * 1000, // 24h
  useLLM: false,
  openaiModel: "gpt-4o",
  enableClustering: true,
  enableJourneyMapping: true,
  enableSeasonality: true,
};

// ── Display Labels ──

export const INTENT_CATEGORY_LABELS: Record<
  IntentCategory,
  { label: string; labelEn: string; color: string }
> = {
  discovery: { label: "정보 탐색", labelEn: "Discovery", color: "#3b82f6" },
  comparison: { label: "비교/리뷰", labelEn: "Comparison", color: "#f59e0b" },
  action: { label: "구매/행동", labelEn: "Action", color: "#10b981" },
  troubleshooting: {
    label: "문제 해결",
    labelEn: "Troubleshooting",
    color: "#ef4444",
  },
  unknown: { label: "미분류", labelEn: "Unknown", color: "#6b7280" },
};

export const TEMPORAL_PHASE_LABELS: Record<
  TemporalPhase,
  { label: string; labelEn: string; color: string }
> = {
  before: { label: "검색 이전", labelEn: "Before", color: "#8b5cf6" },
  current: { label: "현재 검색", labelEn: "Current", color: "#3b82f6" },
  after: { label: "검색 이후", labelEn: "After", color: "#10b981" },
};

export const GAP_LEVEL_LABELS: Record<
  string,
  { label: string; color: string; min: number }
> = {
  blue_ocean: { label: "블루오션", color: "#3b82f6", min: 70 },
  opportunity: { label: "기회 영역", color: "#10b981", min: 40 },
  competitive: { label: "경쟁 시장", color: "#f59e0b", min: 20 },
  saturated: { label: "포화 시장", color: "#ef4444", min: 0 },
};

export const JOURNEY_STAGE_LABELS: Record<
  SearchJourneyStage,
  { label: string; color: string }
> = {
  awareness: { label: "인지", color: "#8b5cf6" },
  consideration: { label: "고려", color: "#3b82f6" },
  decision: { label: "결정", color: "#10b981" },
  retention: { label: "유지", color: "#f59e0b" },
  advocacy: { label: "옹호", color: "#ef4444" },
};

export const SUB_INTENT_LABELS: Record<SubIntent, string> = {
  definition: "정의/뜻",
  how_to: "방법/하는 법",
  list: "추천/순위",
  review: "후기/리뷰",
  versus: "비교 (vs)",
  price: "가격/비용",
  purchase: "구매/주문",
  signup: "가입/등록",
  error_fix: "에러 해결",
  refund: "환불/교환",
  alternative: "대안/대체",
  trend: "트렌드/동향",
  experience: "체험/경험",
  tutorial: "튜토리얼/가이드",
  general: "일반",
};
