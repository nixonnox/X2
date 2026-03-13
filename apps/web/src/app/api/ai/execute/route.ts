// ─────────────────────────────────────────────────────────────
// POST /api/ai/execute — AI 작업 실행 API
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@x2/auth";
import type {
  AiTaskType,
  AiLanguageCode,
  AiTaskPriority,
  AiProviderType,
} from "@/lib/ai/types";

const VALID_TASK_TYPES: AiTaskType[] = [
  "comment_sentiment_analysis",
  "comment_topic_classification",
  "comment_risk_assessment",
  "reply_suggestion_generation",
  "faq_extraction",
  "competitor_insight_generation",
  "listening_insight_generation",
  "strategy_insight_generation",
  "report_summary_generation",
  "report_action_recommendation",
  "dashboard_explanation",
  "user_help_answer",
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      taskType,
      input,
      language = "ko",
      priority = "normal",
      providerPreference,
      workspaceId,
      userId,
      timeoutMs,
      tokenBudget,
    } = body as {
      taskType?: string;
      input?: Record<string, unknown>;
      language?: AiLanguageCode;
      priority?: AiTaskPriority;
      providerPreference?: AiProviderType;
      workspaceId?: string;
      userId?: string;
      timeoutMs?: number;
      tokenBudget?: number;
    };

    // ── 입력 검증 ──

    if (!taskType || !VALID_TASK_TYPES.includes(taskType as AiTaskType)) {
      return NextResponse.json(
        {
          error: "유효하지 않은 작업 유형입니다.",
          validTypes: VALID_TASK_TYPES,
        },
        { status: 400 },
      );
    }

    if (!input || typeof input !== "object") {
      return NextResponse.json(
        { error: "입력 데이터(input)가 필요합니다." },
        { status: 400 },
      );
    }

    // ── AI 실행 ──

    // 동적 임포트로 서버 사이드에서만 실행
    const { executeAiTask } = await import("@/lib/ai/execution/executor");

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await executeAiTask({
      requestId,
      taskType: taskType as AiTaskType,
      language,
      priority,
      input,
      providerPreference,
      workspaceId,
      userId,
      timeoutMs,
      tokenBudget,
    });

    return NextResponse.json({
      success:
        result.status === "completed" || result.status === "fallback_used",
      data: result,
    });
  } catch (error) {
    console.error("[API /ai/execute] 오류:", error);
    return NextResponse.json(
      { error: "AI 작업 실행 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// ── GET: 지원 작업 유형 목록 ──

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { getAllTaskPolicies } =
      await import("@/lib/ai/routing/task-policies");

    const policies = getAllTaskPolicies();
    const tasks = policies.map((p) => ({
      taskType: p.taskType,
      displayName: p.displayName,
      description: p.description,
      preferredProvider: p.preferredProvider,
      responseMode: p.responseMode,
      safetyLevel: p.safetyLevel,
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[API /ai/execute GET] 오류:", error);
    return NextResponse.json(
      { error: "작업 유형 목록을 가져오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
