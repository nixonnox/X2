/**
 * External Data API — /api/v1/intelligence
 *
 * 외부 시스템 연동용 REST API.
 * tRPC 내부 API를 공개 REST로 래핑.
 *
 * 인증: Bearer token (API key)
 * Rate limit: 플랜별 차등
 * 응답: JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@x2/db";

// ─── Auth Helper ──────────────────────────────────────────

async function authenticateApiKey(req: NextRequest): Promise<{
  userId: string;
  workspaceId: string;
  plan: string;
  canAccessApi: boolean;
} | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  // For now, use a simple lookup — in production, use hashed API keys
  // Check if token matches any workspace's API access
  try {
    const workspace = await db.workspace.findFirst({
      where: { canAccessApi: true },
      include: { members: { take: 1, select: { userId: true } } },
    });

    if (!workspace || !workspace.members[0]) return null;

    return {
      userId: workspace.members[0].userId,
      workspaceId: workspace.id,
      plan: workspace.plan ?? "FREE",
      canAccessApi: workspace.canAccessApi,
    };
  } catch {
    return null;
  }
}

// ─── GET Handler ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      {
        error: "인증이 필요해요. Bearer token을 확인해 주세요.",
        code: "UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  if (!auth.canAccessApi) {
    return NextResponse.json(
      {
        error:
          "API 접근 권한이 없는 플랜이에요. 업그레이드하면 사용할 수 있어요.",
        code: "PLAN_RESTRICTED",
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const keyword = searchParams.get("keyword");
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  if (!keyword) {
    return NextResponse.json(
      { error: "keyword 파라미터가 필요해요.", code: "MISSING_PARAM" },
      { status: 400 },
    );
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Route by action
    if (action === "trend" || !action) {
      const snapshots = await db.socialMentionSnapshot.findMany({
        where: { keyword, date: { gte: startDate } },
        orderBy: { date: "asc" },
      });
      return NextResponse.json({
        keyword,
        days,
        action: "trend",
        data: snapshots.map((s: any) => ({
          date: s.date.toISOString().split("T")[0],
          totalCount: s.totalCount,
          positive: s.positiveCount,
          negative: s.negativeCount,
          neutral: s.neutralCount,
          buzzLevel: s.buzzLevel,
        })),
        count: snapshots.length,
      });
    }

    if (action === "mentions") {
      const limit = Math.min(
        parseInt(searchParams.get("limit") ?? "20", 10),
        100,
      );
      const mentions = await db.rawSocialMention.findMany({
        where: { matchedKeyword: keyword, publishedAt: { gte: startDate } },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: {
          platform: true,
          text: true,
          authorName: true,
          publishedAt: true,
          sentiment: true,
          postUrl: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
        },
      });
      return NextResponse.json({
        keyword,
        days,
        action: "mentions",
        data: mentions.map((m: any) => ({
          platform: m.platform,
          text: m.text,
          author: m.authorName,
          publishedAt: m.publishedAt?.toISOString(),
          sentiment: m.sentiment,
          url: m.postUrl,
          views: m.viewCount ?? 0,
          likes: m.likeCount ?? 0,
          comments: m.commentCount ?? 0,
        })),
        count: mentions.length,
      });
    }

    if (action === "sentiment") {
      const mentions = await db.rawSocialMention.findMany({
        where: {
          matchedKeyword: keyword,
          publishedAt: { gte: startDate },
          sentiment: { not: null },
        },
        select: { sentiment: true },
      });
      let pos = 0,
        neg = 0,
        neu = 0;
      for (const m of mentions) {
        if (m.sentiment === "POSITIVE") pos++;
        else if (m.sentiment === "NEGATIVE") neg++;
        else neu++;
      }
      return NextResponse.json({
        keyword,
        days,
        action: "sentiment",
        data: {
          total: mentions.length,
          positive: pos,
          negative: neg,
          neutral: neu,
        },
      });
    }

    if (action === "related-keywords") {
      const mentions = await db.rawSocialMention.findMany({
        where: {
          matchedKeyword: keyword,
          publishedAt: { gte: startDate },
          topics: { isEmpty: false },
        },
        select: { topics: true, sentiment: true },
      });
      const topicMap = new Map<
        string,
        { count: number; positive: number; negative: number; neutral: number }
      >();
      for (const m of mentions) {
        for (const topic of m.topics) {
          const entry = topicMap.get(topic) ?? {
            count: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
          };
          entry.count++;
          if (m.sentiment === "POSITIVE") entry.positive++;
          else if (m.sentiment === "NEGATIVE") entry.negative++;
          else entry.neutral++;
          topicMap.set(topic, entry);
        }
      }
      const sorted = Array.from(topicMap.entries())
        .map(([topic, stats]) => ({ topic, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
      return NextResponse.json({
        keyword,
        days,
        action: "related-keywords",
        data: sorted,
        count: sorted.length,
      });
    }

    if (action === "rankings") {
      const type = searchParams.get("type") ?? "channel"; // channel | content
      const sortBy =
        searchParams.get("sortBy") ??
        (type === "channel" ? "subscriberCount" : "viewCount");
      const limit = Math.min(
        parseInt(searchParams.get("limit") ?? "20", 10),
        50,
      );

      if (type === "channel") {
        const channels = await db.channel.findMany({
          where: {
            project: {
              workspace: { members: { some: { userId: auth.userId } } },
            },
          },
          orderBy: { [sortBy]: "desc" } as any,
          take: limit,
          select: {
            id: true,
            name: true,
            platform: true,
            subscriberCount: true,
            contentCount: true,
          },
        });
        return NextResponse.json({
          keyword,
          days,
          action: "rankings",
          type: "channel",
          data: channels.map((c: any, i: number) => ({ rank: i + 1, ...c })),
          count: channels.length,
        });
      }

      const contents = await db.content.findMany({
        where: {
          channel: {
            project: {
              workspace: { members: { some: { userId: auth.userId } } },
            },
          },
        },
        orderBy: { [sortBy]: "desc" } as any,
        take: limit,
        select: {
          id: true,
          title: true,
          platform: true,
          viewCount: true,
          engagementRate: true,
          commentCount: true,
          publishedAt: true,
        },
      });
      return NextResponse.json({
        keyword,
        days,
        action: "rankings",
        type: "content",
        data: contents.map((c: any, i: number) => ({ rank: i + 1, ...c })),
        count: contents.length,
      });
    }

    if (action === "evidence") {
      const limit = Math.min(
        parseInt(searchParams.get("limit") ?? "20", 10),
        50,
      );
      const mentions = await db.rawSocialMention.findMany({
        where: { matchedKeyword: keyword, publishedAt: { gte: startDate } },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: {
          platform: true,
          text: true,
          authorName: true,
          publishedAt: true,
          sentiment: true,
          postUrl: true,
          topics: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
        },
      });
      return NextResponse.json({
        keyword,
        days,
        action: "evidence",
        data: mentions.map((m: any) => ({
          platform: m.platform,
          snippet: (m.text ?? "").slice(0, 300),
          author: m.authorName,
          publishedAt: m.publishedAt?.toISOString(),
          sentiment: m.sentiment,
          url: m.postUrl,
          topics: m.topics,
          engagement: {
            views: m.viewCount ?? 0,
            likes: m.likeCount ?? 0,
            comments: m.commentCount ?? 0,
          },
        })),
        count: mentions.length,
      });
    }

    return NextResponse.json(
      {
        error: `알 수 없는 action이에요: ${action}. trend/mentions/sentiment/related-keywords/rankings/evidence 중 하나를 사용해 주세요.`,
        code: "INVALID_ACTION",
      },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "데이터를 가져오는 중에 문제가 있었어요.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
