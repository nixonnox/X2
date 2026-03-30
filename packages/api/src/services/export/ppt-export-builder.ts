/**
 * PptExportBuilder
 *
 * ExportBundle → PptPresentation 변환.
 *
 * PPT의 목적: 설득/발표/장표 구조
 * - 한 장당 하나의 메시지
 * - 시각화 힌트
 * - 설득 중심
 * - 발표 친화형 구조
 *
 * 조립 규칙:
 * - SUMMARY → 첫 슬라이드 (Executive Summary)
 * - BODY → 본문 슬라이드 (headline + supporting points)
 * - FAQ/COMPARISON → 시각화 힌트 슬라이드
 * - ACTION → 액션 슬라이드
 * - EVIDENCE → 백업 슬라이드
 * - WARNING → 발표자 노트 삽입
 */

import type {
  ExportBundle,
  ExportBlock,
  ExportWarning,
  PptPresentation,
  PptExportSlide,
  PptExportNarrative,
  PptVisualHint,
  PptExportPurpose,
} from "./types";

// ─── 블록 → 시각화 추천 매핑 ────────────────────────────────────────

const VISUAL_HINT_MAP: Record<string, PptVisualHint> = {
  CLUSTER: {
    type: "cluster_board",
    description: "관심 영역 클러스터 보드 — 각 클러스터의 크기와 키워드",
  },
  COMPARISON: {
    type: "comparison_table",
    description: "비교표 — 항목별 비교 데이터",
  },
  COMPARISON_TABLE: {
    type: "comparison_table",
    description: "비교표 — 항목별 비교 데이터",
  },
  FAQ: {
    type: "quote_highlight",
    description: "주요 질문 하이라이트 — 빈도 높은 질문 카드",
  },
  PERSONA: {
    type: "persona_cards",
    description: "고객 유형 카드 — archetype별 특성 요약",
  },
  ROAD_STAGE: {
    type: "stage_flow",
    description: "여정 단계 플로우 — 단계별 전환 비율",
  },
  PATH: {
    type: "path_graph",
    description: "탐색 경로 그래프 — 허브-스포크 연결",
  },
  PATHFINDER: {
    type: "path_graph",
    description: "탐색 경로 분석 — 허브 노드와 연결",
  },
  ROADVIEW: {
    type: "stage_flow",
    description: "여정 단계 분석 — 단계별 검색 흐름",
  },
  STAT_HIGHLIGHT: {
    type: "metric_dashboard",
    description: "주요 지표 대시보드 — 핵심 숫자 강조",
  },
  COMPETITIVE_GAP: {
    type: "comparison_table",
    description: "경쟁 갭 분석 — 자사 vs 경쟁사 비교",
  },
  GEO_AEO: {
    type: "heatmap",
    description: "AI 검색 노출 히트맵 — 질문별 인용 상태",
  },
};

const DEFAULT_VISUAL: PptVisualHint = {
  type: "none",
  description: "텍스트 중심 슬라이드",
};

export class PptExportBuilder {
  /**
   * ExportBundle → PptPresentation 변환
   */
  build(
    bundle: ExportBundle,
    purpose: PptExportPurpose,
    audience: string,
    seedKeyword: string,
    industryLabel?: string,
  ): PptPresentation {
    const title = bundle.titleBlock.title;
    const now = new Date().toISOString();

    // 1. 내러티브 구성
    const narrative = this.buildNarrative(bundle);

    // 2. 본문 슬라이드 조립
    const slides: PptExportSlide[] = [];
    let order = 1;

    // 2a. 표지 슬라이드
    slides.push(
      this.buildTitleSlide(
        title,
        seedKeyword,
        audience,
        industryLabel,
        order++,
      ),
    );

    // 2b. Executive Summary (요약 블록)
    for (const block of bundle.summaryBlocks) {
      slides.push(
        this.buildSummarySlide(block, bundle.globalWarnings, order++),
      );
    }

    // 2c. 본문 슬라이드
    for (const block of bundle.bodyBlocks) {
      slides.push(this.buildContentSlide(block, order++));
    }

    // 2d. 액션 슬라이드
    for (const block of bundle.actionBlocks) {
      slides.push(this.buildActionSlide(block, order++));
    }

    // 2e. 마무리 슬라이드
    slides.push(this.buildClosingSlide(narrative, bundle.quality, order++));

    // 3. 백업 슬라이드 (근거 + 경고 + 부록)
    const backupSlides: PptExportSlide[] = [];
    let backupOrder = 100;

    for (const block of bundle.evidenceBlocks) {
      backupSlides.push(this.buildEvidenceBackupSlide(block, backupOrder++));
    }

    for (const block of bundle.warningBlocks) {
      backupSlides.push(this.buildWarningBackupSlide(block, backupOrder++));
    }

    for (const block of bundle.appendixBlocks) {
      backupSlides.push(this.buildAppendixBackupSlide(block, backupOrder++));
    }

    return {
      id: `ppt-${Date.now()}`,
      title,
      purpose,
      narrative,
      slides,
      backupSlides,
      metadata: {
        generatedAt: now,
        slideCount: slides.length,
        backupSlideCount: backupSlides.length,
        confidence: bundle.quality.confidence,
        isMockBased: bundle.quality.isMockOnly ?? false,
      },
    };
  }

