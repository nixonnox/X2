/**
 * X2 Real Data Seed Script
 *
 * 실제 API를 호출하여 DB에 데이터를 채웁니다.
 * 실행: npx tsx scripts/seed-real-data.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!;
const SERP_API_KEY = process.env.SERP_API_KEY!;
const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;

const PROJECT_ID = "default";
const KEYWORDS = ["AI 마케팅", "숏폼 콘텐츠", "인플루언서 마케팅"];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

// ─── Naver Blog/News/Cafe ───────────────────────────────────

async function collectNaver(keyword: string, type: "blog" | "news" | "cafearticle", platform: string) {
  console.log(`  [Naver ${type}] "${keyword}"...`);
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(keyword)}&display=30&sort=date`,
      { headers: { "X-Naver-Client-Id": NAVER_CLIENT_ID, "X-Naver-Client-Secret": NAVER_CLIENT_SECRET } },
    );
    if (!res.ok) { console.log(`    HTTP ${res.status}`); return []; }
    const data = await res.json();
    return (data.items ?? []).map((item: any, i: number) => ({
      projectId: PROJECT_ID,
      platform,
      platformPostId: `${type}-${keyword}-${i}-${Date.now()}`,
      postUrl: item.link ?? item.originallink,
      authorName: item.bloggername ?? item.cafename ?? null,
      text: stripHtml((item.title ?? "") + " " + (item.description ?? "")),
      publishedAt: item.pubDate ? new Date(item.pubDate) : item.postdate ? new Date(`${item.postdate.slice(0,4)}-${item.postdate.slice(4,6)}-${item.postdate.slice(6,8)}`) : new Date(),
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      engagementRate: 0,
      matchedKeyword: keyword,
      matchType: "EXACT",
      topics: [keyword],
      isSpam: false,
    }));
  } catch (e: any) { console.log(`    Error: ${e.message}`); return []; }
}

// ─── YouTube ────────────────────────────────────────────────

async function collectYouTube(keyword: string) {
  console.log(`  [YouTube] "${keyword}"...`);
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&maxResults=20&type=video&key=${YOUTUBE_API_KEY}`,
    );
    if (!res.ok) { console.log(`    HTTP ${res.status}`); return []; }
    const data = await res.json();
    return (data.items ?? []).map((item: any, i: number) => ({
      projectId: PROJECT_ID,
      platform: "YOUTUBE",
      platformPostId: item.id?.videoId ?? `yt-${i}-${Date.now()}`,
      postUrl: `https://youtube.com/watch?v=${item.id?.videoId}`,
      authorName: item.snippet?.channelTitle ?? null,
      text: (item.snippet?.title ?? "") + " " + (item.snippet?.description ?? ""),
      publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : new Date(),
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      engagementRate: 0,
      matchedKeyword: keyword,
      matchType: "EXACT",
      topics: [keyword],
      isSpam: false,
    }));
  } catch (e: any) { console.log(`    Error: ${e.message}`); return []; }
}

// ─── NewsAPI ────────────────────────────────────────────────

async function collectNews(keyword: string) {
  console.log(`  [NewsAPI] "${keyword}"...`);
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&pageSize=20&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`,
    );
    if (!res.ok) { console.log(`    HTTP ${res.status}`); return []; }
    const data = await res.json();
    return (data.articles ?? []).map((article: any, i: number) => ({
      projectId: PROJECT_ID,
      platform: "NEWS_API",
      platformPostId: `news-${keyword}-${i}-${Date.now()}`,
      postUrl: article.url,
      authorName: article.author ?? article.source?.name ?? null,
      text: (article.title ?? "") + " " + (article.description ?? ""),
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      engagementRate: 0,
      matchedKeyword: keyword,
      matchType: "CONTEXT",
      topics: [keyword],
      isSpam: false,
    }));
  } catch (e: any) { console.log(`    Error: ${e.message}`); return []; }
}

// ─── Sentiment (simple rule-based) ──────────────────────────

function inferSentiment(text: string): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  const pos = /좋|최고|추천|유용|편리|효과|성공|성장|기회|혁신|혁명|amazing|great|best|good|excellent/i;
  const neg = /나쁜|실패|문제|오류|위험|걱정|어려|불편|비싼|risk|fail|bad|worst|problem/i;
  if (pos.test(text)) return "POSITIVE";
  if (neg.test(text)) return "NEGATIVE";
  return "NEUTRAL";
}

// ─── Create Snapshot ────────────────────────────────────────

async function createSnapshot(keyword: string, mentions: any[]) {
  const pos = mentions.filter(m => m.sentiment === "POSITIVE").length;
  const neg = mentions.filter(m => m.sentiment === "NEGATIVE").length;
  const neu = mentions.filter(m => m.sentiment === "NEUTRAL").length;
  const total = mentions.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.socialMentionSnapshot.upsert({
    where: { projectId_keyword_date: { projectId: PROJECT_ID, keyword, date: today } },
    update: { totalCount: total, positiveCount: pos, negativeCount: neg, neutralCount: neu, unclassifiedCount: 0 },
    create: {
      projectId: PROJECT_ID,
      keyword,
      date: today,
      totalCount: total,
      buzzLevel: total > 50 ? "HIGH" : total > 20 ? "MODERATE" : total > 5 ? "LOW" : "NONE",
      positiveCount: pos,
      negativeCount: neg,
      neutralCount: neu,
      unclassifiedCount: 0,
      providerStatuses: [],
      freshness: "fresh",
      collectedAt: new Date(),
    },
  });
}

// ─── Save Keywords ──────────────────────────────────────────

async function saveKeywords() {
  for (const kw of KEYWORDS) {
    await db.intelligenceKeyword.upsert({
      where: { projectId_userId_keyword: { projectId: PROJECT_ID, userId: "test-user", keyword: kw } },
      update: { lastAnalyzedAt: new Date(), analysisCount: { increment: 1 } },
      create: {
        projectId: PROJECT_ID,
        userId: "test-user",
        keyword: kw,
        isSaved: true,
        analysisCount: 1,
        lastAnalyzedAt: new Date(),
      },
    });
  }
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log("=== X2 Real Data Seed ===\n");

  // Save keywords
  console.log("[1/4] Saving keywords...");
  await saveKeywords();
  console.log(`  Saved ${KEYWORDS.length} keywords\n`);

  // Collect from all sources
  console.log("[2/4] Collecting from APIs...");
  let totalMentions = 0;

  for (const keyword of KEYWORDS) {
    console.log(`\n--- Keyword: "${keyword}" ---`);
    const allMentions: any[] = [];

    // Naver
    const blogs = await collectNaver(keyword, "blog", "NAVER_BLOG");
    const news = await collectNaver(keyword, "news", "NAVER_NEWS");
    const cafes = await collectNaver(keyword, "cafearticle", "NAVER_CAFE");
    allMentions.push(...blogs, ...news, ...cafes);

    // YouTube
    const yt = await collectYouTube(keyword);
    allMentions.push(...yt);

    // NewsAPI
    const newsApi = await collectNews(keyword);
    allMentions.push(...newsApi);

    // Add sentiment
    for (const m of allMentions) {
      m.sentiment = inferSentiment(m.text);
    }

    console.log(`  Total: ${allMentions.length} mentions`);

    // Save to DB
    console.log(`  Saving to DB...`);
    let saved = 0;
    for (const m of allMentions) {
      try {
        await db.rawSocialMention.create({ data: m });
        saved++;
      } catch {
        // duplicate or constraint error, skip
      }
    }
    console.log(`  Saved: ${saved} mentions`);
    totalMentions += saved;

    // Create snapshot
    await createSnapshot(keyword, allMentions);
    console.log(`  Snapshot created`);
  }

  console.log(`\n[3/4] Total mentions saved: ${totalMentions}`);

  // Verify
  console.log("\n[4/4] Verification...");
  const mentionCount = await db.rawSocialMention.count({ where: { projectId: PROJECT_ID } });
  const snapshotCount = await db.socialMentionSnapshot.count({ where: { projectId: PROJECT_ID } });
  const keywordCount = await db.intelligenceKeyword.count({ where: { projectId: PROJECT_ID } });
  console.log(`  Mentions: ${mentionCount}`);
  console.log(`  Snapshots: ${snapshotCount}`);
  console.log(`  Keywords: ${keywordCount}`);

  console.log("\n=== Seed Complete ===");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
