// ─────────────────────────────────────────────────────────────
// AI Orchestration System — Core Types
// ─────────────────────────────────────────────────────────────

// ── Enums ──

export type AiProviderType = "openai" | "anthropic" | "mock";

export type AiModelTier = "fast" | "standard" | "premium";

export type AiTaskType =
  | "comment_sentiment_analysis"
  | "comment_topic_classification"
  | "comment_risk_assessment"
  | "reply_suggestion_generation"
  | "faq_extraction"
  | "competitor_insight_generation"
  | "listening_insight_generation"
  | "strategy_insight_generation"
  | "report_summary_generation"
  | "report_action_recommendation"
  | "dashboard_explanation"
  | "user_help_answer";

export type AiTaskPriority = "low" | "normal" | "high" | "critical";

export type AiSafetyLevel = "low" | "medium" | "high" | "critical";

export type AiExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "fallback_used"
  | "timeout"
  | "validation_failed";

export type AiLanguageCode = "ko" | "en" | "ja" | "zh" | "es";

export type AiResponseMode = "structured" | "text" | "classification";

// ── Provider & Model Config ──

export interface AiModelConfig {
  modelId: string;
  provider: AiProviderType;
  tier: AiModelTier;
  displayName: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  costPerInputToken: number; // USD per token
  costPerOutputToken: number; // USD per token
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  defaultTemperature: number;
}

export interface AiProviderConfig {
  type: AiProviderType;
  displayName: string;
  apiKeyEnvVar: string;
  baseUrl?: string;
  models: AiModelConfig[];
  isEnabled: boolean;
  isHealthy: boolean;
  lastHealthCheck: string | null;
}

// ── Routing ──

export interface AiRoutingInput {
  taskType: AiTaskType;
  language: AiLanguageCode;
  priority: AiTaskPriority;
  tokenBudget?: number;
  responseMode: AiResponseMode;
  providerPreference?: AiProviderType;
  workspacePlan?: string;
  currentUsage?: AiCostEstimate;
}

export interface AiRoutingDecision {
  selectedProvider: AiProviderType;
  selectedModel: string;
  fallbackChain: { provider: AiProviderType; model: string }[];
  expectedInputTokens: number;
  expectedOutputTokens: number;
  expectedCostUsd: number;
  expectedLatencyMs: number;
  responseMode: AiResponseMode;
  reasoning: string;
}

// ── Prompt Templates ──

export interface PromptTemplate {
  key: string;
  version: string;
  taskType: AiTaskType;
  language: AiLanguageCode;
  systemInstruction: string;
  developerInstruction: string;
  outputFormatInstruction: string;
  fewShotExamples?: { input: string; output: string }[];
  safetyNote: string;
  metadata: {
    author: string;
    createdAt: string;
    updatedAt: string;
    description: string;
    tags: string[];
  };
}

// ── Execution ──

export interface PromptExecutionRequest {
  requestId: string;
  taskType: AiTaskType;
  language: AiLanguageCode;
  priority: AiTaskPriority;
  input: Record<string, unknown>;
  promptOverrides?: Partial<PromptTemplate>;
  providerPreference?: AiProviderType;
  workspaceId?: string;
  userId?: string;
  maxRetries?: number;
  timeoutMs?: number;
  tokenBudget?: number;
}

export interface PromptExecutionResult {
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
  createdAt: string;
}

// ── Structured Output ──

export interface StructuredAiOutput {
  title?: string;
  summary: string;
  bullets?: string[];
  riskFlags?: string[];
  recommendations?: string[];
  confidence: number;
  citations?: string[];
  metadata?: Record<string, unknown>;
}

// ── Validation ──

export interface OutputValidationResult {
  isValid: boolean;
  errors: OutputValidationError[];
  warnings: OutputValidationWarning[];
  score: number; // 0-100
}

export interface OutputValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface OutputValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// ── Fallback ──

export interface AiFallbackPolicy {
  taskType: AiTaskType;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  fallbackChain: { provider: AiProviderType; model: string }[];
  onAllFailed: "return_mock" | "return_error" | "return_cached";
  simplerPromptOnRetry: boolean;
}

// ── Usage & Cost ──

export interface AiUsageLog {
  id: string;
  requestId: string;
  workspaceId: string | null;
  userId: string | null;
  taskType: AiTaskType;
  provider: AiProviderType;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  status: AiExecutionStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface AiCostEstimate {
  totalRequestsToday: number;
  totalTokensToday: number;
  totalCostTodayUsd: number;
  totalRequestsMonth: number;
  totalTokensMonth: number;
  totalCostMonthUsd: number;
}

export interface AiUsageStats {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  fallbackCount: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  byProvider: Record<AiProviderType, { count: number; costUsd: number }>;
  byTaskType: Record<string, { count: number; costUsd: number }>;
  recentErrors: AiUsageLog[];
}

// ── Safety ──

export interface AiSafetyPolicy {
  taskType: AiTaskType;
  safetyLevel: AiSafetyLevel;
  bannedPhrases: string[];
  requireDisclaimer: boolean;
  disclaimerText: string;
  maxConfidenceDisplay: number; // 과도한 확신 방지
  requireEvidenceBased: boolean;
  allowedTopics?: string[];
  blockedTopics?: string[];
}

// ── Eval ──

export interface AiEvalCase {
  id: string;
  taskType: AiTaskType;
  language: AiLanguageCode;
  name: string;
  description: string;
  sampleInput: Record<string, unknown>;
  expectedOutputStyle: string;
  criteria: AiEvalCriteria;
  createdAt: string;
}

export interface AiEvalCriteria {
  relevance: { weight: number; description: string };
  clarity: { weight: number; description: string };
  actionability: { weight: number; description: string };
  safety: { weight: number; description: string };
  koreanNaturalness: { weight: number; description: string };
  schemaValidity: { weight: number; description: string };
}

export interface AiEvalResult {
  evalCaseId: string;
  executionResult: PromptExecutionResult;
  scores: {
    relevance: number;
    clarity: number;
    actionability: number;
    safety: number;
    koreanNaturalness: number;
    schemaValidity: number;
    overall: number;
  };
  notes: string;
  evaluatedAt: string;
  evaluatedBy: "auto" | "human";
}

// ── Task Policy (per task type) ──

export interface AiTaskPolicy {
  taskType: AiTaskType;
  displayName: string;
  description: string;
  preferredProvider: AiProviderType;
  preferredModel: string;
  fallbackProvider: AiProviderType;
  fallbackModel: string;
  maxLatencyMs: number;
  maxTokenBudget: number;
  responseMode: AiResponseMode;
  safetyLevel: AiSafetyLevel;
  outputSchema: string[]; // required fields
  priority: AiTaskPriority;
}

// ── Provider Interface ──

export interface AiProviderMessage {
  role: "system" | "user" | "assistant" | "developer";
  content: string;
}

export interface AiGenerateOptions {
  model: string;
  messages: AiProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json" | "text";
  stop?: string[];
}

export interface AiGenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  finishReason: string;
}

export interface IAiProvider {
  readonly type: AiProviderType;
  readonly displayName: string;

  generateText(options: AiGenerateOptions): Promise<AiGenerateResult>;
  generateStructuredOutput<T>(
    options: AiGenerateOptions,
    schema: Record<string, unknown>,
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }>;
  healthCheck(): Promise<boolean>;
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number;
  isAvailable(): boolean;
  getModels(): AiModelConfig[];
}

// ── Dev Mode ──

export interface AiDevModeConfig {
  enabled: boolean;
  mockLatencyMs: number;
  logAllRequests: boolean;
  forceProvider?: AiProviderType;
  forceModel?: string;
}
