import type {
  CompetitorChannel,
  CompetitorSnapshot,
  CompetitorSnapshotSeries,
  CompetitorContent,
} from "./types";

// ── Our Channel (reference) ──

export const OUR_CHANNEL_ID = "our-001";

export const OUR_CHANNEL = {
  id: OUR_CHANNEL_ID,
  channelName: "X2 Studio",
  platform: "youtube" as const,
  url: "https://youtube.com/@x2studio",
  thumbnailUrl: undefined,
  country: "KR",
};

export const OUR_SNAPSHOT: CompetitorSnapshot = {
  channelId: OUR_CHANNEL_ID,
  audienceCount: 125400,
  totalContents: 342,
  totalViewsOrReach: 18_500_000,
  engagementRate: 4.2,
  growthRate30d: 3.8,
  uploads30d: 12,
  avgViewsPerContent: 54_093,
  snapshotDate: "2026-03-07",
};

export const OUR_SERIES: CompetitorSnapshotSeries[] = [
  {
    channelId: OUR_CHANNEL_ID,
    date: "2025-10",
    audienceCount: 98000,
    totalViewsOrReach: 12_000_000,
    engagementRate: 3.5,
  },
  {
    channelId: OUR_CHANNEL_ID,
    date: "2025-11",
    audienceCount: 103000,
    totalViewsOrReach: 13_200_000,
    engagementRate: 3.7,
  },
  {
    channelId: OUR_CHANNEL_ID,
    date: "2025-12",
    audienceCount: 108500,
    totalViewsOrReach: 14_500_000,
    engagementRate: 3.9,
  },
  {
    channelId: OUR_CHANNEL_ID,
    date: "2026-01",
    audienceCount: 114000,
    totalViewsOrReach: 15_800_000,
    engagementRate: 4.0,
  },
  {
    channelId: OUR_CHANNEL_ID,
    date: "2026-02",
    audienceCount: 120000,
    totalViewsOrReach: 17_100_000,
    engagementRate: 4.1,
  },
  {
    channelId: OUR_CHANNEL_ID,
    date: "2026-03",
    audienceCount: 125400,
    totalViewsOrReach: 18_500_000,
    engagementRate: 4.2,
  },
];

export const OUR_CONTENTS: CompetitorContent[] = [
  {
    id: "our-c1",
    channelId: OUR_CHANNEL_ID,
    contentTitle: "2026 소셜 미디어 트렌드 완벽 분석",
    thumbnail: undefined,
    publishDate: "2026-03-01",
    views: 182000,
    engagementRate: 6.8,
    contentType: "video",
    topic: "tutorial",
  },
  {
    id: "our-c2",
    channelId: OUR_CHANNEL_ID,
    contentTitle: "인스타그램 릴스 알고리즘 해설",
    thumbnail: undefined,
    publishDate: "2026-02-25",
    views: 145000,
    engagementRate: 5.9,
    contentType: "short_form",
    topic: "tutorial",
  },
  {
    id: "our-c3",
    channelId: OUR_CHANNEL_ID,
    contentTitle: "유튜브 쇼츠 vs 틱톡 비교",
    thumbnail: undefined,
    publishDate: "2026-02-20",
    views: 98000,
    engagementRate: 7.2,
    contentType: "video",
    topic: "review",
  },
  {
    id: "our-c4",
    channelId: OUR_CHANNEL_ID,
    contentTitle: "X2 플랫폼 업데이트 소식",
    thumbnail: undefined,
    publishDate: "2026-02-15",
    views: 67000,
    engagementRate: 3.1,
    contentType: "video",
    topic: "announcement",
  },
  {
    id: "our-c5",
    channelId: OUR_CHANNEL_ID,
    contentTitle: "브랜드 마케팅 성공 사례 5선",
    thumbnail: undefined,
    publishDate: "2026-02-10",
    views: 112000,
    engagementRate: 5.5,
    contentType: "video",
    topic: "entertainment",
  },
];

// ── Competitor Channels ──

