/**
 * WorkReportGenerationService
 *
 * 실무형 문서 생성 오케스트레이터 (메인 진입점).
 *
 * Pipeline:
 * 1. Quality Gate (INSUFFICIENT → 빈 문서)
 * 2. EvidenceToWorkDocMapper → evidenceRefs + sourceRefs
 * 3. QuickSummaryBuilder → quickSummary
 * 4. WorkDocSectionBuilder → sections (WORKDOC_SECTION_MAP에 따라)
 * 5. RoleBasedWorkDocAssembler → audience별 필터링
 * → WorkDoc
 */

import type {
  WorkDoc,
  WorkDocType,
  WorkDocAudience,
  WorkDocQualityMeta,
  SentenceTone,
  EvidenceRef,
  SourceRef,
} from "./types";
import {
  WORKDOC_SECTION_MAP,
  WORKDOC_TITLES,
  WORKDOC_OBJECTIVES,
  WORKDOC_AUDIENCE_CONFIG,
} from "./types";
import { EvidenceToWorkDocMapper } from "./evidence-to-workdoc-mapper";
import { QuickSummaryBuilder } from "./quick-summary-builder";
import { WorkDocSectionBuilder } from "./workdoc-section-builder";
import { RoleBasedWorkDocAssembler } from "./role-based-workdoc-assembler";
import { ReportSentenceBuilder } from "./report-sentence-builder";

// ─── Input Types ────────────────────────────────────────────────────

type SearchResult = {
  seedKeyword: string;
  analyzedAt: string;
  trace: {
    sourceSummary: {
      sources: {
        name: string;
        status: string;
        itemCount?: number;
        latencyMs?: number;
      }[];
    };
  };
  pathfinder?: { success: boolean; data?: unknown };
  roadview?: { success: boolean; data?: unknown };
  persona?: { success: boolean; data?: unknown };
  cluster?: { success: boolean; data?: unknown };
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
  type: string;
  title: string;
  description: string;
  confidence?: number;
};

type ActionItem = {
  id?: string;
  action: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  owner?: string;
  rationale?: string;
};

export type GenerateWorkDocInput = {
  result: SearchResult;
  quality: QualityAssessment;
  evidenceItems: EvidenceBundleItem[];
  docType: WorkDocType;
  audience: WorkDocAudience;
  insights: InsightItem[];
  actions: ActionItem[];
  /** 톤 오버라이드 (없으면 audience 기본 톤 사용) */
  tone?: SentenceTone;
};

export class WorkReportGenerationService {
  private evidenceMapper = new EvidenceToWorkDocMapper();
  private quickSummary = new QuickSummaryBuilder();
  private sectionBuilder = new WorkDocSectionBuilder();
  private roleAssembler = new RoleBasedWorkDocAssembler();
  private sentenceBuilder = new ReportSentenceBuilder();

  /**
   * 실무형 문서 생성 메인 진입점
   */
  generate(input: GenerateWorkDocInput): WorkDoc {
    const {
      result,
      quality,
      evidenceItems,
      docType,
      audience,
      insights,
      actions,
      tone,
    } = input;

    // 1. Quality Gate
    if (quality.level === "INSUFFICIENT") {
      return this.emptyDoc(result, docType, audience);
    }

    // 2. Evidence 변환
    const evidenceRefs = this.evidenceMapper.mapToEvidenceRefs(evidenceItems);
    const sourceRefs = this.evidenceMapper.mapToSourceRefs(
      result.trace.sourceSummary.sources.map((s) => ({
        name: s.name,
        status: s.status as "success" | "partial" | "failed",
        itemCount: s.itemCount,
        latencyMs: s.latencyMs,
      })),
    );
    const qualityMeta = this.evidenceMapper.mapQuality(quality);

    // 3. 톤 결정
    const effectiveTone = tone ?? WORKDOC_AUDIENCE_CONFIG[audience].defaultTone;

    // 4. Quick Summary
    const quickSummaryText = this.quickSummary.buildOneLiner(
      result as Parameters<typeof this.quickSummary.buildOneLiner>[0],
      quality,
    );

    // 5. 섹션 빌드
    const sectionMap = WORKDOC_SECTION_MAP[docType];
    const ctx = {
      result: result as Parameters<
        typeof this.sectionBuilder.buildSection
      >[1]["result"],
      quality: qualityMeta,
      evidenceRefs,
      sourceRefs,
      insights,
      actions,
      tone: effectiveTone,
    };

    const sections = sectionMap
      .map((blockType, i) =>
        this.sectionBuilder.buildSection(blockType, ctx, i + 1),
      )
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // 6. 문서 조립
    const doc: WorkDoc = {
      id: `workdoc-${docType}-${Date.now()}`,
      title: WORKDOC_TITLES[docType],
      docType,
      audience,
      seedKeyword: result.seedKeyword,
      quickSummary: quickSummaryText,
      sections,
      generatedAt: new Date().toISOString(),
      quality: qualityMeta,
      allEvidenceRefs: evidenceRefs,
      allSourceRefs: sourceRefs,
    };

    // 7. Audience별 필터링
    return this.roleAssembler.assemble(doc, audience);
  }

  private emptyDoc(
    result: SearchResult,
    docType: WorkDocType,
    audience: WorkDocAudience,
  ): WorkDoc {
    return {
      id: `workdoc-${docType}-${Date.now()}`,
      title: WORKDOC_TITLES[docType],
      docType,
      audience,
      seedKeyword: result.seedKeyword,
      quickSummary: "데이터가 충분하지 않아 문서를 생성할 수 없습니다.",
      sections: [],
      generatedAt: new Date().toISOString(),
      quality: {
        confidence: 0,
        warnings: ["데이터 부족으로 문서 생성 불가"],
      },
      allEvidenceRefs: [],
      allSourceRefs: [],
    };
  }
}
