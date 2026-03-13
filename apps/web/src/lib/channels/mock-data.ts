import type {
  Channel,
  ChannelSnapshot,
  ChannelContent,
  ChannelInsight,
  ChannelSnapshotSeries,
} from "./types";

// ============================================
// Mock Channels (5 platforms)
// ============================================

export const MOCK_CHANNELS: Channel[] = [
  {
    id: "ch-yt-001",
    platformCode: "youtube",
    platformLabel: "YouTube",
    analysisMode: "url_basic",
    name: "TechInsight Korea",
    url: "https://www.youtube.com/@techinsight-kr",
    country: "KR",
    category: "Technology",
    tags: ["tech", "review", "ai"],
    channelType: "owned",
    isCompetitor: false,
    status: "active",
    customPlatformName: null,
    thumbnailUrl: null,
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-03-07T12:00:00Z",
  },
  {
    id: "ch-ig-001",
    platformCode: "instagram",
    platformLabel: "Instagram",
    analysisMode: "url_basic",
    name: "design.studio.kr",
    url: "https://www.instagram.com/design.studio.kr",
    country: "KR",
    category: "Design",
    tags: ["design", "ux", "branding"],
    channelType: "owned",
    isCompetitor: false,
    status: "active",
    customPlatformName: null,
    thumbnailUrl: null,
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-03-06T15:30:00Z",
  },
  {
    id: "ch-tt-001",
    platformCode: "tiktok",
    platformLabel: "TikTok",
    analysisMode: "url_basic",
    name: "trend.hunter.kr",
    url: "https://www.tiktok.com/@trendhunterkr",
    country: "KR",
    category: "Entertainment",
    tags: ["trending", "shorts", "viral"],
    channelType: "owned",
    isCompetitor: false,
    status: "active",
    customPlatformName: null,
    thumbnailUrl: null,
    createdAt: "2026-02-10T14:00:00Z",
    updatedAt: "2026-03-07T08:00:00Z",
  },
  {
    id: "ch-x-001",
    platformCode: "x",
    platformLabel: "X (Twitter)",
    analysisMode: "url_basic",
    name: "AI Daily News",
    url: "https://x.com/aidailynews_kr",
    country: "KR",
    category: "Technology",
    tags: ["ai", "news", "daily"],
    channelType: "monitoring",
    isCompetitor: false,
    status: "syncing",
    customPlatformName: null,
    thumbnailUrl: null,
    createdAt: "2026-02-20T11:00:00Z",
    updatedAt: "2026-03-05T16:00:00Z",
  },
  {
    id: "ch-custom-001",
    platformCode: "custom",
    platformLabel: "Custom / Other",
    analysisMode: "custom_manual",
    name: "Marketing Lab Blog",
    url: "https://marketinglab.kr",
    country: "KR",
    category: "Marketing",
    tags: ["marketing", "blog", "strategy"],
    channelType: "owned",
    isCompetitor: false,
    status: "active",
    customPlatformName: "Marketing Lab",
    thumbnailUrl: null,
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-07T10:00:00Z",
  },
];

// ============================================
// Mock Snapshots (latest per channel)
// ============================================

