import { z } from "zod";
import http from "node:http";
import https from "node:https";
import { router, protectedProcedure } from "../trpc";

/** SSL 인증서 검증을 우회하는 HTTP(S) 요청 (불완전한 인증서 체인 대응) */
async function fetchPage(
  url: string,
  opts: { timeout?: number; maxRedirects?: number } = {},
): Promise<{ ok: boolean; status: number; body: string }> {
  const { timeout = 15000, maxRedirects = 5 } = opts;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      u,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; X2-GeoScorer/1.0; +https://x2.app)",
          Accept: "text/html,*/*",
        },
        rejectUnauthorized: false,
        timeout,
      },
      (res) => {
        // Follow redirects
        if (
          [301, 302, 307, 308].includes(res.statusCode ?? 0) &&
          res.headers.location &&
          maxRedirects > 0
        ) {
          const next = new URL(res.headers.location, url).href;
          fetchPage(next, { timeout, maxRedirects: maxRedirects - 1 })
            .then(resolve)
            .catch(reject);
          res.resume(); // drain
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          const status = res.statusCode ?? 0;
          resolve({ ok: status >= 200 && status < 300, status, body });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("타임아웃"));
    });
    req.on("error", reject);
    req.end();
  });
}

const AeoEngineEnum = z.enum([
  "PERPLEXITY",
  "GOOGLE_AI_OVERVIEW",
  "BING_COPILOT",
  "CHATGPT_SEARCH",
]);

