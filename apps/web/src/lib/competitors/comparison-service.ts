import type {
  CompetitorChannel,
  CompetitorSnapshot,
  CompetitorSnapshotSeries,
  CompetitorContent,
  ChannelComparisonMetric,
  CompetitorFormInput,
} from "./types";
import {
  COMPETITOR_CHANNELS,
  COMPETITOR_SNAPSHOTS,
  COMPETITOR_SERIES,
  COMPETITOR_CONTENTS,
  OUR_CHANNEL,
  OUR_SNAPSHOT,
  OUR_SERIES,
  OUR_CONTENTS,
} from "./mock-data";
import type { PlatformCode } from "@/lib/channels";

// ── Persistent store (survives HMR) ──
const g = globalThis as unknown as { __x2_competitors__?: CompetitorChannel[] };

function getCompetitors(): CompetitorChannel[] {
  if (!g.__x2_competitors__) {
    g.__x2_competitors__ = [...COMPETITOR_CHANNELS];
  }
  return g.__x2_competitors__;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function pctDiff(our: number, their: number): number {
  if (our === 0) return their > 0 ? 100 : 0;
  return +(((their - our) / our) * 100).toFixed(1);
}

function buildInsight(
  metricKey: string,
  isAdvantage: boolean,
  diff: number,
): string {
  const absDiff = Math.abs(diff);
  const insights: Record<string, [string, string]> = {
    audience: [
      `We lead by ${fmt(absDiff)} subscribers`,
      `Competitor leads by ${fmt(absDiff)} subscribers`,
    ],
    growth: [
      `Our growth rate is ${absDiff.toFixed(1)}pp higher`,
      `Competitor is growing ${absDiff.toFixed(1)}pp faster`,
    ],
    contents: [
      `We have ${fmt(absDiff)} more contents`,
      `Competitor has ${fmt(absDiff)} more contents`,
    ],
    engagement: [
      `Our engagement is ${absDiff.toFixed(1)}pp higher`,
      `Competitor engagement is ${absDiff.toFixed(1)}pp higher`,
    ],
    uploads: [
      `We upload ${Math.round(absDiff)} more per month`,
      `Competitor uploads ${Math.round(absDiff)} more per month`,
    ],
    avgViews: [
      `Our avg. views are ${fmt(absDiff)} higher`,
      `Competitor avg. views are ${fmt(absDiff)} higher`,
    ],
  };
  const pair = insights[metricKey] ?? [
    `Ahead by ${absDiff}`,
    `Behind by ${absDiff}`,
  ];
  return isAdvantage ? pair[0] : pair[1];
}

export const competitorService = {
  // ── Channels ──

  getAll(): CompetitorChannel[] {
    return getCompetitors();
  },

  getById(id: string): CompetitorChannel | undefined {
    return getCompetitors().find((c) => c.id === id);
  },

  getByPlatform(platform: PlatformCode): CompetitorChannel[] {
    return getCompetitors().filter((c) => c.platform === platform);
  },

  addCompetitor(input: CompetitorFormInput): CompetitorChannel {
    const newChannel: CompetitorChannel = {
      id: `comp-${Date.now()}`,
      platform: input.platform,
      channelName: input.channelName,
      url: input.url,
      competitorType: input.competitorType,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    getCompetitors().push(newChannel);
    return newChannel;
  },

  removeCompetitor(id: string) {
    const list = getCompetitors();
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) list.splice(idx, 1);
  },

  isDuplicate(url: string): boolean {
    return getCompetitors().some((c) => c.url === url);
  },

  // ── Our Channel ──

  getOurChannel() {
    return OUR_CHANNEL;
  },

  getOurSnapshot(): CompetitorSnapshot {
    return OUR_SNAPSHOT;
  },

  getOurSeries(): CompetitorSnapshotSeries[] {
    return OUR_SERIES;
  },

  getOurContents(): CompetitorContent[] {
    return OUR_CONTENTS;
  },

  // ── Snapshots ──

  getSnapshot(channelId: string): CompetitorSnapshot | undefined {
    return COMPETITOR_SNAPSHOTS.find((s) => s.channelId === channelId);
  },

  getSeries(channelId: string): CompetitorSnapshotSeries[] {
    return COMPETITOR_SERIES.filter((s) => s.channelId === channelId);
  },

  getContents(channelId: string): CompetitorContent[] {
    return COMPETITOR_CONTENTS.filter((c) => c.channelId === channelId);
  },

  getTopContents(channelId: string, limit = 3): CompetitorContent[] {
    return this.getContents(channelId)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  },

  // ── Comparison ──

  compareMetrics(competitorId: string): ChannelComparisonMetric[] {
    const comp = this.getSnapshot(competitorId);
    if (!comp) return [];

    const our = OUR_SNAPSHOT;

    const metrics: {
      name: string;
      key: string;
      ourVal: number;
      compVal: number;
    }[] = [
      {
        name: "Audience",
        key: "audience",
        ourVal: our.audienceCount,
        compVal: comp.audienceCount,
      },
      {
        name: "Growth Rate",
        key: "growth",
        ourVal: our.growthRate30d,
        compVal: comp.growthRate30d,
      },
      {
        name: "Total Content",
        key: "contents",
        ourVal: our.totalContents,
        compVal: comp.totalContents,
      },
      {
        name: "Engagement Rate",
        key: "engagement",
        ourVal: our.engagementRate,
        compVal: comp.engagementRate,
      },
      {
        name: "Upload Freq.",
        key: "uploads",
        ourVal: our.uploads30d,
        compVal: comp.uploads30d,
      },
      {
        name: "Avg. Views",
        key: "avgViews",
        ourVal: our.avgViewsPerContent,
        compVal: comp.avgViewsPerContent,
      },
    ];

    return metrics.map((m) => {
      const diff = m.ourVal - m.compVal;
      const isAdvantage = diff >= 0;
      return {
        metricName: m.name,
        metricKey: m.key,
        ourValue: m.ourVal,
        competitorValue: m.compVal,
        difference: diff,
        differencePercent: pctDiff(m.compVal, m.ourVal),
        insight: buildInsight(m.key, isAdvantage, diff),
        isOurAdvantage: isAdvantage,
      };
    });
  },

  // ── Growth Comparison Data (for charts) ──

  getGrowthComparisonData(competitorId: string) {
    const ourSeries = OUR_SERIES;
    const compSeries = this.getSeries(competitorId);

    return ourSeries.map((o) => {
      const c = compSeries.find((s) => s.date === o.date);
      return {
        date: o.date,
        ourAudience: o.audienceCount,
        competitorAudience: c?.audienceCount ?? 0,
        ourEngagement: o.engagementRate,
        competitorEngagement: c?.engagementRate ?? 0,
      };
    });
  },

  // ── Upload Frequency Comparison ──

  getUploadComparisonData() {
    const our = OUR_SNAPSHOT;
    return [
      { name: OUR_CHANNEL.channelName, uploads: our.uploads30d, isOurs: true },
      ...getCompetitors().map((ch) => {
        const snap = this.getSnapshot(ch.id);
        return {
          name: ch.channelName,
          uploads: snap?.uploads30d ?? 0,
          isOurs: false,
        };
      }),
    ];
  },

  // ── Platform Distribution ──

  getPlatformDistribution() {
    const dist: Record<string, number> = {};
    dist[OUR_CHANNEL.platform] = (dist[OUR_CHANNEL.platform] ?? 0) + 1;
    for (const ch of getCompetitors()) {
      dist[ch.platform] = (dist[ch.platform] ?? 0) + 1;
    }
    return Object.entries(dist).map(([platform, count]) => ({
      platform,
      count,
    }));
  },
};
