// ─────────────────────────────────────────────────────────────
// AI Task Router — 작업 유형에 따른 프로바이더/모델 라우팅
// ─────────────────────────────────────────────────────────────

import type {
  AiRoutingInput,
  AiRoutingDecision,
  AiProviderType,
  AiModelTier,
  AiTaskType,
} from "../types";
import { aiProviderRegistry } from "../providers/registry";
import {
  getTaskPolicy,
  getFallbackPolicy,
  TASK_POLICIES,
} from "./task-policies";

// ── 모델 티어 매핑 (프로바이더별 기본 모델) ──

const MODEL_TIER_MAP: Record<
  AiModelTier,
  Record<Exclude<AiProviderType, "mock">, string>
> = {
  fast: {
    openai: "gpt-4o-mini",
    anthropic: "claude-haiku-4-5-20251001",
  },
  standard: {
    openai: "gpt-4.1",
    anthropic: "claude-sonnet-4-20250514",
  },
  premium: {
    openai: "gpt-4o",
    anthropic: "claude-opus-4-6",
  },
};

// ── 모델별 예상 비용 (USD per 1K tokens) ──

const MODEL_COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "claude-haiku-4-5-20251001": { input: 0.0008, output: 0.004 },
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-opus-4-6": { input: 0.015, output: 0.075 },
  mock: { input: 0, output: 0 },
};

// ── 모델별 예상 레이턴시 (ms, 1K 토큰 기준) ──

const MODEL_LATENCY_MS: Record<string, number> = {
  "gpt-4o-mini": 800,
  "gpt-4o": 3_000,
  "gpt-4.1": 2_500,
  "claude-haiku-4-5-20251001": 1_000,
  "claude-sonnet-4-20250514": 2_000,
  "claude-opus-4-6": 5_000,
  mock: 100,
};

/**
 * 작업 유형의 모델 티어를 결정합니다.
 */
function getModelTier(taskType: AiTaskType): AiModelTier {
  const policy = getTaskPolicy(taskType);
  const model = policy.preferredModel;

  if (model.includes("mini") || model.includes("haiku")) return "fast";
  if (model.includes("opus") || model === "gpt-4o") return "premium";
  return "standard";
}

/**
 * 개발 모드 여부를 확인합니다.
 */
function isDevMode(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.AI_DEV_MODE === "true"
  );
}

/**
 * 프로바이더 사용 가능 여부를 확인합니다.
 */
function isProviderAvailable(provider: AiProviderType): boolean {
  if (provider === "mock") return true;

  try {
    const providerInstance = aiProviderRegistry.getProvider(provider);
    return providerInstance?.isAvailable() ?? false;
  } catch {
    // 레지스트리가 아직 초기화되지 않은 경우
    return false;
  }
}

/**
 * 워크스페이스 플랜에 따른 모델 다운그레이드 여부를 판단합니다.
 */
function shouldDowngradeForPlan(
  tier: AiModelTier,
  workspacePlan?: string,
): boolean {
  if (!workspacePlan) return false;

  // 무료/기본 플랜은 프리미엄 모델 사용 불가
  const restrictedPlans = ["free", "basic", "starter"];
  if (
    restrictedPlans.includes(workspacePlan.toLowerCase()) &&
    tier === "premium"
  ) {
    return true;
  }

  return false;
}

/**
 * 우선순위에 따라 모델 티어를 조정합니다.
 */
function adjustTierByPriority(
  tier: AiModelTier,
  priority: string,
): AiModelTier {
  // critical 우선순위는 항상 프리미엄 모델 사용
  if (priority === "critical" && tier !== "premium") {
    return "premium";
  }

  // low 우선순위는 fast 모델로 다운그레이드
  if (priority === "low" && tier === "premium") {
    return "standard";
  }

  return tier;
}

/**
 * 폴백 체인을 구성합니다.
 */
function buildFallbackChain(
  taskType: AiTaskType,
  selectedProvider: AiProviderType,
  selectedModel: string,
): { provider: AiProviderType; model: string }[] {
  const fallbackPolicy = getFallbackPolicy(taskType);
  const policy = getTaskPolicy(taskType);
  const chain: { provider: AiProviderType; model: string }[] = [];

  // 폴백 정책이 정의되어 있으면 해당 체인 사용
  if (fallbackPolicy) {
    for (const entry of fallbackPolicy.fallbackChain) {
      // 현재 선택된 프로바이더/모델과 동일하면 건너뜀
      if (
        entry.provider === selectedProvider &&
        entry.model === selectedModel
      ) {
        continue;
      }
      chain.push(entry);
    }
    return chain;
  }

  // 폴백 정책이 없으면 기본 폴백 체인 구성
  if (policy.fallbackProvider !== selectedProvider) {
    chain.push({
      provider: policy.fallbackProvider,
      model: policy.fallbackModel,
    });
  }

  // 마지막 폴백은 항상 mock
  chain.push({ provider: "mock", model: "mock" });

  return chain;
}

