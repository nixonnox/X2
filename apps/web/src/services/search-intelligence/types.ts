/**
 * Search Intelligence Integration Types
 *
 * 검색 데이터 어댑터 → 엔진 → 결과 저장까지의
 * 통합 파이프라인에서 사용되는 공통 타입.
 */

// ═══════════════════════════════════════════════════════════════
// 1. Traceability Metadata
// ═══════════════════════════════════════════════════════════════

/**
 * 모든 엔진 실행 결과에 첨부되는 추적 메타데이터.
 *
 * 목적: 어떤 seed keyword / payload / source / batch에서 나온 결과인지 역추적.
 */
export type SearchTraceMetadata = {
  /** 고유 분석 ID (uuid 또는 timestamp 기반) */
  analysisId: string;
  /** 배치 분석 시 배치 ID */
  batchId?: string;
  /** 원본 시드 키워드 */
  seedKeyword: string;
  /** 로케일 */
  locale: string;
  /** 분석 시작 시간 */
  analyzedAt: string;
  /** 분석 완료 시간 */
  completedAt?: string;
  /** 소요 시간 (ms) */
  durationMs?: number;

  // ── 소스 추적 ──

  /** 데이터 수집에 참여한 소스 요약 */
  sourceSummary: {
    totalSources: number;
    successfulSources: number;
    sources: {
      name: string;
      status: "ready" | "unavailable" | "error" | "rate_limited";
      itemCount: number;
      latencyMs: number;
    }[];
  };

  // ── 품질 지표 ──

  /** 전체 신뢰도 (0-1) */
  confidence: number;
  /** 데이터 신선도 */
  freshness: "fresh" | "recent" | "stale";
  /** 부분 데이터 여부 */
  isPartial: boolean;
  /** 엔진 버전 */
  engineVersion: string;

  // ── 경고/증거 ──

  /** 경고 메시지 */
  warnings: string[];
  /** 낮은 신뢰도 이유 */
  lowConfidenceReasons: string[];
  /** 부분 데이터 플래그 */
  partialDataFlags: string[];
  /** 증거 참조 (노드/클러스터 ID 등) */
  evidenceRefs: string[];
  /** Mock 데이터만 사용했는지 여부 */
  isMockOnly?: boolean;
};

// ═══════════════════════════════════════════════════════════════
// 2. Engine Execution Result Wrapper
// ═══════════════════════════════════════════════════════════════

/**
 * 모든 엔진 실행 결과를 감싸는 공통 envelope.
 */
export type EngineExecutionResult<T> = {
  /** 성공 여부 */
  success: boolean;
  /** 엔진 이름 */
  engine: "pathfinder" | "roadview" | "persona" | "cluster";
  /** 엔진 결과 (성공 시) */
  data?: T;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 추적 메타데이터 */
  trace: SearchTraceMetadata;
};

// ═══════════════════════════════════════════════════════════════
// 3. Orchestrator Types
// ═══════════════════════════════════════════════════════════════

/** 오케스트레이터 요청 */
export type SearchIntelligenceRequest = {
  seedKeyword: string;
  locale?: string;
  /** 실행할 엔진 목록 (기본: 전부) */
  engines?: ("pathfinder" | "roadview" | "persona" | "cluster")[];
  /** Pathfinder 옵션 */
  pathfinderOptions?: {
    maxSteps?: number;
    maxNodes?: number;
    direction?: "both" | "before" | "after";
  };
  /** RoadView 옵션 */
  roadviewOptions?: {
    endKeyword?: string;
  };
  /** Persona 옵션 */
  personaOptions?: {
    maxPersonas?: number;
    useLLM?: boolean;
  };
  /** Cluster 옵션 */
  clusterOptions?: {
    maxClusters?: number;
    minClusterSize?: number;
    clusterMethod?: "intent_phase" | "semantic" | "question" | "behavior" | "hybrid";
    useLLM?: boolean;
  };
  /** 배치 ID (배치 분석 시) */
  batchId?: string;
};

/** 오케스트레이터 결과 */
export type SearchIntelligenceResult = {
  seedKeyword: string;
  analyzedAt: string;
  completedAt: string;
  durationMs: number;

  /** 원본 수집 페이로드 요약 */
  payloadSummary: {
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionData: boolean;
    sourcesUsed: string[];
  };

  /** 엔진별 실행 결과 */
  pathfinder?: EngineExecutionResult<unknown>;
  roadview?: EngineExecutionResult<unknown>;
  persona?: EngineExecutionResult<unknown>;
  cluster?: EngineExecutionResult<unknown>;

  /** 전체 추적 */
  trace: SearchTraceMetadata;
};

// ═══════════════════════════════════════════════════════════════
// 4. Repository Types (저장 구조)
// ═══════════════════════════════════════════════════════════════

/** 저장 가능한 분석 결과 envelope */
export type PersistableAnalysisResult = {
  id: string;
  seedKeyword: string;
  engine: string;
  analyzedAt: string;
  /** 엔진 결과 JSON */
  resultJson: unknown;
  /** 추적 메타데이터 JSON */
  traceJson: SearchTraceMetadata;
  /** 만료 시간 (캐시 용도) */
  expiresAt?: string;
};

/** 결과 조회 필터 */
export type AnalysisResultFilter = {
  seedKeyword?: string;
  engine?: string;
  batchId?: string;
  since?: string;
  limit?: number;
};
