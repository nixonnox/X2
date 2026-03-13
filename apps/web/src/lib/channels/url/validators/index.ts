import type { PlatformUrlValidator } from "../types";
import { youtubeValidator } from "./youtube";
import { instagramValidator } from "./instagram";
import { tiktokValidator } from "./tiktok";
import { xValidator } from "./x";
import { genericValidator } from "./generic";

// ============================================
// Validator Registry
// ============================================

/**
 * 플랫폼별 URL validator 레지스트리.
 *
 * 새 플랫폼 추가 시:
 * 1. validators/ 디렉토리에 새 validator 파일 생성
 * 2. 이 배열에 추가
 *
 * 순서가 중요하다: 앞에서부터 canHandle()로 매칭하므로
 * 구체적인 플랫폼을 먼저 두고, generic은 마지막에 둔다.
 */
const VALIDATOR_REGISTRY: PlatformUrlValidator[] = [
  youtubeValidator,
  instagramValidator,
  tiktokValidator,
  xValidator,
  // ↓ 향후 추가할 validator
  // threadsValidator,
  // facebookValidator,
  // linkedinValidator,
  // naverBlogValidator,
  // naverCafeValidator,
  genericValidator, // 항상 마지막
];

/**
 * hostname 기반으로 적합한 validator를 찾는다.
 * 매칭 실패 시 generic validator 반환.
 */
export function findValidatorForHostname(
  hostname: string,
): PlatformUrlValidator {
  return (
    VALIDATOR_REGISTRY.find((v) => v.canHandle(hostname)) ?? genericValidator
  );
}

/**
 * 전체 validator 목록 반환 (테스트/디버깅용).
 */
export function getAllValidators(): PlatformUrlValidator[] {
  return VALIDATOR_REGISTRY;
}
