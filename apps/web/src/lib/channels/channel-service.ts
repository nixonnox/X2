import type {
  Channel,
  ChannelSnapshot,
  ChannelContent,
  ChannelInsight,
  ChannelSnapshotSeries,
  ChannelFormInput,
  PlatformCode,
  AnalysisMode,
  ChannelStatus,
  ChannelType,
} from "./types";
import {
  MOCK_CHANNELS,
  MOCK_SNAPSHOTS,
  MOCK_CHANNEL_CONTENTS,
  MOCK_INSIGHTS,
  MOCK_SNAPSHOT_SERIES,
  MOCK_CONTENT_TYPE_DIST,
} from "./mock-data";
import { getPlatformLabel } from "./platform-registry";
import { resolveChannelUrl } from "./url";
import { normalizeUrl } from "./url/normalizer";

// ============================================
// In-memory store — globalThis로 HMR/새로고침 시 데이터 유지
// ============================================

const g = globalThis as unknown as {
  __x2_channels__?: Channel[];
  __x2_snapshots__?: Record<string, ChannelSnapshot>;
  __x2_contents__?: Record<string, ChannelContent[]>;
  __x2_insights__?: Record<string, ChannelInsight>;
  __x2_series__?: Record<string, ChannelSnapshotSeries[]>;
  __x2_content_dist__?: Record<string, { type: string; count: number }[]>;
};

function getChannels(): Channel[] {
  if (!g.__x2_channels__) {
    g.__x2_channels__ = [...MOCK_CHANNELS];
  }
  return g.__x2_channels__;
}

function setChannels(list: Channel[]): void {
  g.__x2_channels__ = list;
}

function getSnapshots(): Record<string, ChannelSnapshot> {
  if (!g.__x2_snapshots__) {
    g.__x2_snapshots__ = { ...MOCK_SNAPSHOTS };
  }
  return g.__x2_snapshots__;
}

function getContentsStore(): Record<string, ChannelContent[]> {
  if (!g.__x2_contents__) {
    g.__x2_contents__ = { ...MOCK_CHANNEL_CONTENTS };
  }
  return g.__x2_contents__;
}

function getInsights(): Record<string, ChannelInsight> {
  if (!g.__x2_insights__) {
    g.__x2_insights__ = { ...MOCK_INSIGHTS };
  }
  return g.__x2_insights__;
}

function getSeriesStore(): Record<string, ChannelSnapshotSeries[]> {
  if (!g.__x2_series__) {
    g.__x2_series__ = { ...MOCK_SNAPSHOT_SERIES };
  }
  return g.__x2_series__;
}

function getContentDistStore(): Record<
  string,
  { type: string; count: number }[]
> {
  if (!g.__x2_content_dist__) {
    g.__x2_content_dist__ = { ...MOCK_CONTENT_TYPE_DIST };
  }
  return g.__x2_content_dist__;
}

// ============================================
// Channel Service (mock-backed, replaceable)
// ============================================

export const channelService = {
  listChannels(filters?: {
    platform?: PlatformCode;
    analysisMode?: AnalysisMode;
    status?: ChannelStatus;
    channelType?: ChannelType;
    search?: string;
  }): Channel[] {
    let result = [...getChannels()];

    if (filters?.platform) {
      result = result.filter((c) => c.platformCode === filters.platform);
    }
    if (filters?.analysisMode) {
      result = result.filter((c) => c.analysisMode === filters.analysisMode);
    }
    if (filters?.status) {
      result = result.filter((c) => c.status === filters.status);
    }
    if (filters?.channelType) {
      result = result.filter((c) => c.channelType === filters.channelType);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.url.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  },

  getChannel(id: string): Channel | undefined {
    return getChannels().find((c) => c.id === id);
  },

  getSnapshot(channelId: string): ChannelSnapshot | undefined {
    return getSnapshots()[channelId];
  },

  getSnapshotSeries(channelId: string): ChannelSnapshotSeries[] {
    return getSeriesStore()[channelId] ?? [];
  },

  getContents(channelId: string): ChannelContent[] {
    return getContentsStore()[channelId] ?? [];
  },

  getContentTypeDist(channelId: string): { type: string; count: number }[] {
    return getContentDistStore()[channelId] ?? [];
  },

  getInsight(channelId: string): ChannelInsight | undefined {
    return getInsights()[channelId];
  },

  // ── 동기화 시 데이터 업데이트 메서드 ──

  updateChannel(id: string, updates: Partial<Channel>): void {
    const channels = getChannels();
    const idx = channels.findIndex((c) => c.id === id);
    if (idx >= 0) {
      Object.assign(channels[idx]!, updates, {
        updatedAt: new Date().toISOString(),
      });
    }
  },

  setSnapshot(channelId: string, snapshot: ChannelSnapshot): void {
    getSnapshots()[channelId] = snapshot;
  },

  setContents(channelId: string, contents: ChannelContent[]): void {
    getContentsStore()[channelId] = contents;
  },

  setContentTypeDist(
    channelId: string,
    dist: { type: string; count: number }[],
  ): void {
    getContentDistStore()[channelId] = dist;
  },

  addSnapshotSeries(channelId: string, point: ChannelSnapshotSeries): void {
    const store = getSeriesStore();
    if (!store[channelId]) store[channelId] = [];
    store[channelId].push(point);
    // 최대 12개월분 유지
    if (store[channelId].length > 12) {
      store[channelId] = store[channelId].slice(-12);
    }
  },

  setInsight(channelId: string, insight: ChannelInsight): void {
    getInsights()[channelId] = insight;
  },

  addChannel(input: ChannelFormInput): Channel {
    const id = `ch-${Date.now()}`;
    const now = new Date().toISOString();

    // URL 정규화 및 플랫폼 감지
    const urlResult = resolveChannelUrl(input.url);
    const resolvedUrl = urlResult.isValid
      ? urlResult.normalizedUrl
      : normalizeUrl(input.url);
    const resolvedPlatform =
      urlResult.detectedPlatformCode ?? input.platformCode;

    const channel: Channel = {
      id,
      platformCode: resolvedPlatform,
      platformLabel:
        input.customPlatformName || getPlatformLabel(resolvedPlatform),
      analysisMode: urlResult.suggestedMode ?? input.analysisMode,
      name: input.name,
      url: resolvedUrl,
      country: input.country,
      category: input.category,
      tags: input.tags,
      channelType: input.channelType,
      isCompetitor: input.isCompetitor,
      status: "active",
      customPlatformName: input.customPlatformName ?? null,
      thumbnailUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    setChannels([channel, ...getChannels()]);
    return channel;
  },

  deleteChannel(id: string): boolean {
    const before = getChannels().length;
    setChannels(getChannels().filter((c) => c.id !== id));
    return getChannels().length < before;
  },

  isDuplicate(url: string): boolean {
    const normalized = normalizeUrl(url).toLowerCase();
    return getChannels().some(
      (c) =>
        c.url.toLowerCase() === url.toLowerCase() ||
        c.url.toLowerCase() === normalized,
    );
  },
};
