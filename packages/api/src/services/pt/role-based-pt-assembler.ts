/**
 * RoleBasedPtAssembler
 *
 * Audience(청중)별로 PT Deck의 장표를 필터링·재조립.
 *
 * 입력: PtDeck (전체 장표) + PtAudience
 * 출력: PtDeck (청중에 맞게 필터링된 최종 출력)
 *
 * Audience별 차이:
 * - ADVERTISER: 설득형 톤, quality 경고 제거, 요약/전략/실행 중심
 * - EXECUTIVE: 전략형 톤, 최소 장표, 요약+전략+실행만
 * - MARKETER: 실행형 톤, persona/cluster/action 중심
 * - INTERNAL: 분석형 톤, 전체 포함, quality 경고 표시
 *
 * evidence 연결: ADVERTISER/EXECUTIVE는 snippet 있는 evidence만 유지
 * confidence 처리: ADVERTISER/EXECUTIVE는 speakerNote에서 경고 제거
 */

import type {
  PtDeck,
  PtSlideBlock,
  PtSlideType,
  PtAudience,
  PtQualityMeta,
  PT_AUDIENCE_CONFIG,
} from "./types";
import { PT_AUDIENCE_CONFIG as CONFIG } from "./types";

/** ADVERTISER에게 보여줄 핵심 슬라이드 */
const ADVERTISER_SLIDES: PtSlideType[] = [
  "TITLE",
  "EXECUTIVE_SUMMARY",
  "PROBLEM_DEFINITION",
  "OPPORTUNITY",
  "PERSONA",
  "CLUSTER",
  "STRATEGY",
  "ACTION",
  "EXPECTED_IMPACT",
  "EVIDENCE",
  "CLOSING",
];

/** EXECUTIVE에게 보여줄 최소 슬라이드 */
const EXECUTIVE_SLIDES: PtSlideType[] = [
  "TITLE",
  "EXECUTIVE_SUMMARY",
  "OPPORTUNITY",
  "STRATEGY",
  "ACTION",
  "CLOSING",
];

export class RoleBasedPtAssembler {
  /**
   * Audience에 맞게 PtDeck을 재조립.
   */
  assemble(deck: PtDeck, audience: PtAudience): PtDeck {
    const config = CONFIG[audience];

    // 1. 슬라이드 필터링
    let slides = this.filterSlides(deck.slides, audience);
    slides = slides.slice(0, config.maxSlides);

    // 2. Quality 경고 처리
    if (!config.includeQualityWarnings) {
      slides = slides.map((s) => this.stripQualityWarnings(s));
    }

    // 3. Evidence 필터링
    if (!config.includeRawEvidence) {
      slides = slides.map((s) => ({
        ...s,
        evidenceRefs: s.evidenceRefs.filter((e) => e.snippet),
      }));
    }

    // 4. Source 필터링
    const sourceRefs = config.includeSourceDetail
      ? deck.allSourceRefs
      : deck.allSourceRefs.filter((s) => s.citationReady);

    // 5. Deck quality 정리
    const quality: PtQualityMeta = config.includeQualityWarnings
      ? deck.quality
      : { ...deck.quality, warnings: undefined };

    return {
      ...deck,
      audience,
      slides,
      quality,
      allSourceRefs: sourceRefs,
      title: this.adjustTitle(deck.title, audience),
    };
  }

  // ─── Slide Filtering ────────────────────────────────────────────────

  private filterSlides(
    slides: PtSlideBlock[],
    audience: PtAudience,
  ): PtSlideBlock[] {
    switch (audience) {
      case "EXECUTIVE":
        return slides.filter((s) => EXECUTIVE_SLIDES.includes(s.slideType));
      case "ADVERTISER":
        return slides.filter((s) => ADVERTISER_SLIDES.includes(s.slideType));
      case "MARKETER":
        // DATA_QUALITY_NOTE 성격의 슬라이드 제외 (해당 없지만 안전장치)
        return slides;
      case "INTERNAL":
        return slides; // 전체 포함
      default:
        return slides;
    }
  }

  // ─── Quality Warning Removal ────────────────────────────────────────

  private stripQualityWarnings(slide: PtSlideBlock): PtSlideBlock {
    return {
      ...slide,
      quality: { ...slide.quality, warnings: undefined },
      speakerNote: slide.speakerNote
        ? slide.speakerNote
            .replace(/⚠[^|]*/g, "")
            .replace(/\|/g, "")
            .trim() || undefined
        : undefined,
    };
  }

  // ─── Title Adjustment ───────────────────────────────────────────────

  private adjustTitle(title: string, audience: PtAudience): string {
    const suffix: Record<PtAudience, string> = {
      ADVERTISER: "",
      EXECUTIVE: " (경영진용)",
      INTERNAL: " (내부 전략 보고)",
      MARKETER: " (마케팅용)",
    };
    return `${title}${suffix[audience]}`;
  }
}
