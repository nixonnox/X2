/**
 * PtDeckGenerationService
 *
 * PT 생성 파이프라인의 메인 오케스트레이터.
 *
 * 파이프라인:
 * SearchIntelligenceResult + Insight + Action + Evidence
 *   → QualityAssessment (INSUFFICIENT → 빈 출력)
 *   → EvidenceToDocumentMapper → EvidenceRef[] + SourceRef[]
 *   → PtNarrativeAssembler → PtNarrative (스토리라인 + 전략 메시지)
 *   → PtSlideBlockBuilder → PtSlideBlock[] (deck type별 장표 세트)
 *   → RoleBasedPtAssembler → PtDeck (audience별 필터링)
 *
 * 사용하는 서비스:
 * - EvidenceToDocumentMapper (documents/ — evidence → 문서용 ref)
 * - EvidenceToPtVisualHintMapper (visual hint 추천)
 * - SearchToPtSlideMapper (search result → slide content)
 * - PtSlideBlockBuilder (deck type별 slide set)
 * - PtNarrativeAssembler (전체 스토리라인)
 * - RoleBasedPtAssembler (audience별 필터링)
 *
 * Evidence/Source 연결:
 * - EvidenceRef → 각 슬라이드의 evidenceRefs
 * - SourceRef → citation-ready 소스 필터링
 *
 * Confidence/Stale/Partial 처리:
 * - INSUFFICIENT → 빈 deck 반환
 * - isMockOnly → keyMessage에 경고, speakerNote에 "[검증 필요]"
 * - stale → speakerNote에 경고
 * - partial → 실패 엔진 슬라이드 스킵
 *
 * Failure/Log 포인트:
 * - quality gate: INSUFFICIENT → 즉시 반환
 * - 개별 슬라이드 빌드 실패 → 해당 슬라이드만 스킵
 */

import type {
  PtDeck,
  PtDeckType,
  PtAudience,
  PtQualityMeta,
  EvidenceRef,
  SourceRef,
} from "./types";
import { EvidenceToDocumentMapper } from "../documents/evidence-to-document-mapper";
import { EvidenceToPtVisualHintMapper } from "./evidence-to-pt-visual-hint-mapper";
import { SearchToPtSlideMapper } from "./search-to-pt-slide-mapper";
import type { SlideContext } from "./search-to-pt-slide-mapper";
import { PtSlideBlockBuilder } from "./pt-slide-block-builder";
import { PtNarrativeAssembler } from "./pt-narrative-assembler";
import { RoleBasedPtAssembler } from "./role-based-pt-assembler";

// ─── External type shapes ─────────────────────────────────────────────

type EngineResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type SearchResult = {
  seedKeyword: string;
  analyzedAt: string;
  cluster?: EngineResult;
  pathfinder?: EngineResult;
  roadview?: EngineResult;
  persona?: EngineResult;
  trace: {
    confidence: number;
    freshness?: string;
    analysisId?: string;
    warnings?: string[];
    sourceSummary?: {
      name: string;
      status: string;
      itemCount?: number;
      latencyMs?: number;
    }[];
  };
};