export const geoAeoRouter = router({
  // ─── Keywords ──────────────────────────────────────────────

  /** AEO 키워드 목록 조회 */
  listKeywords: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const keywords = await ctx.db.aeoKeyword.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 4, // latest per engine
          },
        },
      });
      return { keywords };
    }),

  /** AEO 키워드 등록 */
  registerKeyword: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1).max(100),
        targetEngines: z.array(AeoEngineEnum).min(1),
        locale: z.string().default("ko"),
        targetBrand: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.aeoKeyword.findFirst({
        where: {
          projectId: input.projectId,
          keyword: input.keyword,
          locale: input.locale,
        },
      });
      if (existing) {
        return { keyword: existing, created: false };
      }

      const keyword = await ctx.db.aeoKeyword.create({
        data: {
          projectId: input.projectId,
          keyword: input.keyword,
          locale: input.locale,
          targetBrand: input.targetBrand ?? null,
          status: "ACTIVE",
        },
      });
      return { keyword, created: true };
    }),

  /** AEO 키워드 삭제 */
  deleteKeyword: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.aeoSnapshot.deleteMany({ where: { keywordId: input.id } });
      await ctx.db.aeoKeyword.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ─── Snapshots & Visibility ────────────────────────────────

  /** 키워드별 엔진별 최신 스냅샷 */
  getSnapshots: protectedProcedure
    .input(
      z.object({
        keywordId: z.string(),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const snapshots = await ctx.db.aeoSnapshot.findMany({
        where: { keywordId: input.keywordId, date: { gte: since } },
        orderBy: { date: "desc" },
      });
      return { snapshots };
    }),

  /** 가시성 대시보드 (프로젝트 전체) */
  visibilityDashboard: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const keywords = await ctx.db.aeoKeyword.findMany({
        where: { projectId: input.projectId, status: "ACTIVE" },
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 20,
          },
        },
      });

      const byKeyword = keywords.map((kw) => {
        const engineMap = new Map<
          string,
          { current: number; previous: number }
        >();
        for (const snap of kw.snapshots) {
          const existing = engineMap.get(snap.engine);
          if (!existing) {
            engineMap.set(snap.engine, {
              current: snap.visibilityScore ?? 0,
              previous: 0,
            });
          } else if (existing.previous === 0) {
            existing.previous = snap.visibilityScore ?? 0;
          }
        }

        const engines = Array.from(engineMap.entries()).map(
          ([engine, { current, previous }]) => ({
            engine,
            currentScore: current,
            previousScore: previous,
            trend:
              current > previous + 5
                ? ("RISING" as const)
                : current < previous - 5
                  ? ("DECLINING" as const)
                  : ("STABLE" as const),
          }),
        );

        const avg =
          engines.length > 0
            ? Math.round(
                engines.reduce((s, e) => s + e.currentScore, 0) /
                  engines.length,
              )
            : 0;

        return {
          keyword: kw.keyword,
          keywordId: kw.id,
          engines,
          averageScore: avg,
        };
      });

      const allScores = byKeyword.map((k) => k.averageScore);
      const overallAvg =
        allScores.length > 0
          ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
          : 0;

      return {
        overall: {
          averageVisibility: overallAvg,
          keywordsTracked: keywords.length,
          enginesTracked: new Set(
            keywords.flatMap((k) => k.snapshots.map((s) => s.engine)),
          ).size,
        },
        byKeyword,
        risingKeywords: byKeyword
          .filter((k) => k.engines.some((e) => e.trend === "RISING"))
          .map((k) => k.keyword),
        decliningKeywords: byKeyword
          .filter((k) => k.engines.some((e) => e.trend === "DECLINING"))
          .map((k) => k.keyword),
      };
    }),

  // ─── Citation Sources ──────────────────────────────────────

  /** 인용 소스 목록 */
  listCitationSources: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sourceType: z.string().optional(),
        geoOptimized: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { projectId: input.projectId };
      if (input.sourceType) where.sourceType = input.sourceType;
      if (input.geoOptimized !== undefined)
        where.geoOptimized = input.geoOptimized;

      const sources = await ctx.db.citationReadyReportSource.findMany({
        where,
        orderBy: { currentCitationCount: "desc" },
      });
      return { sources };
    }),

  /** 인용 소스 등록 */
  registerCitationSource: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sourceUrl: z.string().url(),
        title: z.string().min(1),
        sourceType: z
          .enum([
            "BLOG_POST",
            "LANDING_PAGE",
            "PRODUCT_PAGE",
            "FAQ_PAGE",
            "VIDEO",
            "RESEARCH_REPORT",
            "PRESS_RELEASE",
            "SOCIAL_POST",
          ])
          .default("BLOG_POST"),
        primaryTopic: z.string().optional(),
        targetKeywords: z.array(z.string()).default([]),
        geoOptimized: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.citationReadyReportSource.create({
        data: {
          projectId: input.projectId,
          url: input.sourceUrl,
          title: input.title,
          domain: new URL(input.sourceUrl).hostname,
          sourceType: input.sourceType,
          primaryTopic: input.primaryTopic ?? null,
          targetKeywords: input.targetKeywords,
          geoOptimized: input.geoOptimized,
        },
      });
      return { source };
    }),

  /** 인용 건강도 리포트 */
  citationHealth: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sources = await ctx.db.citationReadyReportSource.findMany({
        where: { projectId: input.projectId },
      });

      const total = sources.length;
      const cited = sources.filter((s) => s.currentCitationCount > 0).length;
      const uncited = total - cited;
      const citationRate = total > 0 ? Math.round((cited / total) * 100) : 0;

      const mostCited = sources
        .filter((s) => s.currentCitationCount > 0)
        .sort((a, b) => b.currentCitationCount - a.currentCitationCount)
        .slice(0, 10)
        .map((s) => ({
          url: s.url,
          title: s.title,
          citationCount: s.currentCitationCount,
          lastEngine: s.lastCitedEngine,
        }));

      const needsOptimization = sources
        .filter((s) => !s.geoOptimized || s.currentCitationCount === 0)
        .slice(0, 10)
        .map((s) => ({
          url: s.url,
          title: s.title,
          reason: !s.geoOptimized ? "GEO 미최적화" : "인용 0건",
        }));

      return {
        total,
        cited,
        uncited,
        citationRate,
        mostCited,
        needsOptimization,
      };
    }),

  // ─── Scoring ───────────────────────────────────────────────

  /** URL의 GEO/AEO 점수 분석 */
  scoreUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const { ok, status, body: html } = await fetchPage(input.url);

        if (!ok) {
          return { error: `HTTP ${status}`, scores: null };
        }

        // Rule-based scoring
        const hasHeadings = (html.match(/<h[1-6][^>]*>/gi) || []).length;
        const hasFaq =
          /faq|자주\s*묻는|질문/i.test(html) || /FAQPage/i.test(html);
        const hasSchema = /schema\.org|application\/ld\+json/i.test(html);
        const hasList = (html.match(/<(ul|ol)[^>]*>/gi) || []).length;
        const hasTable = (html.match(/<table[^>]*>/gi) || []).length;
        const wordCount = html.replace(/<[^>]*>/g, "").split(/\s+/).length;
        const hasDate =
          /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|updated|수정일|작성일/i.test(html);
        const hasAuthor = /author|작성자|by\s/i.test(html);
        const hasCitation = /cite|참고|출처|reference/i.test(html);

        const structure = Math.min(
          100,
          (hasHeadings > 3 ? 30 : hasHeadings * 8) +
            (hasFaq ? 25 : 0) +
            (hasSchema ? 20 : 0) +
            (hasList > 0 ? 15 : 0) +
            (hasTable > 0 ? 10 : 0),
        );

        const answerability = Math.min(
          100,
          (hasFaq ? 30 : 0) +
            (hasHeadings > 2 ? 20 : 0) +
            (wordCount > 1000 ? 25 : wordCount > 500 ? 15 : 5) +
            (hasList > 0 ? 15 : 0) +
            (hasTable > 0 ? 10 : 0),
        );

        const trust = Math.min(
          100,
          (hasDate ? 25 : 0) +
            (hasAuthor ? 20 : 0) +
            (hasCitation ? 25 : 0) +
            (hasSchema ? 15 : 0) +
            (wordCount > 2000 ? 15 : wordCount > 1000 ? 10 : 0),
        );

        const citationReadiness = Math.min(
          100,
          (wordCount > 800 ? 20 : 10) +
            (hasHeadings > 2 ? 20 : 10) +
            (hasSchema ? 20 : 0) +
            (hasFaq ? 15 : 0) +
            (hasCitation ? 15 : 0) +
            (hasDate ? 10 : 0),
        );

        const overall = Math.round(
          (structure + answerability + trust + citationReadiness) / 4,
        );

        return {
          error: null,
          scores: {
            overall,
            structure,
            answerability,
            trust,
            citationReadiness,
            details: {
              hasHeadings,
              hasFaq,
              hasSchema,
              hasList: hasList > 0,
              hasTable: hasTable > 0,
              wordCount,
              hasDate,
              hasAuthor,
              hasCitation,
            },
          },
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown";
        if (msg.includes("타임아웃"))
          return { error: "타임아웃 (15초)", scores: null };
        if (msg.includes("ENOTFOUND"))
          return { error: "도메인을 찾을 수 없습니다", scores: null };
        if (msg.includes("ECONNREFUSED"))
          return { error: "서버 연결이 거부되었습니다", scores: null };
        return { error: `페이지 요청 실패: ${msg}`, scores: null };
      }
    }),

  // ─── Collect Snapshots (AI Engine Query) ───────────────────

  /** 키워드에 대해 AI 엔진 스냅샷 수집 */
  collectSnapshot: protectedProcedure
    .input(
      z.object({
        keywordId: z.string(),
        engine: AeoEngineEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const keyword = await ctx.db.aeoKeyword.findUnique({
        where: { id: input.keywordId },
      });
      if (!keyword)
        return { error: "키워드를 찾을 수 없습니다", snapshot: null };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check for existing snapshot today
      const existing = await ctx.db.aeoSnapshot.findFirst({
        where: {
          keywordId: input.keywordId,
          engine: input.engine,
          date: today,
        },
      });
      if (existing) {
        return { error: null, snapshot: existing, cached: true };
      }

      // Query AI engine
      const result = await queryAiEngine(
        keyword.keyword,
        input.engine,
        keyword.targetBrand,
      );

      const snapshot = await ctx.db.aeoSnapshot.create({
        data: {
          keywordId: input.keywordId,
          date: today,
          engine: input.engine,
          aiResponse: result.response,
          citedSources: result.citedSources,
          brandMentioned: result.brandMentioned,
          visibilityScore: result.visibilityScore,
        },
      });

      return { error: null, snapshot, cached: false };
    }),
});