export const MOCK_SNAPSHOTS: Record<string, ChannelSnapshot> = {
  "ch-yt-001": {
    channelId: "ch-yt-001",
    snapshotDate: "2026-03-07",
    audienceCount: 125400,
    audienceLabel: "Subscribers",
    totalContents: 342,
    totalViewsOrReach: 2847000,
    engagementRate: 4.8,
    growthRate30d: 12.5,
    uploads30d: 24,
  },
  "ch-ig-001": {
    channelId: "ch-ig-001",
    snapshotDate: "2026-03-06",
    audienceCount: 52300,
    audienceLabel: "Followers",
    totalContents: 128,
    totalViewsOrReach: 980000,
    engagementRate: 6.2,
    growthRate30d: 8.7,
    uploads30d: 18,
  },
  "ch-tt-001": {
    channelId: "ch-tt-001",
    snapshotDate: "2026-03-07",
    audienceCount: 234000,
    audienceLabel: "Followers",
    totalContents: 512,
    totalViewsOrReach: 5200000,
    engagementRate: 8.1,
    growthRate30d: 22.4,
    uploads30d: 45,
  },
  "ch-x-001": {
    channelId: "ch-x-001",
    snapshotDate: "2026-03-05",
    audienceCount: 87600,
    audienceLabel: "Followers",
    totalContents: 2840,
    totalViewsOrReach: 1540000,
    engagementRate: 3.2,
    growthRate30d: 5.1,
    uploads30d: 120,
  },
  "ch-custom-001": {
    channelId: "ch-custom-001",
    snapshotDate: "2026-03-07",
    audienceCount: 18700,
    audienceLabel: "Audience",
    totalContents: 89,
    totalViewsOrReach: 420000,
    engagementRate: 2.8,
    growthRate30d: 4.3,
    uploads30d: 12,
  },
};

// ============================================
// Mock Snapshot Series (for charts)
// ============================================

function generateSeries(base: {
  audience: number;
  views: number;
  engagement: number;
}): ChannelSnapshotSeries[] {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  return months.map((date, i) => ({
    date,
    audienceCount: Math.round(
      base.audience * (0.7 + i * 0.06) + Math.random() * base.audience * 0.05,
    ),
    totalViewsOrReach: Math.round(
      base.views * (0.6 + i * 0.08) + Math.random() * base.views * 0.1,
    ),
    engagementRate: +(
      base.engagement * (0.85 + i * 0.03) +
      Math.random() * 0.5
    ).toFixed(1),
  }));
}

export const MOCK_SNAPSHOT_SERIES: Record<string, ChannelSnapshotSeries[]> = {
  "ch-yt-001": generateSeries({
    audience: 125400,
    views: 2847000,
    engagement: 4.8,
  }),
  "ch-ig-001": generateSeries({
    audience: 52300,
    views: 980000,
    engagement: 6.2,
  }),
  "ch-tt-001": generateSeries({
    audience: 234000,
    views: 5200000,
    engagement: 8.1,
  }),
  "ch-x-001": generateSeries({
    audience: 87600,
    views: 1540000,
    engagement: 3.2,
  }),
  "ch-custom-001": generateSeries({
    audience: 18700,
    views: 420000,
    engagement: 2.8,
  }),
};

// ============================================
// Mock Contents (per channel)
// ============================================

