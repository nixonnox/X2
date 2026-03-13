import type {
  CompetitorInsight,
  CompetitorSnapshot,
  CompetitorContent,
} from "./types";
import type { FormatDistribution } from "./types";
import { OUR_SNAPSHOT } from "./mock-data";

export function generateCompetitorInsight(
  competitorName: string,
  compSnapshot: CompetitorSnapshot,
  ourContents: CompetitorContent[],
  compContents: CompetitorContent[],
  formatDist: FormatDistribution[],
): CompetitorInsight {
  const our = OUR_SNAPSHOT;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actions: string[] = [];

  // Growth analysis
  let growthAnalysis: string;
  if (compSnapshot.growthRate30d > our.growthRate30d) {
    growthAnalysis = `${competitorName} is growing ${(compSnapshot.growthRate30d - our.growthRate30d).toFixed(1)}pp faster than us over the last 30 days. Their upload frequency of ${compSnapshot.uploads30d} posts/month may be contributing to this momentum.`;
    weaknesses.push("Slower growth rate compared to competitor");
    actions.push("Consider increasing upload frequency to accelerate growth");
  } else {
    growthAnalysis = `We are growing ${(our.growthRate30d - compSnapshot.growthRate30d).toFixed(1)}pp faster than ${competitorName}. Maintaining current content strategy is recommended.`;
    strengths.push("Higher growth rate than competitor");
  }

  // Engagement analysis
  if (compSnapshot.engagementRate > our.engagementRate) {
    weaknesses.push(
      `Lower engagement rate (${our.engagementRate}% vs ${compSnapshot.engagementRate}%)`,
    );
    actions.push(
      "Analyze competitor content hooks and CTAs to improve engagement",
    );
  } else {
    strengths.push(
      `Higher engagement rate (${our.engagementRate}% vs ${compSnapshot.engagementRate}%)`,
    );
  }

  // Content volume
  if (compSnapshot.totalContents > our.totalContents * 1.3) {
    weaknesses.push("Significantly fewer total contents");
    actions.push("Build a larger content library to improve discoverability");
  } else if (our.totalContents > compSnapshot.totalContents * 1.3) {
    strengths.push("Larger content library");
  }

  // Audience
  if (compSnapshot.audienceCount > our.audienceCount) {
    weaknesses.push(
      `Smaller audience (${(our.audienceCount / 1000).toFixed(0)}K vs ${(compSnapshot.audienceCount / 1000).toFixed(0)}K)`,
    );
  } else {
    strengths.push(
      `Larger audience (${(our.audienceCount / 1000).toFixed(0)}K vs ${(compSnapshot.audienceCount / 1000).toFixed(0)}K)`,
    );
  }

  // Content format analysis
  const shortFormDist = formatDist.find((f) => f.format === "short_form");
  let contentStrategyAnalysis: string;
  if (
    shortFormDist &&
    shortFormDist.competitorPercent > shortFormDist.ourPercent + 10
  ) {
    contentStrategyAnalysis = `${competitorName} has a higher proportion of short-form content (${shortFormDist.competitorPercent}% vs ${shortFormDist.ourPercent}%). Short-form content typically drives higher engagement and faster audience growth.`;
    actions.push(
      "Increase short-form content ratio to match competitor strategy",
    );
  } else {
    const topFormat = formatDist.reduce((a, b) =>
      b.competitorPercent > a.competitorPercent ? b : a,
    );
    contentStrategyAnalysis = `${competitorName} primarily focuses on ${topFormat.label} content (${topFormat.competitorPercent}%). Their content strategy differs from ours, providing differentiation opportunities.`;
  }

  // Avg views
  if (compSnapshot.avgViewsPerContent > our.avgViewsPerContent) {
    weaknesses.push("Lower average views per content");
    actions.push(
      "Focus on content quality and SEO to improve per-content performance",
    );
  } else {
    strengths.push("Higher average views per content");
  }

  // Strategy recommendation
  let strategyRecommendation: string;
  if (actions.length === 0) {
    strategyRecommendation =
      "Current strategy is outperforming this competitor across most metrics. Continue monitoring for changes in their strategy.";
  } else if (actions.length <= 2) {
    strategyRecommendation = `Focus on: ${actions.slice(0, 2).join(". ")}. These tactical adjustments can help close the gap.`;
  } else {
    strategyRecommendation = `Key priorities: 1) ${actions[0]} 2) ${actions[1]}. Address these areas to strengthen competitive position.`;
  }

  // Summary
  const advantageCount = strengths.length;
  const disadvantageCount = weaknesses.length;
  const summary =
    advantageCount > disadvantageCount
      ? `We lead ${competitorName} in ${advantageCount} out of ${advantageCount + disadvantageCount} key metrics. Focus on closing gaps in ${weaknesses[0]?.toLowerCase() ?? "specific areas"}.`
      : `${competitorName} leads in ${disadvantageCount} out of ${advantageCount + disadvantageCount} key metrics. Strategic adjustments in content and growth are recommended.`;

  return {
    summary,
    strengths,
    weaknesses,
    recommendedActions: actions,
    growthAnalysis,
    contentStrategyAnalysis,
    strategyRecommendation,
  };
}