// ─── AI Engine Query Helper ──────────────────────────────────

async function queryAiEngine(
  keyword: string,
  engine: string,
  targetBrand: string | null,
): Promise<{
  response: string;
  citedSources: string[];
  brandMentioned: boolean;
  visibilityScore: number;
}> {
  const query = `${keyword}에 대해 알려주세요`;

  if (engine === "PERPLEXITY") {
    return queryPerplexity(query, targetBrand);
  }

  // Default: simulate for engines without API access yet
  return {
    response: `[${engine}] "${keyword}" 검색 결과 — 실제 API 연동 필요`,
    citedSources: [],
    brandMentioned: false,
    visibilityScore: 0,
  };
}

async function queryPerplexity(
  query: string,
  targetBrand: string | null,
): Promise<{
  response: string;
  citedSources: string[];
  brandMentioned: boolean;
  visibilityScore: number;
}> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return {
      response: "[Perplexity] API 키 미설정",
      citedSources: [],
      brandMentioned: false,
      visibilityScore: 0,
    };
  }

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: query }],
      }),
    });

    if (!res.ok) {
      return {
        response: `Perplexity API ${res.status}`,
        citedSources: [],
        brandMentioned: false,
        visibilityScore: 0,
      };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const citations: string[] = data.citations ?? [];

    const brandMentioned = targetBrand
      ? content.toLowerCase().includes(targetBrand.toLowerCase())
      : false;

    // Visibility: brand mentioned + cited = high, only mentioned = medium
    let visibilityScore = 0;
    if (brandMentioned && citations.length > 0) visibilityScore = 80;
    else if (brandMentioned) visibilityScore = 50;
    else if (citations.length > 0) visibilityScore = 20;

    return {
      response: content.slice(0, 2000),
      citedSources: citations.slice(0, 20),
      brandMentioned,
      visibilityScore,
    };
  } catch (e) {
    return {
      response: `Perplexity error: ${e instanceof Error ? e.message : "Unknown"}`,
      citedSources: [],
      brandMentioned: false,
      visibilityScore: 0,
    };
  }
}