export const MOCK_CHANNEL_CONTENTS: Record<string, ChannelContent[]> = {
  "ch-yt-001": [
    {
      id: "c1",
      channelId: "ch-yt-001",
      title: "2026 소셜미디어 트렌드 총정리",
      thumbnailUrl: null,
      contentType: "video",
      publishedAt: "2026-03-05",
      viewsOrReach: 284000,
      engagementRate: 5.2,
      commentsCount: 432,
    },
    {
      id: "c2",
      channelId: "ch-yt-001",
      title: "인스타그램 릴스 알고리즘 완전 분석",
      thumbnailUrl: null,
      contentType: "video",
      publishedAt: "2026-03-03",
      viewsOrReach: 195000,
      engagementRate: 4.8,
      commentsCount: 287,
    },
    {
      id: "c3",
      channelId: "ch-yt-001",
      title: "ChatGPT vs Claude - AI 도구 비교 리뷰",
      thumbnailUrl: null,
      contentType: "video",
      publishedAt: "2026-03-01",
      viewsOrReach: 156000,
      engagementRate: 6.1,
      commentsCount: 521,
    },
    {
      id: "c4",
      channelId: "ch-yt-001",
      title: "틱톡 마케팅 전략 A to Z",
      thumbnailUrl: null,
      contentType: "short",
      publishedAt: "2026-02-28",
      viewsOrReach: 128000,
      engagementRate: 4.3,
      commentsCount: 198,
    },
    {
      id: "c5",
      channelId: "ch-yt-001",
      title: "유튜브 쇼츠 vs 틱톡 비교",
      thumbnailUrl: null,
      contentType: "short",
      publishedAt: "2026-02-25",
      viewsOrReach: 98000,
      engagementRate: 5.7,
      commentsCount: 156,
    },
  ],
  "ch-ig-001": [
    {
      id: "c6",
      channelId: "ch-ig-001",
      title: "UI 디자인 트렌드 2026",
      thumbnailUrl: null,
      contentType: "post",
      publishedAt: "2026-03-06",
      viewsOrReach: 42000,
      engagementRate: 7.8,
      commentsCount: 89,
    },
    {
      id: "c7",
      channelId: "ch-ig-001",
      title: "브랜딩 케이스 스터디 #12",
      thumbnailUrl: null,
      contentType: "reel",
      publishedAt: "2026-03-04",
      viewsOrReach: 68000,
      engagementRate: 9.2,
      commentsCount: 134,
    },
    {
      id: "c8",
      channelId: "ch-ig-001",
      title: "디자인 시스템 구축 가이드",
      thumbnailUrl: null,
      contentType: "post",
      publishedAt: "2026-03-02",
      viewsOrReach: 31000,
      engagementRate: 5.4,
      commentsCount: 56,
    },
    {
      id: "c9",
      channelId: "ch-ig-001",
      title: "Figma 팁 모음 릴스",
      thumbnailUrl: null,
      contentType: "reel",
      publishedAt: "2026-02-27",
      viewsOrReach: 85000,
      engagementRate: 11.3,
      commentsCount: 201,
    },
  ],
  "ch-tt-001": [
    {
      id: "c10",
      channelId: "ch-tt-001",
      title: "이 앱 알면 인생이 바뀜",
      thumbnailUrl: null,
      contentType: "short",
      publishedAt: "2026-03-07",
      viewsOrReach: 520000,
      engagementRate: 12.4,
      commentsCount: 876,
    },
    {
      id: "c11",
      channelId: "ch-tt-001",
      title: "AI로 1분만에 영상 편집하기",
      thumbnailUrl: null,
      contentType: "short",
      publishedAt: "2026-03-05",
      viewsOrReach: 380000,
      engagementRate: 9.8,
      commentsCount: 543,
    },
    {
      id: "c12",
      channelId: "ch-tt-001",
      title: "직장인 필수 생산성 도구 TOP5",
      thumbnailUrl: null,
      contentType: "short",
      publishedAt: "2026-03-03",
      viewsOrReach: 290000,
      engagementRate: 7.6,
      commentsCount: 412,
    },
  ],
  "ch-x-001": [
    {
      id: "c13",
      channelId: "ch-x-001",
      title: "오늘의 AI 뉴스 브리핑 #234",
      thumbnailUrl: null,
      contentType: "tweet",
      publishedAt: "2026-03-07",
      viewsOrReach: 18000,
      engagementRate: 4.2,
      commentsCount: 45,
    },
    {
      id: "c14",
      channelId: "ch-x-001",
      title: "GPT-5 출시 임박? 루머 정리",
      thumbnailUrl: null,
      contentType: "thread",
      publishedAt: "2026-03-06",
      viewsOrReach: 42000,
      engagementRate: 6.8,
      commentsCount: 128,
    },
    {
      id: "c15",
      channelId: "ch-x-001",
      title: "AI 스타트업 투자 동향 스레드",
      thumbnailUrl: null,
      contentType: "thread",
      publishedAt: "2026-03-04",
      viewsOrReach: 35000,
      engagementRate: 5.1,
      commentsCount: 89,
    },
  ],
  "ch-custom-001": [
    {
      id: "c16",
      channelId: "ch-custom-001",
      title: "2026 디지털 마케팅 전략 가이드",
      thumbnailUrl: null,
      contentType: "article",
      publishedAt: "2026-03-06",
      viewsOrReach: 8500,
      engagementRate: 3.2,
      commentsCount: 24,
    },
    {
      id: "c17",
      channelId: "ch-custom-001",
      title: "SNS 광고 ROI 분석 방법론",
      thumbnailUrl: null,
      contentType: "article",
      publishedAt: "2026-03-02",
      viewsOrReach: 6200,
      engagementRate: 2.9,
      commentsCount: 18,
    },
    {
      id: "c18",
      channelId: "ch-custom-001",
      title: "콘텐츠 마케팅 성공 사례 5선",
      thumbnailUrl: null,
      contentType: "article",
      publishedAt: "2026-02-28",
      viewsOrReach: 5100,
      engagementRate: 2.5,
      commentsCount: 12,
    },
  ],
};

