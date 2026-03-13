import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess, unwrapResult } from "./_helpers";

export const intentRouter = router({
  /** 인텐트 분석 시작 (큐에 추가) */
  analyze: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        seedKeyword: z.string().min(1).max(200),
        locale: z.enum(["ko", "en", "ja"]).default("ko"),
        maxDepth: z.number().min(1).max(4).default(2),
        maxKeywords: z.number().min(10).max(500).default(150),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const result = await ctx.services.intentAnalysis.analyzeIntent(
        input.projectId,
        input.seedKeyword,
        { requestId: `trpc-${Date.now()}`, userId: ctx.userId, source: "trpc" },
        {
          locale: input.locale,
          maxDepth: input.maxDepth,
          maxKeywords: input.maxKeywords,
        },
      );

      return unwrapResult(result);
    }),

  /** 인텐트 분석 처리 실행 (큐에서 꺼내서 처리) */
  process: protectedProcedure
    .input(z.object({ queryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify query exists and user has access
      const query = await ctx.db.intentQuery.findUnique({
        where: { id: input.queryId },
        select: { projectId: true },
      });
      if (!query) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "분석 쿼리를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, query.projectId);

      const result = await ctx.services.intentAnalysis.processIntentAnalysis(
        input.queryId,
        { requestId: `trpc-${Date.now()}`, userId: ctx.userId, source: "trpc" },
      );

      return unwrapResult(result);
    }),

  /** 프로젝트의 인텐트 분석 기록 목록 */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      return ctx.db.intentQuery.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          _count: { select: { keywords: true } },
        },
      });
    }),

  /** 특정 인텐트 분석 상세 (키워드 결과 포함) */
  get: protectedProcedure
    .input(z.object({ queryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const query = await ctx.db.intentQuery.findUnique({
        where: { id: input.queryId },
        select: { projectId: true },
      });
      if (!query) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "분석 쿼리를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, query.projectId);

      return ctx.db.intentQuery.findUnique({
        where: { id: input.queryId },
        include: {
          keywords: { orderBy: { gapScore: "desc" } },
        },
      });
    }),

  /** 키워드 결과 필터링 조회 */
  keywords: protectedProcedure
    .input(
      z.object({
        queryId: z.string(),
        category: z
          .enum([
            "DISCOVERY",
            "COMPARISON",
            "ACTION",
            "TROUBLESHOOTING",
            "NAVIGATION",
            "UNKNOWN",
          ])
          .optional(),
        gapType: z
          .enum(["BLUE_OCEAN", "OPPORTUNITY", "COMPETITIVE", "SATURATED"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify access
      const query = await ctx.db.intentQuery.findUnique({
        where: { id: input.queryId },
        select: { projectId: true },
      });
      if (!query) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "분석 쿼리를 찾을 수 없습니다.",
        });
      }
      await verifyProjectAccess(ctx.db, ctx.userId, query.projectId);

      return ctx.db.intentKeywordResult.findMany({
        where: {
          queryId: input.queryId,
          ...(input.category && { intentCategory: input.category }),
          ...(input.gapType && { gapType: input.gapType }),
        },
        orderBy: { gapScore: "desc" },
      });
    }),

  /** 프로젝트의 갭 기회 키워드 (블루오션 + 기회 영역) */
  gapOpportunities: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const result = await ctx.services.intentAnalysis.getGapOpportunities(
        input.projectId,
      );
      return unwrapResult(result);
    }),

  /** GPT 클러스터 종합 분석 */
  gptAnalyze: protectedProcedure
    .input(
      z.object({
        seedKeyword: z.string().min(1),
        clusterName: z.string().min(1),
        keywords: z.array(z.string()).min(1).max(50),
        dominantIntent: z.string().optional(),
        dominantPhase: z.string().optional(),
        avgGapScore: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // GPT analysis doesn't need project access — it's a stateless LLM call
      const apiKey = process.env.OPENAI_API_KEY;

      const intentLabel = input.dominantIntent
        ? ({
            discovery: "정보 탐색",
            comparison: "비교/리뷰",
            action: "구매/행동",
            troubleshooting: "문제 해결",
          }[input.dominantIntent] ?? input.dominantIntent)
        : "미분류";
      const phaseLabel = input.dominantPhase
        ? ({ before: "검색 이전", current: "현재 검색", after: "검색 이후" }[
            input.dominantPhase
          ] ?? input.dominantPhase)
        : "미분류";

      if (!apiKey) {
        // Fallback analysis (no API key)
        return generateFallback(
          input.seedKeyword,
          input.clusterName,
          input.keywords,
          intentLabel,
          input.avgGapScore,
        );
      }

      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL ?? "gpt-4o",
              messages: [
                { role: "system", content: GPT_SYSTEM_PROMPT },
                {
                  role: "user",
                  content: `시드 키워드: "${input.seedKeyword}"\n클러스터명: "${input.clusterName}"\n주요 의도: ${intentLabel}\n시간적 단계: ${phaseLabel}\n평균 갭 스코어: ${input.avgGapScore?.toFixed(1) ?? "N/A"}\n포함 키워드 (${input.keywords.length}개):\n${input.keywords
                    .slice(0, 30)
                    .map((k, i) => `${i + 1}. ${k}`)
                    .join("\n")}`,
                },
              ],
              temperature: 0.4,
              max_tokens: 3000,
              response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(60_000),
          },
        );

        if (!response.ok) {
          return generateFallback(
            input.seedKeyword,
            input.clusterName,
            input.keywords,
            intentLabel,
            input.avgGapScore,
          );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          return generateFallback(
            input.seedKeyword,
            input.clusterName,
            input.keywords,
            intentLabel,
            input.avgGapScore,
          );
        }

        const parsed = JSON.parse(content);
        return {
          summary: String(parsed.summary ?? ""),
          topKeywords: Array.isArray(parsed.topKeywords)
            ? parsed.topKeywords.slice(0, 10).map(String)
            : input.keywords.slice(0, 5),
          personas: Array.isArray(parsed.personas)
            ? parsed.personas.slice(0, 5).map((p: any) => ({
                label: String(p.label ?? ""),
                situation: String(p.situation ?? ""),
                questions: Array.isArray(p.questions)
                  ? p.questions.map(String).slice(0, 5)
                  : [],
              }))
            : [],
          topics: Array.isArray(parsed.topics)
            ? parsed.topics.slice(0, 15).map((t: any) => ({
                question: String(t.question ?? ""),
                evidence: String(t.evidence ?? ""),
              }))
            : [],
        };
      } catch {
        return generateFallback(
          input.seedKeyword,
          input.clusterName,
          input.keywords,
          intentLabel,
          input.avgGapScore,
        );
      }
    }),
});

