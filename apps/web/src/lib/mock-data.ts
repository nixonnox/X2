// ============================================
// Dashboard Mock Data
// ============================================

export const DASHBOARD_KPIS = [
  {
    label: "Total Views",
    value: "2,847,392",
    change: "+12.5%",
    changeType: "positive" as const,
    trend: [30, 35, 28, 42, 38, 50, 55, 48, 60, 58, 65, 70],
  },
  {
    label: "Engagement Rate",
    value: "4.8%",
    change: "+0.6%",
    changeType: "positive" as const,
    trend: [3.2, 3.5, 3.8, 4.0, 3.9, 4.2, 4.5, 4.3, 4.6, 4.7, 4.8, 4.8],
  },
  {
    label: "Followers Growth",
    value: "+8,432",
    change: "+18.2%",
    changeType: "positive" as const,
    trend: [200, 350, 400, 500, 450, 600, 700, 650, 800, 750, 850, 900],
  },
  {
    label: "Total Posts",
    value: "342",
    change: "+24",
    changeType: "positive" as const,
    trend: [20, 22, 18, 25, 28, 30, 26, 32, 35, 28, 30, 34],
  },
  {
    label: "Comments Volume",
    value: "15,847",
    change: "+8.3%",
    changeType: "positive" as const,
    trend: [
      800, 950, 1100, 1050, 1200, 1300, 1250, 1400, 1500, 1350, 1450, 1500,
    ],
  },
  {
    label: "Negative Sentiment",
    value: "3.2%",
    change: "-0.8%",
    changeType: "positive" as const,
    trend: [5.0, 4.8, 4.5, 4.2, 4.0, 3.8, 3.6, 3.5, 3.4, 3.3, 3.2, 3.2],
  },
];

export const CHANNEL_PERFORMANCE_DATA = [
  { month: "Jul", views: 180000, engagement: 4200, followers: 1200 },
  { month: "Aug", views: 220000, engagement: 4800, followers: 1500 },
  { month: "Sep", views: 195000, engagement: 4500, followers: 1350 },
  { month: "Oct", views: 280000, engagement: 5200, followers: 1800 },
  { month: "Nov", views: 310000, engagement: 5800, followers: 2100 },
  { month: "Dec", views: 350000, engagement: 6200, followers: 2400 },
  { month: "Jan", views: 290000, engagement: 5500, followers: 2000 },
  { month: "Feb", views: 380000, engagement: 6800, followers: 2800 },
  { month: "Mar", views: 420000, engagement: 7200, followers: 3200 },
];

export const CONTENT_TYPE_DATA = [
  { type: "Short-form", count: 142, views: 980000 },
  { type: "Long-form", count: 85, views: 1200000 },
  { type: "Live", count: 28, views: 320000 },
  { type: "Story", count: 56, views: 180000 },
  { type: "Reel", count: 31, views: 167000 },
];

export const COUNTRY_PERFORMANCE_DATA = [
  { country: "Korea", views: 1200000, engagement: 5.2 },
  { country: "USA", views: 680000, engagement: 3.8 },
  { country: "Japan", views: 420000, engagement: 4.1 },
  { country: "Vietnam", views: 280000, engagement: 4.5 },
  { country: "Thailand", views: 180000, engagement: 3.9 },
];

export const RECENT_CONTENTS = [
  {
    id: "1",
    thumbnail: "",
    title: "2024 소셜미디어 트렌드 총정리 - 올해 반드시 알아야 할 10가지",
    platform: "YouTube",
    views: 284000,
    engagement: 5.2,
    publishedAt: "2026-03-05",
  },
  {
    id: "2",
    thumbnail: "",
    title: "인스타그램 릴스 알고리즘 완전 분석 | 조회수 폭발 비법",
    platform: "YouTube",
    views: 195000,
    engagement: 4.8,
    publishedAt: "2026-03-03",
  },
  {
    id: "3",
    thumbnail: "",
    title: "ChatGPT vs Claude - AI 도구 비교 리뷰 (실무자 관점)",
    platform: "YouTube",
    views: 156000,
    engagement: 6.1,
    publishedAt: "2026-03-01",
  },
  {
    id: "4",
    thumbnail: "",
    title: "틱톡 마케팅 전략 A to Z | 초보자 가이드",
    platform: "YouTube",
    views: 128000,
    engagement: 4.3,
    publishedAt: "2026-02-28",
  },
  {
    id: "5",
    thumbnail: "",
    title: "유튜브 쇼츠 vs 틱톡 - 어디가 더 유리할까?",
    platform: "YouTube",
    views: 98000,
    engagement: 5.7,
    publishedAt: "2026-02-25",
  },
];

// ============================================
// AI Insight Mock Data
// ============================================

