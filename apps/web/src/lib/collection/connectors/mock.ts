// ─────────────────────────────────────────────
// Mock Connector — Development / Testing
// ─────────────────────────────────────────────
// Returns realistic mock data for all collection types.
// Used when no API keys are available or for dev/testing.

import type {
  PlatformCode,
  SourceType,
  CollectionType,
  CollectionTarget,
  ConnectorHealthStatus,
  RawCollectionResult,
} from "../types";
import { BaseConnector } from "./base";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomId() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const MOCK_CHANNEL = {
  id: "UC_mock_channel_001",
  name: "Mock Analytics Channel",
  handle: "@mock_analytics",
  description: "소셜 미디어 분석 및 트렌드 리포트를 제공하는 채널입니다.",
  subscriberCount: 125400,
  videoCount: 342,
  viewCount: 18500000,
  thumbnailUrl: "",
  publishedAt: "2020-03-15T00:00:00Z",
  url: "https://example.com/@mock_analytics",
};

const MOCK_CONTENTS = [
  {
    id: "vid-001",
    title: "2024년 소셜 미디어 트렌드 분석",
    description: "올해 가장 주목할 소셜 미디어 트렌드를 분석합니다.",
    publishedAt: "2024-12-01T10:00:00Z",
    viewCount: 45200,
    likeCount: 1230,
    commentCount: 89,
    duration: "PT12M30S",
    thumbnailUrl: "",
  },
  {
    id: "vid-002",
    title: "인스타그램 릴스 vs 유튜브 쇼츠 비교",
    description: "숏폼 콘텐츠 플랫폼 비교 분석",
    publishedAt: "2024-11-28T14:00:00Z",
    viewCount: 32100,
    likeCount: 890,
    commentCount: 56,
    duration: "PT8M45S",
    thumbnailUrl: "",
  },
  {
    id: "vid-003",
    title: "브랜드 채널 성장 전략 5가지",
    description: "구독자 10만 달성을 위한 실전 전략",
    publishedAt: "2024-11-25T09:00:00Z",
    viewCount: 67800,
    likeCount: 2340,
    commentCount: 134,
    duration: "PT15M20S",
    thumbnailUrl: "",
  },
  {
    id: "vid-004",
    title: "데이터 기반 콘텐츠 기획법",
    description: "분석 데이터를 활용한 콘텐츠 기획 방법론",
    publishedAt: "2024-11-20T11:00:00Z",
    viewCount: 28900,
    likeCount: 756,
    commentCount: 42,
    duration: "PT10M15S",
    thumbnailUrl: "",
  },
  {
    id: "vid-005",
    title: "SNS 알고리즘 이해하기",
    description: "각 플랫폼별 알고리즘 동작 원리 설명",
    publishedAt: "2024-11-15T08:00:00Z",
    viewCount: 51300,
    likeCount: 1560,
    commentCount: 78,
    duration: "PT18M00S",
    thumbnailUrl: "",
  },
];

const MOCK_COMMENTS = [
  {
    id: "cmt-001",
    authorName: "분석가김",
    authorHandle: "@analyst_kim",
    text: "정말 유용한 분석이네요! 다음 영상도 기대됩니다.",
    publishedAt: "2024-12-01T12:30:00Z",
    likeCount: 15,
    replyCount: 2,
    isReply: false,
  },
  {
    id: "cmt-002",
    authorName: "마케터박",
    authorHandle: "@marketer_park",
    text: "우리 팀에서 이 데이터를 참고하고 있어요. 감사합니다!",
    publishedAt: "2024-12-01T14:00:00Z",
    likeCount: 8,
    replyCount: 1,
    isReply: false,
  },
  {
    id: "cmt-003",
    authorName: "초보크리에이터",
    authorHandle: "@newbie_creator",
    text: "쇼츠와 릴스 중 어떤 걸 먼저 시작하면 좋을까요?",
    publishedAt: "2024-11-28T16:00:00Z",
    likeCount: 3,
    replyCount: 4,
    isReply: false,
  },
  {
    id: "cmt-004",
    authorName: "데이터팀장",
    authorHandle: "@data_lead",
    text: "알고리즘 파트가 특히 도움이 됐습니다.",
    publishedAt: "2024-11-15T10:00:00Z",
    likeCount: 22,
    replyCount: 0,
    isReply: false,
  },
];

