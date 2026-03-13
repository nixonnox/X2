// ─────────────────────────────────────────────────────────────
// AI Fallback Manager — 폴백, 재시도, 타임아웃 관리
// ─────────────────────────────────────────────────────────────

import type {
  AiTaskType,
  AiProviderType,
  AiFallbackPolicy,
  AiGenerateResult,
  AiRoutingDecision,
} from "../types";

// ── 헬퍼 함수 ──

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI 실행 타임아웃: ${ms}ms 초과`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 기본 폴백 정책 ──

const DEFAULT_FALLBACK_POLICY: Omit<
  AiFallbackPolicy,
  "taskType" | "fallbackChain"
> = {
  maxRetries: 2,
  retryDelayMs: 1000,
  timeoutMs: 30_000,
  onAllFailed: "return_error",
  simplerPromptOnRetry: false,
};

// ── 실행 결과 타입 ──

export interface FallbackExecutionResult {
  result: AiGenerateResult;
  provider: AiProviderType;
  model: string;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  attempts: number;
}

// ── FallbackManager 클래스 ──

export class FallbackManager {
  private policies: Map<AiTaskType, AiFallbackPolicy> = new Map();

  /**
   * 태스크 타입별 폴백 정책을 등록합니다.
   */
  registerPolicy(policy: AiFallbackPolicy): void {
    this.policies.set(policy.taskType, policy);
  }

  /**
   * 태스크 타입에 대한 폴백 정책을 조회합니다.
   * 등록된 정책이 없으면 라우팅 결정 기반 기본 정책을 반환합니다.
   */
  private getPolicy(
    taskType: AiTaskType,
    routingDecision: AiRoutingDecision,
  ): AiFallbackPolicy {
    const registered = this.policies.get(taskType);
    if (registered) return registered;

    return {
      ...DEFAULT_FALLBACK_POLICY,
      taskType,
      fallbackChain: routingDecision.fallbackChain,
    };
  }

  /**
   * 폴백 체인을 활용하여 AI 실행을 수행합니다.
   *
   * 1. 주 프로바이더/모델로 타임아웃 적용하여 시도
   * 2. 실패 시 지연 후 재시도 (maxRetries까지)
   * 3. 계속 실패 시 폴백 체인의 각 프로바이더로 시도
   * 4. 모두 실패 시 onAllFailed 정책 적용
   */
  async executeWithFallback(
    taskType: AiTaskType,
    executeFn: (
      provider: AiProviderType,
      model: string,
    ) => Promise<AiGenerateResult>,
    routingDecision: AiRoutingDecision,
  ): Promise<FallbackExecutionResult> {
    const policy = this.getPolicy(taskType, routingDecision);
    const { selectedProvider, selectedModel } = routingDecision;

    let totalAttempts = 0;
    let lastError: Error | null = null;

    // ── 1단계: 주 프로바이더로 시도 (재시도 포함) ──
    for (let retry = 0; retry <= policy.maxRetries; retry++) {
      totalAttempts++;

      try {
        console.log(
          `[FallbackManager] 시도 ${totalAttempts}: ${selectedProvider}/${selectedModel}` +
            (retry > 0 ? ` (재시도 ${retry}/${policy.maxRetries})` : ""),
        );

        const result = await withTimeout(
          executeFn(selectedProvider, selectedModel),
          policy.timeoutMs,
        );

        return {
          result,
          provider: selectedProvider,
          model: selectedModel,
          fallbackUsed: false,
          fallbackReason: null,
          attempts: totalAttempts,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[FallbackManager] 시도 ${totalAttempts} 실패: ${lastError.message}`,
        );

        // 재시도 대기 (마지막 재시도에서는 대기하지 않음)
        if (retry < policy.maxRetries) {
          const delay = policy.retryDelayMs * (retry + 1); // 점진적 증가
          console.log(`[FallbackManager] ${delay}ms 후 재시도...`);
          await sleep(delay);
        }
      }
    }

    // ── 2단계: 폴백 체인의 각 프로바이더로 시도 ──
    for (const fallback of policy.fallbackChain) {
      totalAttempts++;

      try {
        console.log(
          `[FallbackManager] 폴백 시도 ${totalAttempts}: ${fallback.provider}/${fallback.model}`,
        );

        const result = await withTimeout(
          executeFn(fallback.provider, fallback.model),
          policy.timeoutMs,
        );

        return {
          result,
          provider: fallback.provider,
          model: fallback.model,
          fallbackUsed: true,
          fallbackReason: `주 프로바이더(${selectedProvider}/${selectedModel}) 실패: ${lastError?.message ?? "알 수 없는 오류"}`,
          attempts: totalAttempts,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[FallbackManager] 폴백 시도 ${totalAttempts} 실패: ${lastError.message}`,
        );
      }
    }

    // ── 3단계: 모든 시도 실패 — onAllFailed 정책 적용 ──
    console.error(
      `[FallbackManager] 모든 시도 실패 (총 ${totalAttempts}회). 정책: ${policy.onAllFailed}`,
    );

    switch (policy.onAllFailed) {
      case "return_mock":
        return {
          result: this.generateMockResponse(taskType),
          provider: "mock" as AiProviderType,
          model: "mock-fallback",
          fallbackUsed: true,
          fallbackReason: `모든 프로바이더 실패. 모의 응답 반환. 마지막 오류: ${lastError?.message ?? "알 수 없는 오류"}`,
          attempts: totalAttempts,
        };

      case "return_cached":
        return {
          result: this.generateCachedPlaceholder(taskType),
          provider: "mock" as AiProviderType,
          model: "cached-placeholder",
          fallbackUsed: true,
          fallbackReason: `모든 프로바이더 실패. 캐시 플레이스홀더 반환. 마지막 오류: ${lastError?.message ?? "알 수 없는 오류"}`,
          attempts: totalAttempts,
        };

      case "return_error":
      default:
        throw new Error(
          `[FallbackManager] AI 실행 완전 실패 (${totalAttempts}회 시도). ` +
            `태스크: ${taskType}, 마지막 오류: ${lastError?.message ?? "알 수 없는 오류"}`,
        );
    }
  }

  /**
   * 모의 응답을 생성합니다.
   */
  private generateMockResponse(taskType: AiTaskType): AiGenerateResult {
    const mockSummary = `[모의 응답] ${taskType} 태스크에 대한 AI 분석을 일시적으로 수행할 수 없습니다. 잠시 후 다시 시도해 주세요.`;

    const mockOutput = JSON.stringify({
      summary: mockSummary,
      confidence: 0,
      metadata: {
        isMock: true,
        taskType,
        generatedAt: new Date().toISOString(),
      },
    });

    return {
      text: mockOutput,
      inputTokens: 0,
      outputTokens: 0,
      model: "mock-fallback",
      finishReason: "mock",
    };
  }

  /**
   * 캐시 플레이스홀더 응답을 생성합니다.
   */
  private generateCachedPlaceholder(taskType: AiTaskType): AiGenerateResult {
    const placeholderOutput = JSON.stringify({
      summary: `[임시 응답] ${taskType} 결과를 불러오는 중입니다. 잠시 후 업데이트됩니다.`,
      confidence: 0,
      metadata: {
        isCachedPlaceholder: true,
        taskType,
        generatedAt: new Date().toISOString(),
      },
    });

    return {
      text: placeholderOutput,
      inputTokens: 0,
      outputTokens: 0,
      model: "cached-placeholder",
      finishReason: "cached",
    };
  }
}

// ── 싱글톤 인스턴스 ──

export const fallbackManager = new FallbackManager();
