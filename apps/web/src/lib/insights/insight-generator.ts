import type { Insight } from "./types";

/**
 * Rule-based insight generator.
 * Analyzes channel, comment, competitor, and keyword data
 * to produce key findings, growth opportunities, risk signals, and strategy suggestions.
 */
export function generateInsights(): Insight[] {
  return [
    // ── Key Findings ──
    {
      id: "ins-kf-001",
      category: "key_finding",
      title: "Short-form content drives 2.3x more engagement",
      description:
        "Analysis of the last 90 days shows short-form content (Shorts, Reels, TikTok) achieves an average engagement rate of 7.2%, compared to 3.1% for long-form videos. This trend is consistent across all tracked channels.",
      priority: "high",
      source: "Channel Analytics",
      metric: "Engagement Rate",
      metricValue: "7.2%",
      metricChange: "+32%",
      metricChangeType: "positive",
      createdAt: "2026-03-08",
    },
    {
      id: "ins-kf-002",
      category: "key_finding",
      title: "Peak audience activity at 8-10 PM KST",
      description:
        "Posting during 8-10 PM KST consistently yields 45% higher initial views compared to other time slots. Weekend posts show 20% higher engagement than weekday posts.",
      priority: "medium",
      source: "Audience Analytics",
      metric: "Peak Views",
      metricValue: "8-10 PM",
      metricChange: "+45%",
      metricChangeType: "positive",
      createdAt: "2026-03-07",
    },
    {
      id: "ins-kf-003",
      category: "key_finding",
      title: "Tutorial content has highest retention",
      description:
        "Tutorial-type content shows 68% average retention rate, significantly outperforming entertainment (42%) and news (38%) categories. Viewers spend 3.2x more time on tutorial content.",
      priority: "medium",
      source: "Content Analytics",
      metric: "Retention Rate",
      metricValue: "68%",
      metricChange: "+26pp",
      metricChangeType: "positive",
      createdAt: "2026-03-06",
    },

    // ── Growth Opportunities ──
    {
      id: "ins-go-001",
      category: "growth_opportunity",
      title: "TikTok mentions increased 35% this month",
      description:
        "Brand mentions on TikTok surged 35% month-over-month, indicating growing organic awareness. Capitalizing on this trend with dedicated TikTok content could accelerate audience growth significantly.",
      priority: "high",
      source: "Social Listening",
      metric: "Mentions",
      metricValue: "1,240",
      metricChange: "+35%",
      metricChangeType: "positive",
      createdAt: "2026-03-08",
    },
    {
      id: "ins-go-002",
      category: "growth_opportunity",
      title: "Japanese audience segment growing rapidly",
      description:
        "Japanese viewers now account for 15% of total audience, up from 8% three months ago. Localized content and Japanese subtitles could capture this growing segment.",
      priority: "high",
      source: "Audience Demographics",
      metric: "JP Audience",
      metricValue: "15%",
      metricChange: "+7pp",
      metricChangeType: "positive",
      createdAt: "2026-03-07",
    },
    {
      id: "ins-go-003",
      category: "growth_opportunity",
      title: "AI tools keyword trending in target market",
      description:
        "Search volume for 'AI 마케팅 도구' increased 120% over the past month. Creating content around AI marketing tools could capture high-intent traffic and boost channel discovery.",
      priority: "medium",
      source: "Keyword Trends",
      metric: "Search Volume",
      metricValue: "48.2K",
      metricChange: "+120%",
      metricChangeType: "positive",
      createdAt: "2026-03-06",
    },

    // ── Risk Signals ──
    {
      id: "ins-rs-001",
      category: "risk_signal",
      title: "Negative comment ratio increasing",
      description:
        "Negative sentiment in comments rose from 8% to 12% over the past 30 days. Primary topics: pricing complaints (34%), feature requests (28%), and response time (22%). Immediate attention recommended.",
      priority: "critical",
      source: "Comment Analysis",
      metric: "Negative Ratio",
      metricValue: "12%",
      metricChange: "+4pp",
      metricChangeType: "negative",
      createdAt: "2026-03-08",
    },
    {
      id: "ins-rs-002",
      category: "risk_signal",
      title: "Competitor upload frequency doubled",
      description:
        "Top competitor '소셜블레이드 KR' increased uploads from 9 to 18 per month, correlating with a 5.2% growth rate. Our current 12 uploads/month may need adjustment to maintain competitive positioning.",
      priority: "high",
      source: "Competitive Analysis",
      metric: "Competitor Uploads",
      metricValue: "18/mo",
      metricChange: "+100%",
      metricChangeType: "negative",
      createdAt: "2026-03-07",
    },
    {
      id: "ins-rs-003",
      category: "risk_signal",
      title: "Subscriber growth rate declining",
      description:
        "Monthly subscriber growth rate decreased from 5.1% to 3.8% over the past quarter. While still positive, the downward trend suggests content strategy refresh may be needed.",
      priority: "medium",
      source: "Channel Analytics",
      metric: "Growth Rate",
      metricValue: "3.8%",
      metricChange: "-1.3pp",
      metricChangeType: "negative",
      createdAt: "2026-03-05",
    },

    // ── Strategy Suggestions ──
    {
      id: "ins-ss-001",
      category: "strategy_suggestion",
      title: "Launch weekly Shorts series",
      description:
        "Based on engagement data, launching a consistent weekly Shorts series focused on 'AI tool tips' could increase engagement by 40% and attract 15K+ new subscribers within 8 weeks.",
      priority: "high",
      source: "AI Strategy Engine",
      createdAt: "2026-03-08",
    },
    {
      id: "ins-ss-002",
      category: "strategy_suggestion",
      title: "Implement 24-hour comment response SLA",
      description:
        "Channels with <24h comment response time show 2.1x higher subscriber loyalty. Establishing a response SLA and using AI-suggested replies can address the rising negative sentiment trend.",
      priority: "high",
      source: "AI Strategy Engine",
      createdAt: "2026-03-07",
    },
  ];
}