  // ─── 내러티브 ──────────────────────────────────────────────────────

  private buildNarrative(bundle: ExportBundle): PptExportNarrative {
    const summaryText = bundle.summaryBlocks
      .flatMap((b) => b.paragraphs.map((p) => p.text))
      .join(" ")
      .substring(0, 200);

    const keyTakeaways = bundle.actionBlocks
      .flatMap((b) => b.paragraphs.map((p) => p.text))
      .slice(0, 5);

    return {
      storyline: summaryText || bundle.titleBlock.title,
      strategicMessage:
        bundle.summaryBlocks[0]?.oneLiner ?? bundle.titleBlock.title,
      keyTakeaways,
    };
  }

  // ─── 슬라이드 빌더 ─────────────────────────────────────────────────

  private buildTitleSlide(
    title: string,
    seedKeyword: string,
    audience: string,
    industryLabel: string | undefined,
    order: number,
  ): PptExportSlide {
    const subtitle = industryLabel
      ? `${industryLabel} | ${seedKeyword} 분석`
      : `${seedKeyword} 분석`;

    return {
      id: "slide-title",
      slideType: "TITLE",
      headline: title,
      subHeadline: subtitle,
      keyMessage: title,
      supportingPoints: [],
      recommendedVisual: DEFAULT_VISUAL,
      speakerNote: `대상: ${audience}`,
      evidenceSummary: "",
      order,
    };
  }

  private buildSummarySlide(
    block: ExportBlock,
    globalWarnings: ExportWarning[],
    order: number,
  ): PptExportSlide {
    const keyMessage =
      block.oneLiner ?? block.paragraphs[0]?.text ?? block.title;
    const supportingPoints = block.paragraphs.slice(0, 5).map((p) => p.text);

    // 경고를 발표자 노트에 삽입
    const warningNotes = globalWarnings
      .filter((w) => w.severity === "CRITICAL" || w.severity === "WARNING")
      .map((w) => w.message);

    const qualityNote = block.quality.isMockOnly
      ? "[검증 필요: 샘플 데이터 기반]"
      : block.quality.confidence < 0.5
        ? `[참고: 신뢰도 ${Math.round(block.quality.confidence * 100)}%]`
        : undefined;

    return {
      id: block.id,
      slideType: "EXECUTIVE_SUMMARY",
      headline: block.title,
      keyMessage,
      supportingPoints,
      recommendedVisual: {
        type: "executive_summary_card",
        description: "핵심 요약 카드 — 주요 수치와 메시지",
      },
      speakerNote:
        warningNotes.length > 0
          ? `[유의사항] ${warningNotes.join(" / ")}`
          : "핵심 요약을 전달하세요.",
      evidenceSummary: `근거 ${block.evidenceRefs.length}건 기반`,
      qualityNote,
      order,
    };
  }

  private buildContentSlide(block: ExportBlock, order: number): PptExportSlide {
    const visual = VISUAL_HINT_MAP[block.sourceBlockType] ?? DEFAULT_VISUAL;
    const keyMessage =
      block.oneLiner ?? block.paragraphs[0]?.text ?? block.title;
    const supportingPoints = block.paragraphs.slice(0, 5).map((p) => p.text);

    const qualityNote = this.buildSlideQualityNote(block);

    return {
      id: block.id,
      slideType: block.sourceBlockType,
      headline: block.title,
      keyMessage,
      supportingPoints,
      recommendedVisual: visual,
      speakerNote: this.buildSpeakerNote(block),
      evidenceSummary:
        block.evidenceRefs.length > 0
          ? `근거 ${block.evidenceRefs.length}건: ${block.evidenceRefs.map((e) => e.category).join(", ")}`
          : "",
      qualityNote,
      order,
    };
  }

