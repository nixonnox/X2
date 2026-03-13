// ─────────────────────────────────────────────────────────────
// AI Executor — 중앙 실행 오케스트레이터
// ─────────────────────────────────────────────────────────────

import type {
  AiProviderType,
  AiTaskType,
  AiDevModeConfig,
  AiGenerateResult,
  AiRoutingDecision,
  AiRoutingInput,
  PromptExecutionRequest,
  PromptExecutionResult,
  StructuredAiOutput,
  OutputValidationResult,
  AiExecutionStatus,
  PromptTemplate,
  AiGenerateOptions,
  AiProviderMessage,
} from "../types";
import { fallbackManager } from "./fallback-manager";
import { validateOutput, normalizeOutput } from "./output-validator";

// ── 의존성 인터페이스 (느슨한 결합) ──
// 라우터, 프롬프트 레지스트리, 프로바이더 레지스트리, 로거는
// 아직 구현되지 않았을 수 있으므로 런타임에 동적으로 로드합니다.

interface RouterModule {
  routeTask(input: AiRoutingInput): AiRoutingDecision;
}

interface PromptRegistryModule {
  getTemplate(taskType: AiTaskType, language: string): PromptTemplate | null;
}

interface PromptRendererModule {
  renderPrompt(
    template: PromptTemplate,
    variables: Record<string, unknown>,
  ): { systemMessage: string; userMessage: string };
}

interface ProviderRegistryModule {
  getProvider(type: AiProviderType): {
    generateText(options: AiGenerateOptions): Promise<AiGenerateResult>;
    estimateCost(
      inputTokens: number,
      outputTokens: number,
      model: string,
    ): number;
  } | null;
}

interface UsageLoggerModule {
  logUsage(log: Record<string, unknown>): void;
}

// ── 의존성 홀더 ──
// 각 모듈은 초기화 시 또는 첫 사용 시 로드됩니다.

let _router: RouterModule | null = null;
let _promptRegistry: PromptRegistryModule | null = null;
let _promptRenderer: PromptRendererModule | null = null;
let _providerRegistry: ProviderRegistryModule | null = null;
let _usageLogger: UsageLoggerModule | null = null;

/**
 * 의존성을 주입합니다. 테스트 및 초기화에 사용됩니다.
 */
export function initializeExecutor(deps: {
  router?: RouterModule;
  promptRegistry?: PromptRegistryModule;
  promptRenderer?: PromptRendererModule;
  providerRegistry?: ProviderRegistryModule;
  usageLogger?: UsageLoggerModule;
}): void {
  if (deps.router) _router = deps.router;
  if (deps.promptRegistry) _promptRegistry = deps.promptRegistry;
  if (deps.promptRenderer) _promptRenderer = deps.promptRenderer;
  if (deps.providerRegistry) _providerRegistry = deps.providerRegistry;
  if (deps.usageLogger) _usageLogger = deps.usageLogger;
}

// ── 요청 ID 생성 ──

function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `ai-req-${timestamp}-${random}`;
}

// ── 개발 모드 설정 ──

export function getDevMode(): AiDevModeConfig {
  const enabled =
    typeof process !== "undefined" && process.env?.AI_DEV_MODE === "true";
  const mockLatencyMs =
    typeof process !== "undefined" && process.env?.AI_MOCK_LATENCY_MS
      ? parseInt(process.env.AI_MOCK_LATENCY_MS, 10)
      : 200;
  const forceProvider =
    typeof process !== "undefined" && process.env?.AI_FORCE_PROVIDER
      ? (process.env.AI_FORCE_PROVIDER as AiProviderType)
      : undefined;
  const forceModel =
    typeof process !== "undefined" && process.env?.AI_FORCE_MODEL
      ? process.env.AI_FORCE_MODEL
      : undefined;

  return {
    enabled,
    mockLatencyMs: isNaN(mockLatencyMs) ? 200 : mockLatencyMs,
    logAllRequests: enabled,
    forceProvider,
    forceModel,
  };
}

// ── 기본 라우팅 결정 (라우터 미등록 시) ──