export const COMPETITOR_CHANNELS: CompetitorChannel[] = [
  {
    id: "comp-001",
    platform: "youtube",
    channelName: "소셜블레이드 KR",
    url: "https://youtube.com/@socialblade_kr",
    competitorType: "direct_competitor",
    addedAt: "2025-12-15",
    country: "KR",
    category: "Technology",
  },
  {
    id: "comp-002",
    platform: "youtube",
    channelName: "디지털 마케터",
    url: "https://youtube.com/@digitalmarketer_kr",
    competitorType: "direct_competitor",
    addedAt: "2025-11-20",
    country: "KR",
    category: "Marketing",
  },
  {
    id: "comp-003",
    platform: "instagram",
    channelName: "트렌드 리포트",
    url: "https://instagram.com/trend_report",
    competitorType: "similar_channel",
    addedAt: "2026-01-10",
    country: "KR",
    category: "Marketing",
  },
  {
    id: "comp-004",
    platform: "tiktok",
    channelName: "마케팅 인사이트",
    url: "https://tiktok.com/@marketing_insight",
    competitorType: "similar_channel",
    addedAt: "2026-01-25",
    country: "KR",
    category: "Marketing",
  },
  {
    id: "comp-005",
    platform: "youtube",
    channelName: "글로벌 크리에이터",
    url: "https://youtube.com/@globalcreator",
    competitorType: "benchmark_channel",
    addedAt: "2026-02-01",
    country: "US",
    category: "Entertainment",
  },
];

// ── Competitor Snapshots ──

export const COMPETITOR_SNAPSHOTS: CompetitorSnapshot[] = [
  {
    channelId: "comp-001",
    audienceCount: 198000,
    totalContents: 520,
    totalViewsOrReach: 32_000_000,
    engagementRate: 4.1,
    growthRate30d: 5.2,
    uploads30d: 18,
    avgViewsPerContent: 61_538,
    snapshotDate: "2026-03-07",
  },
  {
    channelId: "comp-002",
    audienceCount: 156000,
    totalContents: 410,
    totalViewsOrReach: 24_500_000,
    engagementRate: 3.8,
    growthRate30d: 2.9,
    uploads30d: 8,
    avgViewsPerContent: 59_756,
    snapshotDate: "2026-03-07",
  },
  {
    channelId: "comp-003",
    audienceCount: 89000,
    totalContents: 780,
    totalViewsOrReach: 15_200_000,
    engagementRate: 5.8,
    growthRate30d: 7.1,
    uploads30d: 24,
    avgViewsPerContent: 19_487,
    snapshotDate: "2026-03-07",
  },
  {
    channelId: "comp-004",
    audienceCount: 245000,
    totalContents: 620,
    totalViewsOrReach: 48_000_000,
    engagementRate: 6.2,
    growthRate30d: 9.5,
    uploads30d: 30,
    avgViewsPerContent: 77_419,
    snapshotDate: "2026-03-07",
  },
  {
    channelId: "comp-005",
    audienceCount: 520000,
    totalContents: 1100,
    totalViewsOrReach: 120_000_000,
    engagementRate: 3.5,
    growthRate30d: 4.0,
    uploads30d: 15,
    avgViewsPerContent: 109_091,
    snapshotDate: "2026-03-07",
  },
];

// ── Competitor Series (6 months) ──

function generateSeries(
  channelId: string,
  finalAudience: number,
  finalViews: number,
  finalEng: number,
): CompetitorSnapshotSeries[] {
  const months = [
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-03",
  ];
  return months.map((date, i) => {
    const progress = (i + 1) / months.length;
    const jitter = 0.95 + Math.random() * 0.1;
    return {
      channelId,
      date,
      audienceCount: Math.round(
        finalAudience * (0.7 + progress * 0.3) * jitter,
      ),
      totalViewsOrReach: Math.round(
        finalViews * (0.6 + progress * 0.4) * jitter,
      ),
      engagementRate: +(finalEng * (0.85 + progress * 0.15) * jitter).toFixed(
        1,
      ),
    };
  });
}

export const COMPETITOR_SERIES: CompetitorSnapshotSeries[] = [
  ...generateSeries("comp-001", 198000, 32_000_000, 4.1),
  ...generateSeries("comp-002", 156000, 24_500_000, 3.8),
  ...generateSeries("comp-003", 89000, 15_200_000, 5.8),
  ...generateSeries("comp-004", 245000, 48_000_000, 6.2),
  ...generateSeries("comp-005", 520000, 120_000_000, 3.5),
];

// ── Competitor Contents ──