  private buildActionSlide(block: ExportBlock, order: number): PptExportSlide {
    return {
      id: block.id,
      slideType: "ACTION",
      headline: block.title,
      keyMessage: block.oneLiner ?? "실행 항목",
      supportingPoints: block.paragraphs.map((p) => p.text).slice(0, 5),
      recommendedVisual: {
        type: "metric_dashboard",
        description: "액션 아이템 대시보드 — 우선순위별 정리",
      },
      speakerNote: "각 액션의 담당자와 기한을 확인하세요.",
      evidenceSummary: "",
      order,
    };
  }

  private buildClosingSlide(
    narrative: PptExportNarrative,
    quality: { confidence: number; isMockOnly?: boolean },
    order: number,
  ): PptExportSlide {
    const qualityNote = quality.isMockOnly
      ? "[이 발표는 샘플 데이터 기반입니다. 실제 데이터로 재검증이 필요합니다.]"
      : quality.confidence < 0.5
        ? `[데이터 신뢰도: ${Math.round(quality.confidence * 100)}% — 추가 데이터 확보 권장]`
        : undefined;

    return {
      id: "slide-closing",
      slideType: "CLOSING",
      headline: "감사합니다",
      keyMessage: narrative.strategicMessage,
      supportingPoints: narrative.keyTakeaways.slice(0, 3),
      recommendedVisual: DEFAULT_VISUAL,
      speakerNote: "Q&A 시간을 가지세요. 백업 슬라이드에 상세 근거가 있습니다.",
      evidenceSummary: "",
      qualityNote,
      order,
    };
  }

  // ─── 백업 슬라이드 ─────────────────────────────────────────────────

  private buildEvidenceBackupSlide(
    block: ExportBlock,
    order: number,
  ): PptExportSlide {
    return {
      id: `backup-${block.id}`,
      slideType: "EVIDENCE",
      headline: `[백업] ${block.title}`,
      keyMessage: "상세 근거 자료",
      supportingPoints: block.evidenceRefs.map(
        (e) =>
          `${e.category}: ${e.label}${e.snippet ? ` — "${e.snippet}"` : ""}`,
      ),
      recommendedVisual: {
        type: "evidence_panel",
        description: "근거 패널 — 카테고리별 evidence 정리",
      },
      speakerNote: "질문 시 참조하세요.",
      evidenceSummary: `근거 ${block.evidenceRefs.length}건`,
      order,
    };
  }

  private buildWarningBackupSlide(
    block: ExportBlock,
    order: number,
  ): PptExportSlide {
    return {
      id: `backup-warn-${block.id}`,
      slideType: "EVIDENCE",
      headline: `[백업] ${block.title}`,
      keyMessage: "유의사항 및 리스크",
      supportingPoints: block.paragraphs.map((p) => p.text),
      recommendedVisual: DEFAULT_VISUAL,
      speakerNote: "리스크 질문 시 참조하세요.",
      evidenceSummary: "",
      order,
    };
  }

  private buildAppendixBackupSlide(
    block: ExportBlock,
    order: number,
  ): PptExportSlide {
    return {
      id: `backup-app-${block.id}`,
      slideType: "EVIDENCE",
      headline: `[부록] ${block.title}`,
      keyMessage: "추가 참고 자료",
      supportingPoints: block.paragraphs.map((p) => p.text).slice(0, 8),
      recommendedVisual: DEFAULT_VISUAL,
      speakerNote: "필요 시 참조하세요.",
      evidenceSummary: "",
      order,
    };
  }

  // ─── 유틸 ──────────────────────────────────────────────────────────

  private buildSpeakerNote(block: ExportBlock): string {
    const notes: string[] = [];

    // 품질 경고
    for (const p of block.paragraphs) {
      if (p.qualityNote) notes.push(p.qualityNote);
    }

    // 블록 경고
    for (const w of block.warnings) {
      notes.push(w.message);
    }

    if (notes.length === 0) return "";
    return `[유의사항] ${notes.join(" / ")}`;
  }

  private buildSlideQualityNote(block: ExportBlock): string | undefined {
    if (block.quality.isMockOnly) return "[검증 필요: 샘플 데이터]";
    if (block.quality.freshness === "stale") return "[주의: 오래된 데이터]";
    if (block.quality.isPartial) return "[참고: 불완전 데이터]";
    if (block.quality.confidence < 0.5) {
      return `[참고: 신뢰도 ${Math.round(block.quality.confidence * 100)}%]`;
    }
    return undefined;
  }
}