// ── GPT System Prompt ──

const GPT_SYSTEM_PROMPT = `당신은 검색 의도 분석 전문가이자 디지털 마케팅 컨설턴트입니다.
주어진 키워드 클러스터를 분석하여 다음을 제공합니다:
1. **종합 분석**: 이 클러스터의 검색 패턴과 소비자 심리를 요약 (3-5문장)
2. **상위 키워드**: 클러스터에서 가장 중요한 5개 키워드 선정
3. **페르소나 분석**: 이 클러스터를 검색하는 3가지 소비자 유형
4. **주요 토픽**: 상위 10개 키워드에 대한 핵심 질문과 근거

**응답 형식**: JSON
{
  "summary": "종합 분석",
  "topKeywords": ["키워드1", ...],
  "personas": [{"label": "유형명", "situation": "상황", "questions": ["질문1", ...]}],
  "topics": [{"question": "핵심 질문", "evidence": "근거"}]
}`;

// ── Fallback ──

function generateFallback(
  seedKeyword: string,
  clusterName: string,
  keywords: string[],
  intentLabel: string,
  avgGapScore?: number,
) {
  const gapDesc =
    (avgGapScore ?? 50) > 60
      ? "블루오션 기회가 높은"
      : (avgGapScore ?? 50) > 30
        ? "적절한 경쟁이 있는"
        : "경쟁이 치열한";
  return {
    summary: `"${clusterName}" 클러스터는 "${seedKeyword}" 관련 ${keywords.length}개의 키워드로 구성되어 있습니다. 주요 검색 의도는 ${intentLabel}이며, ${gapDesc} 영역입니다.`,
    topKeywords: keywords.slice(0, 5),
    personas: [
      {
        label: "정보 탐색자",
        situation: `${seedKeyword} 관련 기본 정보를 찾는 사용자`,
        questions: ["정확히 무엇인가요?", "장단점은?", "시작 방법은?"],
      },
      {
        label: "비교 검토자",
        situation: "여러 대안을 비교하려는 사용자",
        questions: ["다른 옵션과 차이점은?", "가성비는?", "실제 후기는?"],
      },
      {
        label: "실행 결정자",
        situation: "구체적 실행 방법을 찾는 사용자",
        questions: ["어디서 시작하나요?", "프로모션은?", "가이드는?"],
      },
    ],
    topics: keywords.slice(0, 10).map((kw) => ({
      question: `"${kw}" 검색자의 핵심 궁금증은?`,
      evidence: `${intentLabel} 의도의 키워드로, 실용적 정보 수요가 높음`,
    })),
  };
}