function getDefaultRoutingDecision(
  request: PromptExecutionRequest,
): AiRoutingDecision {
  return {
    selectedProvider: request.providerPreference ?? "openai",
    selectedModel: "gpt-4o-mini",
    fallbackChain: [
      { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
    ],
    expectedInputTokens: 500,
    expectedOutputTokens: 1000,
    expectedCostUsd: 0.001,
    expectedLatencyMs: 3000,
    responseMode: "structured",
    reasoning: "기본 라우팅 결정 (라우터 미등록)",
  };
}

// ── 기본 프롬프트 메시지 생성 (프롬프트 레지스트리 미등록 시) ──

function buildDefaultMessages(
  request: PromptExecutionRequest,
): AiProviderMessage[] {
  const systemMsg = `당신은 소셜 미디어 분석 AI 어시스턴트입니다. ${request.language === "ko" ? "한국어로 응답해 주세요." : `Respond in ${request.language}.`}`;
  const userMsg = `태스크: ${request.taskType}\n입력 데이터:\n${JSON.stringify(request.input, null, 2)}`;

  return [
    { role: "system" as const, content: systemMsg },
    { role: "user" as const, content: userMsg },
  ];
}

// ── 프롬프트 렌더링 ──

function renderMessages(request: PromptExecutionRequest): {
  messages: AiProviderMessage[];
  promptVersion: string;
} {
  // 프롬프트 레지스트리가 등록된 경우
  if (_promptRegistry && _promptRenderer) {
    const template = _promptRegistry.getTemplate(
      request.taskType,
      request.language,
    );
    if (template) {
      const overriddenTemplate = request.promptOverrides
        ? { ...template, ...request.promptOverrides }
        : template;

      const rendered = _promptRenderer.renderPrompt(
        overriddenTemplate,
        request.input,
      );
      return {
        messages: [
          { role: "system" as const, content: rendered.systemMessage },
          { role: "user" as const, content: rendered.userMessage },
        ],
        promptVersion: overriddenTemplate.version,
      };
    }
  }

  // 기본 메시지 사용
  return {
    messages: buildDefaultMessages(request),
    promptVersion: "default-1.0",
  };
}

// ── 실행 결과 생성 ──

function buildResult(params: {
  requestId: string;
  taskType: AiTaskType;
  status: AiExecutionStatus;
  provider: AiProviderType;
  model: string;
  promptVersion: string;
  rawOutput: string;
  normalizedOutput: StructuredAiOutput | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  validationResult: OutputValidationResult | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
}): PromptExecutionResult {
  return {
    ...params,
    createdAt: new Date().toISOString(),
  };
}

// ── 메인 실행 함수 ──

export async function executeAiTask(
  request: PromptExecutionRequest,
): Promise<PromptExecutionResult> {
  const requestId = request.requestId || generateRequestId();
  const startTime = Date.now();

  const devMode = getDevMode();

  try {
    // 1. 라우팅 결정
    let routingDecision: AiRoutingDecision;
    if (_router) {
      const routingInput: AiRoutingInput = {
        taskType: request.taskType,
        language: request.language,
        priority: request.priority,
        tokenBudget: request.tokenBudget,
        responseMode: "structured",
        providerPreference: request.providerPreference,
      };
      routingDecision = _router.routeTask(routingInput);
    } else {
      routingDecision = getDefaultRoutingDecision(request);
    }

    // 개발 모드 강제 설정
    if (devMode.enabled) {
      if (devMode.forceProvider) {
        routingDecision.selectedProvider = devMode.forceProvider;
      }
      if (devMode.forceModel) {
        routingDecision.selectedModel = devMode.forceModel;
      }
    }

    // 2. 프롬프트 렌더링
    const { messages, promptVersion } = renderMessages(request);

    // 3. 폴백 매니저를 통한 실행
    const executeFn = async (
      provider: AiProviderType,
      model: string,
    ): Promise<AiGenerateResult> => {
      if (!_providerRegistry) {
        throw new Error("프로바이더 레지스트리가 초기화되지 않았습니다.");
      }

      const providerInstance = _providerRegistry.getProvider(provider);
      if (!providerInstance) {
        throw new Error(`프로바이더를 찾을 수 없습니다: ${provider}`);
      }

      const options: AiGenerateOptions = {
        model,
        messages,
        temperature: 0.7,
        maxTokens: request.tokenBudget ?? routingDecision.expectedOutputTokens,
        responseFormat:
          routingDecision.responseMode === "structured" ? "json" : "text",
      };

      return providerInstance.generateText(options);
    };

    const fallbackResult = await fallbackManager.executeWithFallback(
      request.taskType,
      executeFn,
      routingDecision,
    );

    const latencyMs = Date.now() - startTime;

    // 4. 출력 검증
    const validationResult = validateOutput(
      fallbackResult.result.text,
      request.taskType,
      request.language,
      [], // 필수 필드는 태스크 정책에서 가져와야 하지만 현재는 빈 배열
    );

    // 5. 검증 실패 시 재시도 (최대 1회)
    if (!validationResult.isValid && (request.maxRetries ?? 0) > 0) {
      console.warn(
        `[Executor] 출력 검증 실패. 단순화된 프롬프트로 재시도합니다. 오류: ${validationResult.errors.map((e) => e.message).join(", ")}`,
      );

      const retryRequest: PromptExecutionRequest = {
        ...request,
        requestId,
        maxRetries: 0, // 재시도에서는 추가 재시도 방지
      };
      return executeAiTask(retryRequest);
    }

    // 6. 출력 정규화
    const normalized = normalizeOutput(
      fallbackResult.result.text,
      request.taskType,
    );

    // 7. 비용 추정
    let estimatedCostUsd = 0;
    if (_providerRegistry) {
      const providerInstance = _providerRegistry.getProvider(
        fallbackResult.provider,
      );
      if (providerInstance) {
        estimatedCostUsd = providerInstance.estimateCost(
          fallbackResult.result.inputTokens,
          fallbackResult.result.outputTokens,
          fallbackResult.result.model,
        );
      }
    }

    // 8. 사용량 로깅
    const status: AiExecutionStatus = fallbackResult.fallbackUsed
      ? "fallback_used"
      : validationResult.isValid
        ? "completed"
        : "validation_failed";

    if (_usageLogger) {
      _usageLogger.logUsage({
        id: generateRequestId(),
        requestId,
        workspaceId: request.workspaceId ?? null,
        userId: request.userId ?? null,
        taskType: request.taskType,
        provider: fallbackResult.provider,
        model: fallbackResult.model,
        promptVersion,
        inputTokens: fallbackResult.result.inputTokens,
        outputTokens: fallbackResult.result.outputTokens,
        latencyMs,
        estimatedCostUsd,
        status,
        errorMessage: null,
        createdAt: new Date().toISOString(),
      });
    }

    // 9. 결과 반환
    return buildResult({
      requestId,
      taskType: request.taskType,
      status,
      provider: fallbackResult.provider,
      model: fallbackResult.model,
      promptVersion,
      rawOutput: fallbackResult.result.text,
      normalizedOutput: normalized,
      inputTokens: fallbackResult.result.inputTokens,
      outputTokens: fallbackResult.result.outputTokens,
      latencyMs,
      estimatedCostUsd,
      validationResult,
      fallbackUsed: fallbackResult.fallbackUsed,
      fallbackReason: fallbackResult.fallbackReason,
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[Executor] AI 태스크 실행 실패: ${errorMessage}`);

    // 사용량 로깅 (실패)
    if (_usageLogger) {
      _usageLogger.logUsage({
        id: generateRequestId(),
        requestId,
        workspaceId: request.workspaceId ?? null,
        userId: request.userId ?? null,
        taskType: request.taskType,
        provider: request.providerPreference ?? "openai",
        model: "unknown",
        promptVersion: "unknown",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        estimatedCostUsd: 0,
        status: "failed" as AiExecutionStatus,
        errorMessage,
        createdAt: new Date().toISOString(),
      });
    }

    return buildResult({
      requestId,
      taskType: request.taskType,
      status: "failed",
      provider: request.providerPreference ?? "openai",
      model: "unknown",
      promptVersion: "unknown",
      rawOutput: "",
      normalizedOutput: null,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      estimatedCostUsd: 0,
      validationResult: null,
      fallbackUsed: false,
      fallbackReason: errorMessage,
    });
  }
}

// ── 분류 최적화 실행 ──

export async function executeClassification(
  request: PromptExecutionRequest,
): Promise<PromptExecutionResult> {
  // 분류 태스크에 최적화된 설정 적용
  const classificationRequest: PromptExecutionRequest = {
    ...request,
    tokenBudget: request.tokenBudget ?? 256, // 짧은 토큰 버짓
    maxRetries: request.maxRetries ?? 1,
    timeoutMs: request.timeoutMs ?? 10_000, // 짧은 타임아웃
  };

  return executeAiTask(classificationRequest);
}

// ── 배치 실행 ──

export async function executeBatch(
  requests: PromptExecutionRequest[],
): Promise<PromptExecutionResult[]> {
  const results: PromptExecutionResult[] = [];

  for (const request of requests) {
    try {
      const result = await executeAiTask(request);
      results.push(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        `[Executor] 배치 실행 중 오류 (requestId: ${request.requestId}): ${errorMessage}`,
      );

      // 개별 실패는 에러 결과로 기록하고 계속 진행
      results.push(
        buildResult({
          requestId: request.requestId || generateRequestId(),
          taskType: request.taskType,
          status: "failed",
          provider: request.providerPreference ?? "openai",
          model: "unknown",
          promptVersion: "unknown",
          rawOutput: "",
          normalizedOutput: null,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          estimatedCostUsd: 0,
          validationResult: null,
          fallbackUsed: false,
          fallbackReason: errorMessage,
        }),
      );
    }
  }

  return results;
}