/**
 * 예상 비용을 계산합니다 (USD).
 */
function calculateExpectedCost(
  model: string,
  expectedInputTokens: number,
  expectedOutputTokens: number,
): number {
  const costs = MODEL_COST_PER_1K[model] ?? { input: 0, output: 0 };
  const inputCost = (expectedInputTokens / 1_000) * costs.input;
  const outputCost = (expectedOutputTokens / 1_000) * costs.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * 예상 레이턴시를 계산합니다 (ms).
 */
function calculateExpectedLatency(
  model: string,
  expectedOutputTokens: number,
): number {
  const baseLatency = MODEL_LATENCY_MS[model] ?? 2_000;
  // 출력 토큰 수에 비례하여 레이턴시 증가 (1K 토큰 기준 베이스)
  const tokenFactor = expectedOutputTokens / 1_000;
  return Math.round(baseLatency * Math.max(tokenFactor, 1));
}

/**
 * 라우팅 판단 사유를 생성합니다.
 */
function buildReasoning(params: {
  taskType: AiTaskType;
  selectedProvider: AiProviderType;
  selectedModel: string;
  tier: AiModelTier;
  wasDowngraded: boolean;
  wasUpgraded: boolean;
  preferenceOverride: boolean;
  devMode: boolean;
  planRestricted: boolean;
}): string {
  const policy = getTaskPolicy(params.taskType);
  const parts: string[] = [];

  parts.push(`[${policy.displayName}] 라우팅 결정`);

  if (params.devMode) {
    parts.push("개발 모드 활성화 → mock 프로바이더로 라우팅");
    return parts.join(" | ");
  }

  if (params.preferenceOverride) {
    parts.push(`사용자 프로바이더 선호: ${params.selectedProvider}`);
  } else {
    parts.push(`기본 프로바이더: ${params.selectedProvider}`);
  }

  parts.push(`모델: ${params.selectedModel} (${params.tier} 티어)`);

  if (params.wasDowngraded) {
    parts.push("⚠ 플랜 제한으로 모델 다운그레이드됨");
  }

  if (params.wasUpgraded) {
    parts.push("⬆ 높은 우선순위로 모델 업그레이드됨");
  }

  if (params.planRestricted) {
    parts.push("플랜에 따른 모델 제한 적용");
  }

  return parts.join(" | ");
}

// ── 메인 라우터 함수 ──

/**
 * AI 작업을 적절한 프로바이더/모델로 라우팅합니다.
 *
 * 라우팅 로직:
 * 1. 작업 정책 조회
 * 2. 프로바이더 선호도 오버라이드 확인
 * 3. 선호 프로바이더 사용 가능 여부 확인
 * 4. 사용 불가 시 폴백 체인 사용
 * 5. 개발 모드이면 항상 mock으로 라우팅
 * 6. 토큰 예산, 우선순위, 워크스페이스 플랜에 따른 모델 조정
 * 7. 폴백 체인 구성
 * 8. 예상 비용 및 레이턴시 계산
 * 9. 라우팅 결정 반환
 */
export function routeTask(input: AiRoutingInput): AiRoutingDecision {
  const policy = getTaskPolicy(input.taskType);

  // 1. 개발 모드 확인 → mock 프로바이더로 강제 라우팅
  if (isDevMode()) {
    return {
      selectedProvider: "mock",
      selectedModel: "mock",
      fallbackChain: [],
      expectedInputTokens: 0,
      expectedOutputTokens: 0,
      expectedCostUsd: 0,
      expectedLatencyMs: 100,
      responseMode: input.responseMode,
      reasoning: buildReasoning({
        taskType: input.taskType,
        selectedProvider: "mock",
        selectedModel: "mock",
        tier: "fast",
        wasDowngraded: false,
        wasUpgraded: false,
        preferenceOverride: false,
        devMode: true,
        planRestricted: false,
      }),
    };
  }

  // 2. 기본 티어 및 프로바이더 결정
  let tier = getModelTier(input.taskType);
  let selectedProvider = policy.preferredProvider;
  let selectedModel = policy.preferredModel;
  let preferenceOverride = false;
  let wasDowngraded = false;
  let wasUpgraded = false;
  let planRestricted = false;

  // 3. 프로바이더 선호도 오버라이드
  if (input.providerPreference && input.providerPreference !== "mock") {
    const preferred = input.providerPreference;
    if (isProviderAvailable(preferred)) {
      selectedProvider = preferred;
      // 같은 티어에서 해당 프로바이더의 모델로 전환
      selectedModel =
        MODEL_TIER_MAP[tier][preferred as "openai" | "anthropic"] ??
        selectedModel;
      preferenceOverride = true;
    }
    // 선호 프로바이더를 사용할 수 없으면 기본값 유지
  }

  // 4. 선호 프로바이더 사용 가능 여부 확인
  if (!isProviderAvailable(selectedProvider)) {
    // 폴백 프로바이더로 전환
    const fallbackProvider = policy.fallbackProvider;
    if (isProviderAvailable(fallbackProvider)) {
      selectedProvider = fallbackProvider;
      selectedModel = policy.fallbackModel;
    } else {
      // 모든 프로바이더 사용 불가 → mock으로 폴백
      selectedProvider = "mock";
      selectedModel = "mock";
    }
  }

  // 5. 워크스페이스 플랜에 따른 모델 다운그레이드
  if (shouldDowngradeForPlan(tier, input.workspacePlan)) {
    tier = "standard";
    if (selectedProvider !== "mock") {
      selectedModel =
        MODEL_TIER_MAP[tier][
          selectedProvider as Exclude<AiProviderType, "mock">
        ];
    }
    wasDowngraded = true;
    planRestricted = true;
  }

  // 6. 우선순위에 따른 모델 티어 조정
  const adjustedTier = adjustTierByPriority(tier, input.priority);
  if (adjustedTier !== tier) {
    if (adjustedTier === "premium" && tier !== "premium") {
      wasUpgraded = true;
    }
    if (
      (adjustedTier === "standard" && tier === "premium") ||
      (adjustedTier === "fast" && tier !== "fast")
    ) {
      wasDowngraded = true;
    }
    tier = adjustedTier;
    if (selectedProvider !== "mock") {
      selectedModel =
        MODEL_TIER_MAP[tier][
          selectedProvider as Exclude<AiProviderType, "mock">
        ];
    }
  }

  // 7. 토큰 예산 제약 적용
  const maxTokenBudget = input.tokenBudget ?? policy.maxTokenBudget;
  const expectedInputTokens = Math.round(maxTokenBudget * 0.6);
  const expectedOutputTokens = Math.round(maxTokenBudget * 0.4);

  // 8. 폴백 체인 구성
  const fallbackChain = buildFallbackChain(
    input.taskType,
    selectedProvider,
    selectedModel,
  );

  // 9. 예상 비용 및 레이턴시 계산
  const expectedCostUsd = calculateExpectedCost(
    selectedModel,
    expectedInputTokens,
    expectedOutputTokens,
  );
  const expectedLatencyMs = calculateExpectedLatency(
    selectedModel,
    expectedOutputTokens,
  );

  // 10. 라우팅 결정 반환
  return {
    selectedProvider,
    selectedModel,
    fallbackChain,
    expectedInputTokens,
    expectedOutputTokens,
    expectedCostUsd,
    expectedLatencyMs,
    responseMode: input.responseMode,
    reasoning: buildReasoning({
      taskType: input.taskType,
      selectedProvider,
      selectedModel,
      tier,
      wasDowngraded,
      wasUpgraded,
      preferenceOverride,
      devMode: false,
      planRestricted,
    }),
  };
}

/**
 * 라우팅 결정에 대한 한국어 설명 문자열을 반환합니다.
 */
export function getRoutingExplanation(decision: AiRoutingDecision): string {
  const lines: string[] = [];

  lines.push("─── AI 라우팅 결정 ───");
  lines.push(`프로바이더: ${decision.selectedProvider}`);
  lines.push(`모델: ${decision.selectedModel}`);
  lines.push(`응답 모드: ${decision.responseMode}`);
  lines.push(
    `예상 토큰: 입력 ${decision.expectedInputTokens} / 출력 ${decision.expectedOutputTokens}`,
  );
  lines.push(`예상 비용: $${decision.expectedCostUsd.toFixed(6)}`);
  lines.push(`예상 레이턴시: ${decision.expectedLatencyMs}ms`);

  if (decision.fallbackChain.length > 0) {
    const chainStr = decision.fallbackChain
      .map((f) => `${f.provider}/${f.model}`)
      .join(" → ");
    lines.push(`폴백 체인: ${chainStr}`);
  } else {
    lines.push("폴백 체인: 없음");
  }

  lines.push(`판단 사유: ${decision.reasoning}`);
  lines.push("───────────────────");

  return lines.join("\n");
}

/**
 * 모든 작업 유형에 대한 라우팅 결정을 미리 보기합니다 (디버그 용도).
 */
export function previewAllRouting(): Map<AiTaskType, AiRoutingDecision> {
  const results = new Map<AiTaskType, AiRoutingDecision>();

  for (const [taskType, policy] of TASK_POLICIES) {
    const decision = routeTask({
      taskType,
      language: "ko",
      priority: policy.priority,
      responseMode: policy.responseMode,
    });
    results.set(taskType, decision);
  }

  return results;
}
