/**
 * Search Intelligence Integration Types
 *
 * Phase 7 파이프라인(Insight/Action/Evidence/Report)에
 * search intelligence 결과를 통합하기 위한 타입 정의.
 *
 * 주의: apps/web/src/services/search-intelligence/types.ts 의
 * SearchIntelligenceResult 를 받아서 Phase 7 서비스 형식으로 변환한다.
 */

// ---------------------------------------------------------------------------
// Search Intelligence Result (from apps/web — 최소 재선언)
// ---------------------------------------------------------------------------

/**
 * 검색 인텔리전스 추적 메타 (apps/web 원본과 동일 shape).
 * packages/api 에서는 JSON으로 전달받으므로 독립 타입 선언.
 */
export type SearchTraceMetadata = {
  analysisId: string;
  batchId?: string;
  seedKeyword: string;
  locale: string;
  analyzedAt: string;
  completedAt?: string;
  durationMs?: number;
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
  confidence: number;
  freshness: "fresh" | "recent" | "stale";
  isPartial: boolean;
  engineVersion: string;
  warnings: string[];
  lowConfidenceReasons: string[];
  partialDataFlags: string[];
  evidenceRefs: string[];
};

export type EngineExecutionResult<T = unknown> = {
  success: boolean;
  engine: "pathfinder" | "roadview" | "persona" | "cluster";
  data?: T;
  error?: string;
  trace: SearchTraceMetadata;
};

export type SearchIntelligenceResult = {
  seedKeyword: string;
  analyzedAt: string;
  completedAt: string;
  durationMs: number;
  payloadSummary: {
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionData: boolean;
    sourcesUsed: string[];
  };
  pathfinder?: EngineExecutionResult;
  roadview?: EngineExecutionResult;
  persona?: EngineExecutionResult;
  cluster?: EngineExecutionResult;
  trace: SearchTraceMetadata;
};

// ---------------------------------------------------------------------------
// Data Quality Assessment
// ---------------------------------------------------------------------------

export type DataQualityLevel = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export type SearchDataQualityAssessment = {
  level: DataQualityLevel;
  confidence: number;
  freshness: "fresh" | "recent" | "stale";
  isPartial: boolean;
  isMockOnly: boolean;
  warnings: string[];
  usableForReport: boolean;
  usableForInsight: boolean;
};

// ---------------------------------------------------------------------------
// Integration Input — Phase 7 서비스에 전달할 정규화된 형태
// ---------------------------------------------------------------------------

export type SearchIntelligenceInput = {
  result: SearchIntelligenceResult;
  projectId: string;
  quality: SearchDataQualityAssessment;
};

// ---------------------------------------------------------------------------
// Role-based Output Config
// ---------------------------------------------------------------------------

export type RoleContext = "PRACTITIONER" | "MARKETER" | "ADMIN" | "EXECUTIVE";

export type RoleOutputConfig = {
  includeDetailedTrace: boolean;
  includeRawEngineData: boolean;
  includeWarnings: boolean;
  narrativeStyle: "technical" | "actionable" | "strategic" | "summary";
  maxSections: number;
};

export const ROLE_OUTPUT_CONFIG: Record<RoleContext, RoleOutputConfig> = {
  PRACTITIONER: {
    includeDetailedTrace: true,
    includeRawEngineData: true,
    includeWarnings: true,
    narrativeStyle: "technical",
    maxSections: 10,
  },
  MARKETER: {
    includeDetailedTrace: false,
    includeRawEngineData: false,
    includeWarnings: true,
    narrativeStyle: "actionable",
    maxSections: 6,
  },
  ADMIN: {
    includeDetailedTrace: true,
    includeRawEngineData: false,
    includeWarnings: true,
    narrativeStyle: "actionable",
    maxSections: 8,
  },
  EXECUTIVE: {
    includeDetailedTrace: false,
    includeRawEngineData: false,
    includeWarnings: false,
    narrativeStyle: "strategic",
    maxSections: 4,
  },
};