export const COMPETITOR_CONTENTS: CompetitorContent[] = [
  // comp-001 소셜블레이드 KR
  {
    id: "cc-001-1",
    channelId: "comp-001",
    contentTitle: "유튜브 수익 구조 완전 분석 2026",
    publishDate: "2026-03-03",
    views: 320000,
    engagementRate: 5.2,
    contentType: "video",
    topic: "tutorial",
  },
  {
    id: "cc-001-2",
    channelId: "comp-001",
    contentTitle: "구독자 10만 달성 전략",
    publishDate: "2026-02-28",
    views: 245000,
    engagementRate: 4.8,
    contentType: "video",
    topic: "tutorial",
  },
  {
    id: "cc-001-3",
    channelId: "comp-001",
    contentTitle: "쇼츠로 구독자 급성장한 채널 분석",
    publishDate: "2026-02-22",
    views: 198000,
    engagementRate: 6.1,
    contentType: "short_form",
    topic: "review",
  },
  {
    id: "cc-001-4",
    channelId: "comp-001",
    contentTitle: "채널 운영 실수 TOP 10",
    publishDate: "2026-02-15",
    views: 156000,
    engagementRate: 4.5,
    contentType: "video",
    topic: "entertainment",
  },
  {
    id: "cc-001-5",
    channelId: "comp-001",
    contentTitle: "3월 트렌드 키워드 리포트",
    publishDate: "2026-03-05",
    views: 89000,
    engagementRate: 3.9,
    contentType: "video",
    topic: "news",
  },

  // comp-002 디지털 마케터
  {
    id: "cc-002-1",
    channelId: "comp-002",
    contentTitle: "퍼포먼스 마케팅 입문 가이드",
    publishDate: "2026-03-01",
    views: 210000,
    engagementRate: 4.5,
    contentType: "video",
    topic: "tutorial",
  },
  {
    id: "cc-002-2",
    channelId: "comp-002",
    contentTitle: "GA4 활용법 2026 업데이트",
    publishDate: "2026-02-20",
    views: 178000,
    engagementRate: 3.9,
    contentType: "video",
    topic: "tutorial",
  },
  {
    id: "cc-002-3",
    channelId: "comp-002",
    contentTitle: "광고 ROI 개선 사례",
    publishDate: "2026-02-10",
    views: 134000,
    engagementRate: 3.5,
    contentType: "video",
    topic: "product",
  },

  // comp-003 트렌드 리포트
  {
    id: "cc-003-1",
    channelId: "comp-003",
    contentTitle: "이번 주 인스타 트렌드 TOP 5",
    publishDate: "2026-03-04",
    views: 95000,
    engagementRate: 7.8,
    contentType: "image",
    topic: "news",
  },
  {
    id: "cc-003-2",
    channelId: "comp-003",
    contentTitle: "릴스 편집 팁 모음",
    publishDate: "2026-02-27",
    views: 82000,
    engagementRate: 8.2,
    contentType: "short_form",
    topic: "tutorial",
  },
  {
    id: "cc-003-3",
    channelId: "comp-003",
    contentTitle: "브랜드 콜라보 사례 분석",
    publishDate: "2026-02-18",
    views: 67000,
    engagementRate: 6.5,
    contentType: "image",
    topic: "review",
  },
  {
    id: "cc-003-4",
    channelId: "comp-003",
    contentTitle: "인스타 알고리즘 변경 소식",
    publishDate: "2026-03-02",
    views: 110000,
    engagementRate: 5.9,
    contentType: "image",
    topic: "news",
  },

  // comp-004 마케팅 인사이트
  {
    id: "cc-004-1",
    channelId: "comp-004",
    contentTitle: "틱톡 바이럴 공식 3가지",
    publishDate: "2026-03-05",
    views: 450000,
    engagementRate: 8.5,
    contentType: "short_form",
    topic: "tutorial",
  },
  {
    id: "cc-004-2",
    channelId: "comp-004",
    contentTitle: "15초 안에 사로잡는 오프닝",
    publishDate: "2026-02-28",
    views: 380000,
    engagementRate: 7.9,
    contentType: "short_form",
    topic: "tutorial",
  },
  {
    id: "cc-004-3",
    channelId: "comp-004",
    contentTitle: "MZ세대 소비 트렌드",
    publishDate: "2026-02-20",
    views: 290000,
    engagementRate: 6.1,
    contentType: "short_form",
    topic: "entertainment",
  },
  {
    id: "cc-004-4",
    channelId: "comp-004",
    contentTitle: "브랜드 챌린지 성공 사례",
    publishDate: "2026-02-12",
    views: 210000,
    engagementRate: 5.8,
    contentType: "short_form",
    topic: "product",
  },

  // comp-005 글로벌 크리에이터
  {
    id: "cc-005-1",
    channelId: "comp-005",
    contentTitle: "Creator Economy 2026 Report",
    publishDate: "2026-03-02",
    views: 890000,
    engagementRate: 4.2,
    contentType: "video",
    topic: "news",
  },
  {
    id: "cc-005-2",
    channelId: "comp-005",
    contentTitle: "How to Build a Media Brand",
    publishDate: "2026-02-22",
    views: 720000,
    engagementRate: 3.8,
    contentType: "video",
    topic: "tutorial",
  },
  {
    id: "cc-005-3",
    channelId: "comp-005",
    contentTitle: "Top 10 YouTube Strategies",
    publishDate: "2026-02-15",
    views: 560000,
    engagementRate: 3.5,
    contentType: "video",
    topic: "tutorial",
  },
];