export const AI_INSIGHTS = [
  {
    type: "short-term" as const,
    title: "Short Term Action",
    period: "Next 2 Weeks",
    content:
      "쇼트폼 콘텐츠의 참여율이 롱폼 대비 32% 높은 상승세를 보이고 있습니다. 다음 2주간 쇼트폼 비중을 현재 40%에서 55%로 확대하고, 특히 'AI 도구 리뷰' 카테고리에 집중하세요. 댓글 감성 분석 결과, 실습 위주 콘텐츠에 대한 긍정 반응이 78%로 가장 높습니다.",
    confidence: 87,
  },
  {
    type: "mid-term" as const,
    title: "Mid Term Strategy",
    period: "Next 1-3 Months",
    content:
      "구독자 증가율이 월 평균 18.2%로 건강한 성장세입니다. 현재 한국 시청자가 42%를 차지하고 있으나, 일본(15%)과 동남아(12%) 시장의 성장 잠재력이 높습니다. 자막 및 현지화 콘텐츠 투자를 통해 해외 비중을 30%까지 확대하는 것을 권장합니다.",
    confidence: 74,
  },
  {
    type: "long-term" as const,
    title: "Long Term Strategy",
    period: "Next 6-12 Months",
    content:
      "소셜미디어 분석 니치에서 채널 포지셔닝이 강화되고 있습니다. 라이브 스트리밍과 커뮤니티 기능을 활용한 유료 멤버십 모델 도입을 고려하세요. 경쟁 채널 대비 댓글 응답률이 2.3배 높은 점이 핵심 차별화 포인트이므로, 커뮤니티 중심 전략이 장기 성장에 유리합니다.",
    confidence: 65,
  },
];

// ============================================
// Channel Management Mock Data
// ============================================

export const MOCK_CHANNELS = [
  {
    id: "1",
    name: "TechInsight Korea",
    platform: "YouTube",
    subscribers: 125400,
    videos: 342,
    views: 2847000,
    status: "Active",
    lastSync: "2026-03-07",
  },
  {
    id: "2",
    name: "디자인 스튜디오",
    platform: "YouTube",
    subscribers: 52300,
    videos: 128,
    views: 980000,
    status: "Active",
    lastSync: "2026-03-07",
  },
  {
    id: "3",
    name: "AI Daily News",
    platform: "YouTube",
    subscribers: 87600,
    videos: 256,
    views: 1540000,
    status: "Active",
    lastSync: "2026-03-06",
  },
  {
    id: "4",
    name: "마케팅 랩",
    platform: "Instagram",
    subscribers: 18700,
    videos: 89,
    views: 420000,
    status: "Syncing",
    lastSync: "2026-03-05",
  },
  {
    id: "5",
    name: "트렌드 헌터",
    platform: "TikTok",
    subscribers: 234000,
    videos: 512,
    views: 5200000,
    status: "Active",
    lastSync: "2026-03-07",
  },
];

// ============================================
// Comment Analysis Mock Data
// ============================================

export const COMMENT_STATS = {
  total: 15847,
  positive: 72,
  neutral: 20,
  negative: 8,
};

export const MOCK_COMMENTS = [
  {
    id: "1",
    author: "김민수",
    text: "정말 유용한 영상이에요! 바로 실행해볼게요.",
    sentiment: "positive" as const,
    likes: 45,
    date: "2026-03-07",
  },
  {
    id: "2",
    author: "Park.J",
    text: "설명이 너무 빨라서 따라가기 어려웠어요.",
    sentiment: "negative" as const,
    likes: 12,
    date: "2026-03-06",
  },
  {
    id: "3",
    author: "소셜마스터",
    text: "다음 영상은 인스타그램 분석도 다뤄주세요!",
    sentiment: "neutral" as const,
    likes: 28,
    date: "2026-03-06",
  },
  {
    id: "4",
    author: "이지은",
    text: "덕분에 채널 성장률이 눈에 띄게 올랐습니다 감사합니다",
    sentiment: "positive" as const,
    likes: 67,
    date: "2026-03-05",
  },
  {
    id: "5",
    author: "DataNerd",
    text: "데이터 시각화 부분이 특히 좋았어요. 더 깊이 다뤄주세요.",
    sentiment: "positive" as const,
    likes: 34,
    date: "2026-03-04",
  },
];

// ============================================
// Competitor Mock Data
// ============================================

export const MOCK_COMPETITORS = [
  {
    id: "1",
    name: "소셜블레이드 KR",
    platform: "YouTube",
    subscribers: 198000,
    growth: "+15.2%",
    engagement: 4.1,
  },
  {
    id: "2",
    name: "디지털 마케터",
    platform: "YouTube",
    subscribers: 156000,
    growth: "+8.7%",
    engagement: 3.8,
  },
  {
    id: "3",
    name: "트렌드 리포트",
    platform: "YouTube",
    subscribers: 89000,
    growth: "+22.4%",
    engagement: 5.2,
  },
];

// ============================================
// Keyword & Trend Mock Data
// ============================================

export const TRENDING_KEYWORDS = [
  {
    keyword: "AI 마케팅",
    volume: 48200,
    change: "+142%",
    trend: "rising" as const,
  },
  {
    keyword: "숏폼 전략",
    volume: 35600,
    change: "+88%",
    trend: "rising" as const,
  },
  {
    keyword: "인스타 알고리즘",
    volume: 29400,
    change: "+25%",
    trend: "stable" as const,
  },
  {
    keyword: "유튜브 쇼츠",
    volume: 52100,
    change: "-5%",
    trend: "declining" as const,
  },
  {
    keyword: "틱톡 광고",
    volume: 18900,
    change: "+67%",
    trend: "rising" as const,
  },
];
