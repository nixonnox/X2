// ─────────────────────────────────────────────────────────────
// AI Provider Registry — 프로바이더 싱글톤 레지스트리
// ─────────────────────────────────────────────────────────────

import type { IAiProvider, AiProviderType } from "../types";
import { OpenAiProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { MockProvider } from "./mock-provider";

class AiProviderRegistry {
  private providers = new Map<AiProviderType, IAiProvider>();

  constructor() {
    // 기본 프로바이더 자동 등록
    this.registerProvider(new OpenAiProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new MockProvider());
  }

  // ── 프로바이더 등록 ──
  registerProvider(provider: IAiProvider): void {
    this.providers.set(provider.type, provider);
  }

  // ── 특정 프로바이더 조회 ──
  getProvider(type: AiProviderType): IAiProvider | null {
    return this.providers.get(type) ?? null;
  }

  // ── 전체 프로바이더 목록 ──
  getAllProviders(): IAiProvider[] {
    return Array.from(this.providers.values());
  }

  // ── 사용 가능한 프로바이더만 필터링 (API 키가 설정된 프로바이더) ──
  getAvailableProviders(): IAiProvider[] {
    return this.getAllProviders().filter((p) => p.isAvailable());
  }

  // ── 개발 모드 여부 확인 ──
  isDevMode(): boolean {
    return process.env.AI_DEV_MODE === "true";
  }

  // ── 기본 프로바이더 반환: 환경변수 설정 우선, 없으면 첫 번째 가용 프로바이더 ──
  getDefaultProvider(): IAiProvider | null {
    // 개발 모드면 Mock 프로바이더 반환
    if (this.isDevMode()) {
      return this.getProvider("mock");
    }

    // 환경변수에 기본 프로바이더가 지정된 경우
    const envDefault = process.env.AI_DEFAULT_PROVIDER as
      | AiProviderType
      | undefined;
    if (envDefault) {
      const preferred = this.getProvider(envDefault);
      if (preferred && preferred.isAvailable()) {
        return preferred;
      }
    }

    // 가용한 프로바이더 중 첫 번째 반환 (mock 제외 우선)
    const available = this.getAvailableProviders();
    const nonMock = available.filter((p) => p.type !== "mock");
    return nonMock[0] ?? available[0] ?? null;
  }

  // ── 전체 프로바이더 헬스체크 실행 ──
  async healthCheckAll(): Promise<
    Record<AiProviderType, { available: boolean; healthy: boolean }>
  > {
    const results: Record<string, { available: boolean; healthy: boolean }> =
      {};

    const providers = this.getAllProviders();

    // 병렬로 헬스체크 실행
    const checks = await Promise.allSettled(
      providers.map(async (provider) => {
        const available = provider.isAvailable();
        let healthy = false;

        if (available) {
          try {
            healthy = await provider.healthCheck();
          } catch {
            healthy = false;
          }
        }

        return { type: provider.type, available, healthy };
      }),
    );

    for (const check of checks) {
      if (check.status === "fulfilled") {
        results[check.value.type] = {
          available: check.value.available,
          healthy: check.value.healthy,
        };
      }
    }

    return results as Record<
      AiProviderType,
      { available: boolean; healthy: boolean }
    >;
  }
}

// ── 싱글톤 인스턴스 내보내기 ──
export const aiProviderRegistry = new AiProviderRegistry();
