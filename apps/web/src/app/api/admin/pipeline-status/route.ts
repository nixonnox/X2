import { NextResponse } from "next/server";
import { db } from "@x2/db";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Database check
  let dbConnected = false;
  let tableCount = 0;
  try {
    const tables: any[] = await db.$queryRaw`
      SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'
    `;
    dbConnected = true;
    tableCount = tables[0]?.count ?? 0;
  } catch {
    /* silent */
  }

  // 2. Redis check
  let redisConnected = false;
  let redisVersion = "unknown";
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redis.connect();
    const info = await redis.info("server");
    const vMatch = info.match(/redis_version:(\S+)/);
    redisVersion = vMatch?.[1] ?? "unknown";
    redisConnected = true;
    await redis.disconnect();
  } catch {
    /* silent */
  }

  // 3. Provider check
  const providers = [
    {
      name: "Naver Search",
      platform: "Blog/News/Cafe/KiN",
      configured: !!process.env.NAVER_CLIENT_ID,
    },
    {
      name: "Naver DataLab",
      platform: "Trends/Demographic",
      configured: !!process.env.NAVER_CLIENT_ID,
    },
    {
      name: "SerpAPI",
      platform: "Google SERP/Trends",
      configured: !!process.env.SERP_API_KEY,
    },
    {
      name: "NewsAPI",
      platform: "Global News",
      configured: !!process.env.NEWS_API_KEY,
    },
    {
      name: "DataForSEO",
      platform: "SEO Data",
      configured: !!process.env.DATAFORSEO_LOGIN,
    },
    {
      name: "YouTube",
      platform: "YouTube Data API",
      configured: !!process.env.YOUTUBE_API_KEY,
    },
    {
      name: "Perplexity",
      platform: "AI Search (GEO)",
      configured: !!process.env.PERPLEXITY_API_KEY,
    },
    {
      name: "OpenAI",
      platform: "GPT Analysis",
      configured: !!process.env.OPENAI_API_KEY,
    },
    {
      name: "Anthropic",
      platform: "Claude Insights",
      configured: !!process.env.ANTHROPIC_API_KEY,
    },
  ];

  // 4. Data stats
  let keywordsTotal = 0,
    keywordsSaved = 0;
  let mentionsToday = 0,
    mentionsTotal = 0;
  let snapshotsToday = 0,
    snapshotsTotal = 0;

  if (dbConnected) {
    try {
      [
        keywordsTotal,
        keywordsSaved,
        mentionsTotal,
        mentionsToday,
        snapshotsTotal,
        snapshotsToday,
      ] = await Promise.all([
        db.intelligenceKeyword.count(),
        db.intelligenceKeyword.count({ where: { isSaved: true } }),
        db.rawSocialMention.count(),
        db.rawSocialMention.count({ where: { createdAt: { gte: today } } }),
        db.socialMentionSnapshot.count(),
        db.socialMentionSnapshot.count({ where: { date: { gte: today } } }),
      ]);
    } catch {
      /* silent */
    }
  }

  return NextResponse.json({
    redis: { connected: redisConnected, version: redisVersion },
    database: { connected: dbConnected, tables: tableCount },
    worker: { running: redisConnected && parseFloat(redisVersion) >= 5.0 },
    providers,
    keywords: { total: keywordsTotal, saved: keywordsSaved },
    mentions: { today: mentionsToday, total: mentionsTotal },
    snapshots: { today: snapshotsToday, total: snapshotsTotal },
  });
}