type QualityAssessment = {
  level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

type EvidenceBundleItem = {
  category: string;
  label: string;
  dataSourceType?: string;
  entityIds?: string[];
  displayType?: string;
  summary?: string;
  data?: unknown;
};

type InsightItem = {
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  severity?: string;
  evidenceRefs?: { category: string }[];
};

type ActionItem = {
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  owner?: string;
};

type SocialInsight = {
  sentimentSummary?: string;
  topTopics?: string[];
  riskSignals?: string[];
  faqHighlights?: string[];
};

type CompetitorGap = {
  summary?: string;
  gaps?: string[];
  opportunities?: string[];
};

// ─── 입력 타입 ────────────────────────────────────────────────────────

export type GeneratePtDeckInput = {
  result: SearchResult;
  quality: QualityAssessment;
  evidenceItems: EvidenceBundleItem[];
  deckType: PtDeckType;
  audience: PtAudience;
  /** 외부에서 주입하는 인사이트 (SearchInsightIntegrationService 출력) */
  insights?: InsightItem[];
  /** 외부에서 주입하는 액션 (SearchActionIntegrationService 출력) */
  actions?: ActionItem[];
  /** 소셜/댓글 분석 결합 (optional) */
  socialInsight?: SocialInsight;
  /** 경쟁 분석 결합 (optional) */
  competitorGap?: CompetitorGap;
};

// ─── PT Deck 유형별 목적/제목 ─────────────────────────────────────────

const DECK_TITLES: Record<PtDeckType, string> = {
  ADVERTISER_PROPOSAL: "광고주 제안서",
  CAMPAIGN_STRATEGY: "캠페인 전략 제안",
  COMPETITIVE_ANALYSIS: "경쟁 분석 보고",
  GEO_AEO_STRATEGY: "AI 검색 최적화 전략",
  INFLUENCER_COLLABORATION: "인플루언서 연계 전략",
  INTERNAL_STRATEGY: "내부 전략 보고",
};

const DECK_OBJECTIVES: Record<PtDeckType, string> = {
  ADVERTISER_PROPOSAL:
    "검색 인텔리전스 기반의 시장 인사이트와 전략을 제안합니다",
  CAMPAIGN_STRATEGY: "고객 여정과 검색 행동에 기반한 캠페인 전략을 제안합니다",
  COMPETITIVE_ANALYSIS: "검색 흐름 분석을 통한 경쟁 환경과 기회를 정리합니다",
  GEO_AEO_STRATEGY: "AI 검색엔진 인용 최적화를 위한 전략을 제안합니다",
  INFLUENCER_COLLABORATION:
    "검색 인텔리전스와 인플루언서 전략을 결합한 실행안을 제안합니다",
  INTERNAL_STRATEGY: "검색 인텔리전스 분석 결과와 전략 방향을 공유합니다",
};

export class PtDeckGenerationService {
  private readonly evidenceMapper: EvidenceToDocumentMapper;
  private readonly visualMapper: EvidenceToPtVisualHintMapper;
  private readonly slideMapper: SearchToPtSlideMapper;
  private readonly slideBuilder: PtSlideBlockBuilder;
  private readonly narrativeAssembler: PtNarrativeAssembler;
  private readonly roleAssembler: RoleBasedPtAssembler;

  constructor() {
    this.evidenceMapper = new EvidenceToDocumentMapper();
    this.visualMapper = new EvidenceToPtVisualHintMapper();
    this.slideMapper = new SearchToPtSlideMapper(this.visualMapper);
    this.slideBuilder = new PtSlideBlockBuilder(this.slideMapper);
    this.narrativeAssembler = new PtNarrativeAssembler();
    this.roleAssembler = new RoleBasedPtAssembler();
  }

  /**
   * 메인 진입점: Search Intelligence + Insight + Action → PT Deck 생성.
   */
  generate(input: GeneratePtDeckInput): PtDeck {
    const {
      result,
      quality,
      evidenceItems,
      deckType,
      audience,
      insights,
      actions,
      socialInsight,
      competitorGap,
    } = input;

    // ── Quality Gate ──────────────────────────────────────────────
    if (quality.level === "INSUFFICIENT") {
      return this.emptyDeck(result.seedKeyword, deckType, audience, quality);
    }

    // ── 1. Evidence/Source 매핑 ───────────────────────────────────
    const evidenceRefs = this.evidenceMapper.mapToEvidenceRefs(evidenceItems);
    const sourceRefs = this.evidenceMapper.mapToSourceRefs(
      (result.trace.sourceSummary ?? []).map((s) => ({
        name: s.name,
        status: s.status as "success" | "partial" | "failed",
        itemCount: s.itemCount,
        latencyMs: s.latencyMs,
      })),
    );
    const qualityMeta = this.evidenceMapper.mapQuality(quality);

    // ── 2. Narrative 생성 ────────────────────────────────────────
    const narrative = this.narrativeAssembler.assemble(
      result,
      qualityMeta,
      insights ?? [],
      actions ?? [],
    );

    // ── 3. Slide Context 구성 ────────────────────────────────────
    const slideCtx: SlideContext = {
      result,
      quality,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
      insights,
      actions,
      socialInsight,
      competitorGap,
    };

    // ── 4. 슬라이드 빌드 ─────────────────────────────────────────
    const slides = this.slideBuilder.buildAll(deckType, slideCtx);

    // ── 5. Deck 조립 ─────────────────────────────────────────────
    const deck: PtDeck = {
      id: `deck-${deckType}-${Date.now()}`,
      title: `${result.seedKeyword} ${DECK_TITLES[deckType]}`,
      objective: DECK_OBJECTIVES[deckType],
      audience,
      deckType,
      seedKeyword: result.seedKeyword,
      narrative,
      slides,
      generatedAt: new Date().toISOString(),
      quality: qualityMeta,
      allEvidenceRefs: evidenceRefs,
      allSourceRefs: sourceRefs,
    };

    // ── 6. Audience별 필터링 ─────────────────────────────────────
    return this.roleAssembler.assemble(deck, audience);
  }

  /**
   * 지원하는 PT Deck 유형 목록.
   */
  getSupportedDeckTypes(): PtDeckType[] {
    return this.slideBuilder.getSupportedDeckTypes();
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  private emptyDeck(
    seedKeyword: string,
    deckType: PtDeckType,
    audience: PtAudience,
    quality: QualityAssessment,
  ): PtDeck {
    return {
      id: `deck-empty-${Date.now()}`,
      title: `${seedKeyword} — 데이터 불충분`,
      objective: "분석 데이터가 부족하여 PT를 생성할 수 없습니다.",
      audience,
      deckType,
      seedKeyword,
      narrative: {
        overallStoryline:
          "데이터가 불충분하여 스토리라인을 생성할 수 없습니다.",
        strategicMessage: "추가 데이터 수집이 필요합니다.",
        topInsights: [],
        recommendedActions: [],
      },
      slides: [],
      generatedAt: new Date().toISOString(),
      quality: this.evidenceMapper.mapQuality(quality),
      allEvidenceRefs: [],
      allSourceRefs: [],
    };
  }
}