const MOCK_MENTIONS = [
  {
    id: "mnt-001",
    keyword: "소셜 분석",
    sourceUrl: "https://example.com/blog/social-trends",
    sourceTitle: "2024 소셜 미디어 분석 트렌드 리포트",
    authorName: "테크블로거",
    text: "올해 소셜 분석 도구들의 발전이 눈에 띕니다. 특히 AI 기반 인사이트 생성 기능이...",
    publishedAt: "2024-12-02T09:00:00Z",
    sentiment: "positive" as const,
    reach: 5200,
  },
  {
    id: "mnt-002",
    keyword: "소셜 분석",
    sourceUrl: "https://example.com/news/analytics",
    sourceTitle: "소셜 리스닝 시장 동향",
    authorName: "IT매체",
    text: "소셜 분석 시장이 전년 대비 23% 성장했으며, 주요 성장 동력은...",
    publishedAt: "2024-12-01T15:00:00Z",
    sentiment: "neutral" as const,
    reach: 12000,
  },
  {
    id: "mnt-003",
    keyword: "브랜드 분석",
    sourceUrl: "https://example.com/community/discussion",
    sourceTitle: "브랜드 분석 도구 추천해주세요",
    authorName: "마케팅담당자",
    text: "최근 브랜드 분석을 위한 도구를 찾고 있는데, 추천해주실 만한 것이 있나요?",
    publishedAt: "2024-11-30T11:00:00Z",
    sentiment: "neutral" as const,
    reach: 890,
  },
];

export class MockConnector extends BaseConnector {
  readonly id: string;
  readonly platform: PlatformCode;
  readonly sourceType: SourceType = "mock";
  readonly supportedCollections: CollectionType[] = [
    "channel",
    "content",
    "comment",
    "mention",
  ];

  private simulatedLatencyMs: number;
  private failureRate: number;

  constructor(
    platform: PlatformCode = "youtube",
    config: { simulatedLatencyMs?: number; failureRate?: number } = {},
  ) {
    super({});
    this.id = `${platform}-mock`;
    this.platform = platform;
    this.simulatedLatencyMs = config.simulatedLatencyMs ?? 300;
    this.failureRate = config.failureRate ?? 0;
  }

  private shouldFail(): boolean {
    return Math.random() < this.failureRate;
  }

  async collectChannel(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown>> {
    const start = Date.now();
    await delay(this.simulatedLatencyMs);

    if (this.shouldFail()) {
      return this.buildError("channel", "Mock simulated failure", start);
    }

    return this.buildResult(
      "channel",
      { ...MOCK_CHANNEL, id: target.channelId || MOCK_CHANNEL.id },
      1,
      start,
    );
  }

  async collectContent(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();
    await delay(this.simulatedLatencyMs);

    if (this.shouldFail()) {
      return this.buildError("content", "Mock simulated failure", start);
    }

    const limit = target.options?.limit || 5;
    const items = MOCK_CONTENTS.slice(0, limit).map((c) => ({
      ...c,
      id: randomId(),
      channelId: target.channelId || MOCK_CHANNEL.id,
    }));

    return this.buildResult("content", items, items.length, start);
  }

  async collectComments(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();
    await delay(this.simulatedLatencyMs);

    if (this.shouldFail()) {
      return this.buildError("comment", "Mock simulated failure", start);
    }

    const items = MOCK_COMMENTS.map((c) => ({
      ...c,
      id: randomId(),
      videoId: target.contentId || "vid-001",
    }));

    return this.buildResult("comment", items, items.length, start);
  }

  async collectMentions(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();
    await delay(this.simulatedLatencyMs);

    if (this.shouldFail()) {
      return this.buildError("mention", "Mock simulated failure", start);
    }

    const keyword = target.keyword || "소셜 분석";
    const items = MOCK_MENTIONS.map((m) => ({
      ...m,
      id: randomId(),
      keyword,
    }));

    return this.buildResult("mention", items, items.length, start);
  }

  async healthCheck(): Promise<ConnectorHealthStatus> {
    await delay(50);
    return {
      connectorId: this.id,
      platform: this.platform,
      sourceType: this.sourceType,
      healthy: true,
      latencyMs: 50,
      lastCheckedAt: new Date().toISOString(),
      message: "Mock 커넥터 정상 동작 (개발/테스트 모드)",
    };
  }
}