// ============================================
// Mock Content Type Distribution (per channel)
// ============================================

export const MOCK_CONTENT_TYPE_DIST: Record<
  string,
  { type: string; count: number }[]
> = {
  "ch-yt-001": [
    { type: "Video", count: 245 },
    { type: "Short", count: 87 },
    { type: "Live", count: 10 },
  ],
  "ch-ig-001": [
    { type: "Post", count: 68 },
    { type: "Reel", count: 42 },
    { type: "Story", count: 18 },
  ],
  "ch-tt-001": [{ type: "Short", count: 512 }],
  "ch-x-001": [
    { type: "Tweet", count: 2420 },
    { type: "Thread", count: 420 },
  ],
  "ch-custom-001": [{ type: "Article", count: 89 }],
};

// ============================================
// Mock Insights (per channel)
// ============================================

export const MOCK_INSIGHTS: Record<string, ChannelInsight> = {
  "ch-yt-001": {
    channelId: "ch-yt-001",
    summary:
      "지난 30일간 구독자 12.5% 성장, 쇼트폼 콘텐츠 참여율이 롱폼 대비 32% 높은 상승세. AI 관련 콘텐츠가 가장 높은 조회수를 기록하고 있으며, 댓글 감성 분석 결과 긍정 반응 78%로 건강한 커뮤니티를 유지 중.",
    strengths: [
      "AI/기술 리뷰 콘텐츠에서 높은 전문성 인정",
      "쇼트폼 콘텐츠 참여율 업계 평균 대비 2.3배",
      "댓글 응답률 상위 5% — 커뮤니티 충성도 높음",
      "꾸준한 업로드 주기 (주 6회) 유지",
    ],
    suggestions: [
      "쇼트폼 비중을 40%에서 55%로 확대 권장",
      "일본/동남아 자막 추가로 해외 시청자 확대 가능",
      "라이브 스트리밍 주 1회 도입으로 실시간 참여 유도",
      "AI 도구 비교 시리즈 확대 — 높은 수요 확인",
    ],
    competitorNote:
      "경쟁 채널 대비 구독자 성장률은 상위 20%에 해당하나, 평균 조회수 기준으로는 중위권. 쇼트폼 전환율 강화 시 상위 10% 진입 가능.",
    nextActions: [
      "이번 주: AI 비교 시리즈 3편 기획 및 촬영",
      "다음 주: 쇼트폼 업로드 빈도 주 4회로 증가",
    ],
  },
  "ch-ig-001": {
    channelId: "ch-ig-001",
    summary:
      "릴스 콘텐츠의 참여율이 일반 포스트 대비 2배 이상 높음. 디자인 시스템, Figma 관련 콘텐츠가 핵심 성장 동력. 팔로워 증가율 월 8.7%로 안정적.",
    strengths: [
      "릴스 콘텐츠 평균 참여율 10%+ (업계 평균 3배)",
      "디자인 니치 내 강한 포지셔닝",
      "비주얼 퀄리티 일관성 우수",
    ],
    suggestions: [
      "릴스 업로드 빈도를 주 2회에서 주 4회로 증가",
      "스토리를 활용한 팔로워 인터랙션 강화",
      "협업 콘텐츠로 도달 범위 확대",
    ],
    competitorNote:
      "디자인 카테고리 경쟁 계정 대비 참여율 상위 15%. 팔로워 규모는 중위권이나 충성도 지표가 우수.",
    nextActions: [
      "이번 주: 릴스 2개 추가 제작 (디자인 팁 시리즈)",
      "다음 주: 스토리 Q&A 세션 2회 진행",
    ],
  },
  "ch-tt-001": {
    channelId: "ch-tt-001",
    summary:
      "높은 바이럴 잠재력과 참여율. 지난 30일간 22.4% 성장으로 가장 빠른 성장세. 생산성/AI 도구 관련 콘텐츠가 핵심.",
    strengths: [
      "월 22.4% 성장률 — 전 채널 중 최고",
      "참여율 8.1% (업계 평균 5배)",
      "바이럴 콘텐츠 비율 15% (50만+ 조회)",
    ],
    suggestions: [
      "시리즈물 콘텐츠 도입으로 리텐션 강화",
      "크로스 포스팅 전략으로 YouTube Shorts와 시너지",
      "댓글 기반 콘텐츠 기획으로 커뮤니티 참여 극대화",
    ],
    competitorNote:
      "동일 카테고리 TikTok 채널 중 성장률 1위. 바이럴 빈도가 높아 경쟁 우위 확보 중.",
    nextActions: [
      "이번 주: 시리즈 콘텐츠 파일럿 3편 기획",
      "다음 주: YouTube Shorts 크로스포스팅 테스트",
    ],
  },
  "ch-x-001": {
    channelId: "ch-x-001",
    summary:
      "일일 뉴스 브리핑 포맷이 안정적인 팔로워 유지에 기여. 스레드 형태 딥다이브 콘텐츠의 참여율이 일반 트윗 대비 3배 높음.",
    strengths: [
      "일관된 데일리 콘텐츠로 높은 신뢰도",
      "스레드 콘텐츠 참여율 6.8% (일반 대비 3배)",
      "AI 뉴스 니치에서 강한 팔로잉",
    ],
    suggestions: [
      "스레드 비중 확대 (현재 15% → 25%)",
      "뉴스레터 연동으로 트래픽 다각화",
      "투표/질문 기능 활용으로 인터랙션 증가",
    ],
    competitorNote:
      "AI 뉴스 카테고리 X 계정 중 일일 활동량 상위 10%. 스레드 품질에서 차별화.",
    nextActions: [
      "이번 주: 주간 딥다이브 스레드 2편 작성",
      "다음 주: 팔로워 투표 기능 테스트",
    ],
  },
  "ch-custom-001": {
    channelId: "ch-custom-001",
    summary:
      "블로그 콘텐츠의 SEO 유입이 안정적. 장문 콘텐츠의 체류 시간이 길어 높은 전환율을 보임.",
    strengths: [
      "검색 유입 비율 68% — 강한 SEO 포지셔닝",
      "평균 체류 시간 4분 32초 (업계 평균 2배)",
      "뉴스레터 구독 전환율 3.2%",
    ],
    suggestions: [
      "콘텐츠 업로드 주기를 주 2회에서 주 3회로 증가",
      "소셜 채널과의 크로스 프로모션 강화",
      "인터랙티브 콘텐츠 (퀴즈, 체크리스트) 도입",
    ],
    competitorNote:
      "마케팅 블로그 카테고리 내 SEO 가시성 상위 25%. 체류 시간 기준 최상위.",
    nextActions: [
      "이번 주: SEO 핵심 키워드 기반 콘텐츠 1편 발행",
      "다음 주: 소셜 채널 크로스 프로모션 캠페인 기획",
    ],
  },
};
