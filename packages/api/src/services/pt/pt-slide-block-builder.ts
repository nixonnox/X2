/**
 * PtSlideBlockBuilder
 *
 * PT Deck 유형(PtDeckType)에 맞는 장표 세트를 생성.
 * PT_DECK_SLIDE_MAP에 정의된 슬라이드 구성을 따르되,
 * evidence가 없는 슬라이드는 자동 스킵.
 *
 * 입력: PtDeckType + SlideContext
 * 출력: PtSlideBlock[]
 *
 * SearchToPtSlideMapper에 개별 슬라이드 빌드를 위임.
 */

import type { PtDeckType, PtSlideBlock } from "./types";
import { PT_DECK_SLIDE_MAP } from "./types";
import type {
  SearchToPtSlideMapper,
  SlideContext,
} from "./search-to-pt-slide-mapper";

export class PtSlideBlockBuilder {
  constructor(private readonly slideMapper: SearchToPtSlideMapper) {}

  /**
   * PT Deck 유형에 맞는 전체 슬라이드 세트 생성.
   * evidence가 없어 생성 불가능한 슬라이드는 건너뜀.
   *
   * @param deckType - PT 유형
   * @param ctx - 슬라이드 빌드에 필요한 통합 컨텍스트
   * @returns 순서가 부여된 PtSlideBlock[]
   */
  buildAll(deckType: PtDeckType, ctx: SlideContext): PtSlideBlock[] {
    if (ctx.quality.level === "INSUFFICIENT") return [];

    const slideTypes = PT_DECK_SLIDE_MAP[deckType];
    const slides: PtSlideBlock[] = [];
    let order = 0;

    for (const slideType of slideTypes) {
      const slide = this.slideMapper.buildSlide(slideType, ctx, ++order);
      if (slide) {
        slides.push(slide);
      }
    }

    return slides;
  }

  /**
   * 지원하는 PT Deck 유형 목록.
   */
  getSupportedDeckTypes(): PtDeckType[] {
    return Object.keys(PT_DECK_SLIDE_MAP) as PtDeckType[];
  }
}
