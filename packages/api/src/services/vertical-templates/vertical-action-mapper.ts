/**
 * VerticalActionMapper
 *
 * 공통 action recommendation을 업종별 실행 포인트로 변환.
 * "같은 콘텐츠 제작 액션이라도 뷰티에서는 성분 비교표, 금융에서는 조건 비교표"
 *
 * 핵심 원칙:
 * - 원본 액션을 삭제하지 않음 (프레이밍/우선순위만 조정)
 * - 업종별 담당자 자동 제안
 * - 금융은 CONSERVATIVE, 엔터는 DIRECTIVE 톤
 */

import type {
  IndustryType,
  VerticalActionMapping,
  VerticalTemplate,
} from "./types";
import { VerticalTemplateRegistryService } from "./vertical-template-registry";

type ActionItem = {
  id?: string;
  action: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  owner?: string;
  rationale?: string;
};

export class VerticalActionMapper {
  private registry = new VerticalTemplateRegistryService();

  /**
   * 공통 액션을 업종 맥락으로 변환
   */
  mapActions(
    actions: ActionItem[],
    industry: IndustryType,
  ): VerticalActionMapping[] {
    const template = this.registry.getTemplate(industry);

    return actions.map((action) => this.mapSingle(action, template));
  }

  private mapSingle(
    action: ActionItem,
    template: VerticalTemplate,
  ): VerticalActionMapping {
    const adjustedPriority = this.adjustPriority(action, template);
    const verticalAction = this.reframeAction(action, template);
    const suggestedOwner = this.suggestOwner(action, template);
    const framing = this.buildFraming(action, template);

    return {
      originalAction: {
        id: action.id,
        action: action.action,
        priority: action.priority,
        owner: action.owner,
      },
      verticalAction,
      adjustedPriority,
      suggestedOwner,
      framing,
    };
  }

  /**
   * 업종별 우선순위 조정
   * - 업종 우선 액션 유형이면 한 단계 올림
   * - 금융에서 컴플라이언스 관련이면 HIGH 고정
   */
  private adjustPriority(
    action: ActionItem,
    template: VerticalTemplate,
  ): ActionItem["priority"] {
    const text = action.action.toLowerCase();
    const isVerticalPriority = template.actionPolicy.priorityActionTypes.some(
      (type) => text.includes(type.toLowerCase().replace(/_/g, " ")),
    );

    // 업종 키워드 매칭으로도 우선순위 조정
    const insightKeywords = template.insightPriority.interpretationKeywords;
    const hasVerticalKeyword = insightKeywords.some((kw) =>
      text.includes(kw.toLowerCase()),
    );

    // 금융 컴플라이언스 관련은 항상 HIGH
    if (template.industryType === "FINANCE") {
      if (
        text.includes("규제") ||
        text.includes("컴플라이언스") ||
        text.includes("법적")
      ) {
        return "HIGH";
      }
    }

    // 엔터 타이밍 관련은 항상 HIGH
    if (template.industryType === "ENTERTAINMENT") {
      if (
        text.includes("타이밍") ||
        text.includes("즉시") ||
        text.includes("긴급")
      ) {
        return "HIGH";
      }
    }

    if (isVerticalPriority || hasVerticalKeyword) {
      if (action.priority === "LOW") return "MEDIUM";
      if (action.priority === "MEDIUM") return "HIGH";
    }

    return action.priority;
  }

  /**
   * 업종 맥락으로 액션 표현 변환
   */
  private reframeAction(
    action: ActionItem,
    template: VerticalTemplate,
  ): string {
    const style = template.actionPolicy.actionToneStyle;

    switch (style) {
      case "CONSERVATIVE":
        return this.conservativeFrame(action.action);
      case "DIRECTIVE":
        return this.directiveFrame(action.action);
      case "SUGGESTIVE":
      default:
        return this.suggestiveFrame(action.action);
    }
  }

  private conservativeFrame(action: string): string {
    // 금융용: "~을 검토하시기 바랍니다"
    if (action.endsWith("다") || action.endsWith("다.")) return action;
    return `${action}을 검토하시기 바랍니다.`;
  }

  private directiveFrame(action: string): string {
    // F&B/엔터용: "~을 실행하세요"
    if (action.endsWith("다") || action.endsWith("다.")) return action;
    return `${action}을 실행하세요.`;
  }

  private suggestiveFrame(action: string): string {
    // 뷰티용: "~을 권장합니다"
    if (action.endsWith("다") || action.endsWith("다.")) return action;
    return `${action}을 권장합니다.`;
  }

  /**
   * 업종별 담당자 제안
   */
  private suggestOwner(action: ActionItem, template: VerticalTemplate): string {
    // 원본에 담당자가 있으면 유지
    if (action.owner) return action.owner;

    const text = action.action.toLowerCase();

    // 액션 내용에서 담당자 추론
    if (
      text.includes("콘텐츠") ||
      text.includes("faq") ||
      text.includes("비교표")
    ) {
      return template.actionPolicy.defaultOwners[0] ?? "콘텐츠팀";
    }
    if (
      text.includes("seo") ||
      text.includes("geo") ||
      text.includes("스키마")
    ) {
      return "SEO팀";
    }
    if (text.includes("캠페인") || text.includes("프로모션")) {
      return template.actionPolicy.defaultOwners[1] ?? "마케팅팀";
    }

    // 금융 특수: 컴플라이언스
    if (
      template.industryType === "FINANCE" &&
      (text.includes("규제") || text.includes("검토") || text.includes("법적"))
    ) {
      return "컴플라이언스팀";
    }

    return template.actionPolicy.defaultOwners[0] ?? "담당팀";
  }

  /**
   * 프레이밍 생성
   */
  private buildFraming(action: ActionItem, template: VerticalTemplate): string {
    const concern = action.rationale ?? action.action;
    return template.actionPolicy.actionFramingTemplate
      .replace("{concern}", this.truncate(concern, 30))
      .replace("{action}", this.truncate(action.action, 50));
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.substring(0, max - 3) + "...";
  }
}
