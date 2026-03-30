/**
 * VerticalTemplateRegistry
 *
 * 사용 가능한 업종 템플릿을 등록/조회하는 레지스트리.
 * 모든 vertical 서비스의 진입점.
 */

import type {
  IndustryType,
  VerticalTemplate,
  VerticalDocumentProfile,
  SupportedOutputType,
} from "./types";
import { BEAUTY_TEMPLATE, BEAUTY_PROFILE } from "./beauty-template";
import { FNB_TEMPLATE, FNB_PROFILE } from "./fnb-template";
import { FINANCE_TEMPLATE, FINANCE_PROFILE } from "./finance-template";
import {
  ENTERTAINMENT_TEMPLATE,
  ENTERTAINMENT_PROFILE,
} from "./entertainment-template";

const TEMPLATE_REGISTRY: Record<IndustryType, VerticalTemplate> = {
  BEAUTY: BEAUTY_TEMPLATE,
  FNB: FNB_TEMPLATE,
  FINANCE: FINANCE_TEMPLATE,
  ENTERTAINMENT: ENTERTAINMENT_TEMPLATE,
};

const PROFILE_REGISTRY: Record<IndustryType, VerticalDocumentProfile> = {
  BEAUTY: BEAUTY_PROFILE,
  FNB: FNB_PROFILE,
  FINANCE: FINANCE_PROFILE,
  ENTERTAINMENT: ENTERTAINMENT_PROFILE,
};

export class VerticalTemplateRegistryService {
  /**
   * 업종 템플릿 조회
   */
  getTemplate(industry: IndustryType): VerticalTemplate {
    return TEMPLATE_REGISTRY[industry];
  }

  /**
   * 업종 프로파일 조회
   */
  getProfile(industry: IndustryType): VerticalDocumentProfile {
    return PROFILE_REGISTRY[industry];
  }

  /**
   * 등록된 모든 업종 목록
   */
  listIndustries(): IndustryType[] {
    return Object.keys(TEMPLATE_REGISTRY) as IndustryType[];
  }

  /**
   * 등록된 모든 템플릿 목록
   */
  listTemplates(): VerticalTemplate[] {
    return Object.values(TEMPLATE_REGISTRY);
  }

  /**
   * 특정 출력 유형을 지원하는 업종 조회
   */
  getIndustriesForOutput(outputType: SupportedOutputType): IndustryType[] {
    return this.listIndustries().filter((ind) =>
      TEMPLATE_REGISTRY[ind].supportedOutputTypes.includes(outputType),
    );
  }

  /**
   * 업종이 특정 출력 유형을 지원하는지 확인
   */
  supportsOutput(
    industry: IndustryType,
    outputType: SupportedOutputType,
  ): boolean {
    return TEMPLATE_REGISTRY[industry].supportedOutputTypes.includes(
      outputType,
    );
  }
}
