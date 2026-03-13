// ── Insight ──

export type InsightCategory =
  | "key_finding"
  | "growth_opportunity"
  | "risk_signal"
  | "strategy_suggestion";

export type InsightPriority = "critical" | "high" | "medium" | "low";

export type Insight = {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  priority: InsightPriority;
  source: string;
  metric?: string;
  metricValue?: string;
  metricChange?: string;
  metricChangeType?: "positive" | "negative" | "neutral";
  createdAt: string;
};

// ── Strategy ──

export type StrategyTimeframe = "short_term" | "mid_term" | "long_term";

export type ImpactLevel = "very_high" | "high" | "medium" | "low";
export type EffortLevel = "high" | "medium" | "low";

export type Strategy = {
  id: string;
  timeframe: StrategyTimeframe;
  title: string;
  description: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  actions: string[];
  expectedOutcome: string;
  confidence: number;
};

// ── Action Recommendation ──

export type ActionRecommendation = {
  id: string;
  action: string;
  description: string;
  priority: InsightPriority;
  expectedImpact: string;
  category: string;
  dueLabel: string;
  completed: boolean;
};

// ── Summary ──

export type InsightSummary = {
  totalInsights: number;
  criticalCount: number;
  keyFindings: number;
  growthOpportunities: number;
  riskSignals: number;
  strategySuggestions: number;
  overallScore: number;
  scoreLabel: string;
};

// ── Report ──

export type StrategyReport = {
  id: string;
  title: string;
  generatedAt: string;
  period: string;
  sections: ReportSection[];
};

export type ReportSection = {
  title: string;
  content: string;
};

// ── Config labels ──

export const CATEGORY_LABELS: Record<
  InsightCategory,
  { label: string; color: string; bg: string }
> = {
  key_finding: {
    label: "Key Finding",
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  growth_opportunity: {
    label: "Growth Opportunity",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  risk_signal: { label: "Risk Signal", color: "text-red-700", bg: "bg-red-50" },
  strategy_suggestion: {
    label: "Strategy",
    color: "text-violet-700",
    bg: "bg-violet-50",
  },
};

export const PRIORITY_LABELS: Record<
  InsightPriority,
  { label: string; color: string; bg: string }
> = {
  critical: { label: "Critical", color: "text-red-700", bg: "bg-red-50" },
  high: { label: "High", color: "text-amber-700", bg: "bg-amber-50" },
  medium: { label: "Medium", color: "text-blue-700", bg: "bg-blue-50" },
  low: { label: "Low", color: "text-gray-600", bg: "bg-gray-50" },
};

export const TIMEFRAME_LABELS: Record<
  StrategyTimeframe,
  { label: string; period: string; color: string }
> = {
  short_term: { label: "Short Term", period: "Next 2 weeks", color: "#171717" },
  mid_term: { label: "Mid Term", period: "1-3 months", color: "#6b7280" },
  long_term: { label: "Long Term", period: "6-12 months", color: "#a3a3a3" },
};

export const IMPACT_LABELS: Record<
  ImpactLevel,
  { label: string; color: string }
> = {
  very_high: { label: "Very High", color: "text-emerald-700" },
  high: { label: "High", color: "text-emerald-600" },
  medium: { label: "Medium", color: "text-blue-600" },
  low: { label: "Low", color: "text-gray-500" },
};

export const EFFORT_LABELS: Record<
  EffortLevel,
  { label: string; color: string }
> = {
  high: { label: "High", color: "text-red-600" },
  medium: { label: "Medium", color: "text-amber-600" },
  low: { label: "Low", color: "text-emerald-600" },
};
