/**
 * WorkDocSectionBuilder
 *
 * 7종 블록 유형별로 WorkDocSection을 생성.
 * SearchIntelligenceResult + Evidence + Insight + Action → 섹션 변환.
 *
 * 블록 유형:
 * 1. QUICK_SUMMARY — 한 줄 요약
 * 2. KEY_FINDING — 핵심 발견 사항
 * 3. EVIDENCE — 근거 블록
 * 4. ACTION — 실행 항목
 * 5. RISK_NOTE — 리스크/주의 사항
 * 6. FAQ — FAQ 정리
 * 7. COMPARISON — 비교 표/리스트
 */

import type {
  WorkDocSection,
  WorkDocBlockType,
  WorkDocQualityMeta,
  EvidenceRef,
  SourceRef,
  SentenceTone,
} from "./types";
import { ReportSentenceBuilder } from "./report-sentence-builder";
import { EvidenceToWorkDocMapper } from "./evidence-to-workdoc-mapper";

// 최소 shape들
type SearchResult = {
  seedKeyword: string;
  pathfinder?: {
    success: boolean;
    data?: { hubKeywords?: { keyword: string; hubScore: number }[] };
  };
  roadview?: {
    success: boolean;
    data?: {
      stages?: { name: string; keywords?: string[] }[];
      weakStages?: string[];
    };
  };
  persona?: {
    success: boolean;
    data?: {
      personas?: { name: string; share?: number; description?: string }[];
    };
  };
  cluster?: {
    success: boolean;
    data?: {
      clusters?: {
        name: string;
        keywords?: string[];
        keyQuestions?: string[];
      }[];
    };
  };
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

export type SectionContext = {
  result: SearchResult;
  quality: WorkDocQualityMeta;
  evidenceRefs: EvidenceRef[];
  sourceRefs: SourceRef[];
  insights: InsightItem[];
  actions: ActionItem[];
  tone: SentenceTone;
};

export class WorkDocSectionBuilder {
  private sentenceBuilder = new ReportSentenceBuilder();
  private evidenceMapper = new EvidenceToWorkDocMapper();

  /**
   * 블록 유형에 따라 섹션 생성.
   * evidence가 없으면 null 반환 (evidence-gated 블록의 경우).
   */
  buildSection(
    blockType: WorkDocBlockType,
    ctx: SectionContext,
    order: number,
  ): WorkDocSection | null {
    switch (blockType) {
      case "QUICK_SUMMARY":
        return this.buildQuickSummary(ctx, order);
      case "KEY_FINDING":
        return this.buildKeyFinding(ctx, order);
      case "EVIDENCE":
        return this.buildEvidence(ctx, order);
      case "ACTION":
        return this.buildAction(ctx, order);
      case "RISK_NOTE":
        return this.buildRiskNote(ctx, order);
      case "FAQ":
        return this.buildFaq(ctx, order);
      case "COMPARISON":
        return this.buildComparison(ctx, order);
      default:
        return null;
    }
  }

  // ─── QUICK_SUMMARY ─────────────────────────────────────────────────

  private buildQuickSummary(
    ctx: SectionContext,
    order: number,
  ): WorkDocSection {
    const parts: string[] = [];

    const clusterCount = ctx.result.cluster?.success
      ? (ctx.result.cluster.data?.clusters?.length ?? 0)
      : 0;
    const personaCount = ctx.result.persona?.success
      ? (ctx.result.persona.data?.personas?.length ?? 0)
      : 0;
    const weakCount = ctx.result.roadview?.success
      ? (ctx.result.roadview.data?.weakStages?.length ?? 0)
      : 0;

    if (clusterCount > 0) parts.push(`관심 영역 ${clusterCount}개 분류`);
    if (personaCount > 0) parts.push(`고객 유형 ${personaCount}개 식별`);
    if (weakCount > 0) parts.push(`콘텐츠 공백 ${weakCount}개 발견`);

    const oneLiner =
      parts.length > 0
        ? `'${ctx.result.seedKeyword}' 분석: ${parts.join(", ")}`
        : `'${ctx.result.seedKeyword}' 검색 인텔리전스 분석 완료`;

    const sentences = this.sentenceBuilder.buildAll(
      parts.map((p) => ({ content: p })),
      ctx.tone,
    );

    return {
      id: `wds-quick-summary-${order}`,
      blockType: "QUICK_SUMMARY",
      title: "요약",
      oneLiner,
      sentences,
      evidenceRefs: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
        "search_intelligence_quality",
      ]),
      sourceRefs: ctx.sourceRefs,
      quality: ctx.quality,
      order,
    };
  }

  // ─── KEY_FINDING ──────────────────────────────────────────────────

  private buildKeyFinding(
    ctx: SectionContext,
    order: number,
  ): WorkDocSection | null {
    const findings: { content: string; evidenceRef?: EvidenceRef }[] = [];

    // 클러스터 기반 발견
    if (
      ctx.result.cluster?.success &&
      ctx.result.cluster.data?.clusters?.length
    ) {
      const top = ctx.result.cluster.data.clusters[0]!;
      findings.push({
        content: `가장 큰 관심 영역은 '${top.name}'이며, ${top.keywords?.length ?? 0}개 키워드가 포함`,
        evidenceRef: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
          "search_cluster_distribution",
        ])[0],
      });
    }

    // 페르소나 기반 발견
    if (
      ctx.result.persona?.success &&
      ctx.result.persona.data?.personas?.length
    ) {
      const sorted = [...ctx.result.persona.data.personas].sort(
        (a, b) => (b.share ?? 0) - (a.share ?? 0),
      );
      findings.push({
        content: `주요 고객 유형은 '${sorted[0]!.name}'으로, 전체의 ${Math.round((sorted[0]!.share ?? 0) * 100)}%를 차지`,
        evidenceRef: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
          "search_persona_profiles",
        ])[0],
      });
    }

    // 콘텐츠 공백 발견
    if (
      ctx.result.roadview?.success &&
      ctx.result.roadview.data?.weakStages?.length
    ) {
      const weak = ctx.result.roadview.data.weakStages;
      findings.push({
        content: `고객 여정 중 '${weak.join("', '")}'  단계에서 콘텐츠 공백 발견`,
        evidenceRef: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
          "search_roadview_stages",
        ])[0],
      });
    }

    // 허브 키워드 발견
    if (
      ctx.result.pathfinder?.success &&
      ctx.result.pathfinder.data?.hubKeywords?.length
    ) {
      const topHub = ctx.result.pathfinder.data.hubKeywords.sort(
        (a, b) => b.hubScore - a.hubScore,
      )[0]!;
      findings.push({
        content: `핵심 허브 키워드는 '${topHub.keyword}' (중요도 ${Math.round(topHub.hubScore * 100)})`,
        evidenceRef: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
          "search_pathfinder_graph",
        ])[0],
      });
    }

    // insight 기반 발견
    for (const insight of ctx.insights.slice(0, 3)) {
      findings.push({ content: insight.description });
    }

    if (findings.length === 0) return null;

    const sentences = findings.map((f) =>
      this.sentenceBuilder.build(
        {
          content: f.content,
          evidenceRef: f.evidenceRef,
          quality: ctx.quality,
        },
        ctx.tone,
      ),
    );

    return {
      id: `wds-key-finding-${order}`,
      blockType: "KEY_FINDING",
      title: "핵심 발견 사항",
      oneLiner: findings[0]?.content ?? "",
      sentences,
      evidenceRefs: ctx.evidenceRefs,
      sourceRefs: ctx.sourceRefs,
      quality: ctx.quality,
      order,
    };
  }

  // ─── EVIDENCE ─────────────────────────────────────────────────────

  private buildEvidence(
    ctx: SectionContext,
    order: number,
  ): WorkDocSection | null {
    if (ctx.evidenceRefs.length === 0) return null;

    const sentences = ctx.evidenceRefs.slice(0, 8).map((ref) =>
      this.sentenceBuilder.build(
        {
          content: `[${ref.category}] ${this.evidenceMapper.toSnippetSummary(ref)}`,
          evidenceRef: ref,
          quality: ctx.quality,
        },
        ctx.tone,
      ),
    );

    return {
      id: `wds-evidence-${order}`,
      blockType: "EVIDENCE",
      title: "분석 근거 자료",
      oneLiner: `총 ${ctx.evidenceRefs.length}건의 근거 자료`,
      sentences,
      structuredData: {
        evidenceCount: ctx.evidenceRefs.length,
        categories: [...new Set(ctx.evidenceRefs.map((r) => r.category))],
      },
      evidenceRefs: ctx.evidenceRefs,
      sourceRefs: ctx.sourceRefs,
      quality: ctx.quality,
      order,
    };
  }

  // ─── ACTION ───────────────────────────────────────────────────────

  private buildAction(
    ctx: SectionContext,
    order: number,
  ): WorkDocSection | null {
    if (ctx.actions.length === 0) return null;

    const highActions = ctx.actions.filter((a) => a.priority === "HIGH");
    const mediumActions = ctx.actions.filter((a) => a.priority === "MEDIUM");

    const sentences = ctx.actions.slice(0, 7).map((a) => {
      const priorityLabel =
        a.priority === "HIGH"
          ? "[긴급]"
          : a.priority === "MEDIUM"
            ? "[중요]"
            : "[일반]";
      const ownerStr = a.owner ? ` (담당: ${a.owner})` : "";
      return this.sentenceBuilder.build(
        { content: `${priorityLabel} ${a.action}${ownerStr}` },
        ctx.tone,
      );
    });

    return {
      id: `wds-action-${order}`,
      blockType: "ACTION",
      title: "실행 항목",
      oneLiner: `긴급 ${highActions.length}건, 중요 ${mediumActions.length}건의 실행 항목`,
      sentences,
      structuredData: {
        totalActions: ctx.actions.length,
        highCount: highActions.length,
        mediumCount: mediumActions.length,
      },
      evidenceRefs: [],
      sourceRefs: [],
      quality: ctx.quality,
      order,
    };
  }

  // ─── RISK_NOTE ────────────────────────────────────────────────────

  private buildRiskNote(
    ctx: SectionContext,
    order: number,
  ): WorkDocSection | null {
    const risks: string[] = [];

    // 품질 경고
    if (ctx.quality.isMockOnly)
      risks.push("샘플 데이터 기반 분석 — 실제 데이터로 검증 필요");
    if (ctx.quality.freshness === "stale")
      risks.push("분석 데이터가 오래됨 — 최신 데이터로 재분석 권장");
    if (ctx.quality.isPartial)
      risks.push("일부 데이터만 수집됨 — 결과가 불완전할 수 있음");
    if (ctx.quality.confidence < 0.5)
      risks.push("신뢰도 낮음 — 추가 데이터 확보 필요");

    // 콘텐츠 공백 리스크
    const weakStages = ctx.result.roadview?.data?.weakStages;
    if (weakStages && weakStages.length >= 3) {
      risks.push(
        `고객 여정 중 ${weakStages.length}개 단계에서 콘텐츠 공백 — 경쟁사 선점 리스크`,
      );
    }

    // 경고 메시지
    if (ctx.quality.warnings?.length) {
      for (const w of ctx.quality.warnings.slice(0, 3)) {
        risks.push(w);
      }
    }

    if (risks.length === 0) return null;

    const sentences = risks.map((r) =>
      this.sentenceBuilder.build({ content: r }, ctx.tone),
    );

    return {
      id: `wds-risk-note-${order}`,
      blockType: "RISK_NOTE",
      title: "리스크 및 주의 사항",
      oneLiner: `${risks.length}건의 주의 사항`,
      sentences,
      evidenceRefs: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
        "search_quality_warnings",
      ]),
      sourceRefs: [],
      quality: ctx.quality,
      order,
    };
  }

  // ─── FAQ ──────────────────────────────────────────────────────────

  private buildFaq(ctx: SectionContext, order: number): WorkDocSection | null {
    const questions: { q: string; a: string }[] = [];

    // 클러스터의 핵심 질문
    if (ctx.result.cluster?.success && ctx.result.cluster.data?.clusters) {
      for (const cluster of ctx.result.cluster.data.clusters) {
        if (cluster.keyQuestions?.length) {
          for (const q of cluster.keyQuestions.slice(0, 2)) {
            questions.push({
              q,
              a: `'${cluster.name}' 관심 영역에서 자주 검색되는 질문입니다.`,
            });
          }
        }
      }
    }

    if (questions.length === 0) return null;

    const sentences = questions
      .slice(0, 6)
      .map((faq) =>
        this.sentenceBuilder.build(
          { content: `Q: ${faq.q}\nA: ${faq.a}` },
          ctx.tone,
        ),
      );

    return {
      id: `wds-faq-${order}`,
      blockType: "FAQ",
      title: "자주 묻는 질문",
      oneLiner: `${questions.length}개 FAQ 정리`,
      sentences,
      structuredData: {
        questions: questions.slice(0, 6),
      },
      evidenceRefs: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
        "search_cluster_detail",
      ]),
      sourceRefs: [],
      quality: ctx.quality,
      order,
    };
  }

  // ─── COMPARISON ───────────────────────────────────────────────────

  private buildComparison(
    ctx: SectionContext,
    order: number,
  ): WorkDocSection | null {
    const rows: { label: string; value: string; note?: string }[] = [];

    // 클러스터 비교
    if (ctx.result.cluster?.success && ctx.result.cluster.data?.clusters) {
      for (const c of ctx.result.cluster.data.clusters.slice(0, 5)) {
        rows.push({
          label: c.name,
          value: `${c.keywords?.length ?? 0}개 키워드`,
          note: c.keywords?.slice(0, 3).join(", "),
        });
      }
    }

    // 여정 단계 비교
    if (ctx.result.roadview?.success && ctx.result.roadview.data?.stages) {
      const weakSet = new Set(ctx.result.roadview.data.weakStages ?? []);
      for (const s of ctx.result.roadview.data.stages) {
        rows.push({
          label: s.name,
          value: `${s.keywords?.length ?? 0}개 키워드`,
          note: weakSet.has(s.name) ? "콘텐츠 공백" : "정상",
        });
      }
    }

    if (rows.length === 0) return null;

    const sentences = rows.map((r) =>
      this.sentenceBuilder.build(
        { content: `${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}` },
        ctx.tone,
      ),
    );

    return {
      id: `wds-comparison-${order}`,
      blockType: "COMPARISON",
      title: "비교 분석",
      oneLiner: `${rows.length}개 항목 비교`,
      sentences,
      structuredData: { rows },
      evidenceRefs: this.evidenceMapper.filterByCategory(ctx.evidenceRefs, [
        "search_cluster_distribution",
        "search_roadview_stages",
      ]),
      sourceRefs: [],
      quality: ctx.quality,
      order,
    };
  }
}
