/**
 * ReportSentenceBuilder
 *
 * 분석 데이터를 4가지 톤(보고서/메신저/회의불릿/공식)으로 변환.
 * "같은 내용이라도 어디에 쓰느냐에 따라 다른 문장이 된다"
 *
 * 예시:
 * - REPORT: "검색 관심 영역이 5개로 분류되며, 가장 큰 비중은 '비교 탐색' 영역입니다."
 * - MESSENGER: "검색 관심 영역 5개 중 '비교 탐색'이 가장 큼. 확인 부탁드립니다."
 * - MEETING_BULLET: "• 검색 관심 영역 5개 → '비교 탐색' 최대"
 * - FORMAL: "검색 관심 영역은 5개로 분류되었으며, '비교 탐색' 영역이 최대 비중을 차지하는 것으로 분석되었습니다."
 */

import type {
  SentenceTone,
  WorkDocSentenceBlock,
  EvidenceRef,
  WorkDocQualityMeta,
} from "./types";

type SentenceInput = {
  /** 핵심 내용 (톤 적용 전 원문) */
  content: string;
  /** 수치 데이터 (있으면 문장에 포함) */
  metric?: { label: string; value: string | number; unit?: string };
  /** 근거 연결 */
  evidenceRef?: EvidenceRef;
  /** 품질 상태 */
  quality?: WorkDocQualityMeta;
};

export class ReportSentenceBuilder {
  /**
   * 단일 문장을 특정 톤으로 변환
   */
  build(input: SentenceInput, tone: SentenceTone): WorkDocSentenceBlock {
    const sentence = this.applyTone(input.content, input.metric, tone);
    const qualityNote = this.buildQualityNote(input.quality);

    return {
      sentence,
      tone,
      evidenceRef: input.evidenceRef,
      qualityNote,
    };
  }

  /**
   * 여러 문장을 동일 톤으로 일괄 변환
   */
  buildAll(
    inputs: SentenceInput[],
    tone: SentenceTone,
  ): WorkDocSentenceBlock[] {
    return inputs.map((input) => this.build(input, tone));
  }

  /**
   * 동일 내용을 4개 톤으로 모두 생성 (미리보기/선택용)
   */
  buildAllTones(
    input: SentenceInput,
  ): Record<SentenceTone, WorkDocSentenceBlock> {
    return {
      REPORT: this.build(input, "REPORT"),
      MESSENGER: this.build(input, "MESSENGER"),
      MEETING_BULLET: this.build(input, "MEETING_BULLET"),
      FORMAL: this.build(input, "FORMAL"),
    };
  }

  private applyTone(
    content: string,
    metric: SentenceInput["metric"],
    tone: SentenceTone,
  ): string {
    const metricStr = metric
      ? `${metric.label} ${metric.value}${metric.unit ?? ""}`
      : "";

    switch (tone) {
      case "REPORT":
        return this.toReportTone(content, metricStr);
      case "MESSENGER":
        return this.toMessengerTone(content, metricStr);
      case "MEETING_BULLET":
        return this.toMeetingBulletTone(content, metricStr);
      case "FORMAL":
        return this.toFormalTone(content, metricStr);
      default:
        return content;
    }
  }

  /**
   * 보고서 문장체: "~했습니다", "~로 분석됩니다"
   */
  private toReportTone(content: string, metric: string): string {
    const base = metric ? `${content} (${metric})` : content;
    // 이미 문장 종결이면 그대로
    if (base.endsWith("다.") || base.endsWith("다") || base.endsWith(".")) {
      return base;
    }
    return `${base}로 분석됩니다.`;
  }

  /**
   * 메신저 공유용: 짧고 직접적, "확인 부탁드립니다"
   */
  private toMessengerTone(content: string, metric: string): string {
    const base = metric ? `${content} (${metric})` : content;
    if (base.endsWith(".") || base.endsWith("다.")) {
      return `${base} 확인 부탁드립니다.`;
    }
    return `${base}입니다. 확인 부탁드립니다.`;
  }

  /**
   * 회의 불릿: "• " prefix, 간결
   */
  private toMeetingBulletTone(content: string, metric: string): string {
    const base = metric ? `${content} → ${metric}` : content;
    return `• ${base}`;
  }

  /**
   * 공식 보고: "~하였으며", "~으로 사료됩니다"
   */
  private toFormalTone(content: string, metric: string): string {
    const base = metric ? `${content} (${metric})` : content;
    if (base.endsWith("다.") || base.endsWith(".")) {
      return base;
    }
    return `${base}한 것으로 분석되었습니다.`;
  }

  /**
   * 품질 경고 문구 생성
   */
  private buildQualityNote(quality?: WorkDocQualityMeta): string | undefined {
    if (!quality) return undefined;
    const notes: string[] = [];
    if (quality.isMockOnly) notes.push("[검증 필요] 샘플 데이터 기반");
    if (quality.freshness === "stale") notes.push("[주의] 오래된 데이터");
    if (quality.isPartial) notes.push("[참고] 일부 데이터만 수집됨");
    if (quality.confidence < 0.5) notes.push("[참고] 신뢰도 낮음");
    return notes.length > 0 ? notes.join(" / ") : undefined;
  }
}
